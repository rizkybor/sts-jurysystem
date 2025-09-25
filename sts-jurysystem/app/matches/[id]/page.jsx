'use client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'

const DEFAULT_IMG = '/images/logo-dummy.png'

export default function EventDetailPage() {
  const { id } = useParams()

  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [raceCategories, setRaceCategories] = useState([])
  const [initialCategories, setInitialCategories] = useState([])
  const [divisionCategories, setDivisionCategories] = useState([])
  const [eventCategories, setEventCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState(null)

  const [selectedEventCat, setSelectedEventCat] = useState('')
  const [selectedRace, setSelectedRace] = useState('')
  const [selectedInitial, setSelectedInitial] = useState('')
  const [selectedDivision, setSelectedDivision] = useState('')

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      setLoading(true)
      setErrMsg(null)

      try {
        console.log('🔍 Fetching event details for ID:', id)

        // Ambil event detail
        const eventRes = await fetch(`/api/events/${id}`, { cache: 'no-store' })
        if (!eventRes.ok)
          throw new Error(`Failed to fetch event (${eventRes.status})`)
        const eventJson = await eventRes.json()
        const eventData = eventJson.event
        if (!eventData) throw new Error('Event data is empty')

        const normalizedEvent = {
          id: eventData.id,
          name: eventData.eventName ?? 'Untitled',
          levelName: eventData.levelName ?? '-',
          startDate: eventData.startDateEvent
            ? new Date(eventData.startDateEvent).toLocaleDateString()
            : '-',
          endDate: eventData.endDateEvent
            ? new Date(eventData.endDateEvent).toLocaleDateString()
            : '-',
          city: eventData.addressCity ?? '',
          province: eventData.addressProvince ?? '',
          image: eventData.eventBanner || DEFAULT_IMG,
          chiefJudge: eventData.chiefJudge ?? '-',
          raceDirector: eventData.raceDirector ?? '-',
          safetyDirector: eventData.safetyDirector ?? '-',
          eventDirector: eventData.eventDirector ?? '-',
        }
        setEvent(normalizedEvent)

        setRaceCategories(
          (eventData.categoriesRace || []).map(cat => ({
            value: String(cat.value ?? cat._id),
            name: cat.name,
          }))
        )
        setInitialCategories(
          (eventData.categoriesInitial || []).map(cat => ({
            value: String(cat.value ?? cat._id),
            name: cat.name,
          }))
        )
        setDivisionCategories(
          (eventData.categoriesDivision || []).map(cat => ({
            value: String(cat.value ?? cat._id),
            name: cat.name,
          }))
        )

        // Ambil tim peserta + kategori event
        const teamsRes = await fetch(`/api/events/${id}/teams`, {
          cache: 'no-store',
        })
        if (!teamsRes.ok)
          throw new Error(`Failed to fetch teams (${teamsRes.status})`)
        const teamsJson = await teamsRes.json()

        setParticipants(teamsJson.teams || [])
        setEventCategories(
          (teamsJson.eventCategories || []).map(cat => ({
            value: cat._id,
            name: cat.name,
          }))
        )
      } catch (err) {
        console.error(err)
        setErrMsg(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const filteredTeams = useMemo(() => {
    return participants.filter(team => {
      let ok = true
      if (
        selectedEventCat &&
        String(team.eventCatId) !== String(selectedEventCat)
      )
        ok = false
      if (selectedRace && String(team.raceId) !== String(selectedRace))
        ok = false
      if (selectedInitial && String(team.initialId) !== String(selectedInitial))
        ok = false
      if (
        selectedDivision &&
        String(team.divisionId) !== String(selectedDivision)
      )
        ok = false
      return ok
    })
  }, [
    participants,
    selectedEventCat,
    selectedRace,
    selectedInitial,
    selectedDivision,
  ])

  return (
    <section className='min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-6xl mx-auto space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl sm:text-3xl font-bold'>📊 Event Detail</h1>
          <Link
            href='/matches'
            className='text-sm px-3 py-2 rounded-md bg-gray-200 hover:bg-gray-300'>
            ← Back
          </Link>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className='bg-white shadow rounded-lg p-6 text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto'></div>
            <p className='mt-2'>Loading event details...</p>
          </div>
        )}
        {errMsg && (
          <div className='bg-red-50 border border-red-200 text-red-700 shadow rounded-lg p-4'>
            {errMsg}
          </div>
        )}

        {/* Event Info */}
        {!loading && !errMsg && event && (
          <div className='bg-white shadow-lg rounded-xl overflow-hidden'>
            <div className='flex flex-col sm:flex-row'>
              <img
                src={event.image}
                alt={event.name}
                className='w-full sm:w-64 h-48 object-contain bg-gray-50'
              />
              <div className='p-6 flex-1'>
                <h2 className='text-2xl font-bold mb-2'>{event.name}</h2>
                <p className='text-gray-600 mb-1'>
                  Level: <span className='font-medium'>{event.levelName}</span>
                </p>
                <p className='text-gray-600 mb-1'>
                  Location:{' '}
                  <span className='font-medium'>
                    {event.city}
                    {event.city && event.province ? ', ' : ''}
                    {event.province}
                  </span>
                </p>
                <p className='text-gray-600 mb-1'>
                  Dates:{' '}
                  <span className='font-medium'>
                    {event.startDate} — {event.endDate}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        {!loading && !errMsg && (
          <div className='bg-white p-6 rounded-xl shadow space-y-4'>
            <h3 className='text-lg font-semibold'>Filter Participants</h3>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
              <select
                value={selectedEventCat}
                onChange={e => setSelectedEventCat(e.target.value)}
                className='border rounded px-3 py-2 text-sm w-full'>
                <option value=''>All Event Categories</option>
                {eventCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedRace}
                onChange={e => setSelectedRace(e.target.value)}
                className='border rounded px-3 py-2 text-sm w-full'>
                <option value=''>All Race Categories</option>
                {raceCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedInitial}
                onChange={e => setSelectedInitial(e.target.value)}
                className='border rounded px-3 py-2 text-sm w-full'>
                <option value=''>All Initial Categories</option>
                {initialCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedDivision}
                onChange={e => setSelectedDivision(e.target.value)}
                className='border rounded px-3 py-2 text-sm w-full'>
                <option value=''>All Division Categories</option>
                {divisionCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Participants Table */}
        {!loading && !errMsg && (
          <div className='bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200'>
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-gray-200 text-sm'>
                <thead className='bg-blue-50'>
                  <tr>
                    <th className='px-6 py-3 text-left font-semibold text-gray-700'>
                      No
                    </th>
                    <th className='px-6 py-3 text-left font-semibold text-gray-700'>
                      Team
                    </th>
                    <th className='px-6 py-3 text-left font-semibold text-gray-700'>
                      BIB
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-100'>
                  {filteredTeams.length > 0 ? (
                    filteredTeams.map((team, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-blue-100 transition-colors duration-200 ${
                          idx % 2 === 0 ? 'bg-gray-50' : ''
                        }`}>
                        <td className='px-6 py-4 text-gray-700 font-medium'>
                          {idx + 1}
                        </td>
                        <td className='px-6 py-4 font-medium text-gray-800'>
                          {team.nameTeam}
                        </td>
                        <td className='px-6 py-4 text-gray-600'>
                          {team.bibTeam}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan='3'
                        className='px-6 py-6 text-center text-gray-500'>
                        No participants match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
