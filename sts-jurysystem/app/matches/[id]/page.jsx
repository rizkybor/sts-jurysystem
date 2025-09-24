'use client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
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
  const [activeTab, setActiveTab] = useState('participants')

  useEffect(() => {
    if (!id) return

    const fetchEvent = async () => {
      setLoading(true)
      setErrMsg(null)
      try {
        const res = await fetch(`/api/matches/${id}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Failed to fetch event (${res.status})`)
        const data = await res.json()

        const normalized = {
          id: data._id,
          name: data.eventName ?? 'Untitled',
          levelName: data.levelName ?? '-',
          startDate: data.startDateEvent
            ? new Date(data.startDateEvent).toLocaleDateString()
            : '-',
          endDate: data.endDateEvent
            ? new Date(data.endDateEvent).toLocaleDateString()
            : '-',
          city: data.addressCity ?? '',
          province: data.addressProvince ?? '',
          image: data.eventBanner || DEFAULT_IMG,
          chiefJudge: data.chiefJudge ?? '-',
          raceDirector: data.raceDirector ?? '-',
          safetyDirector: data.safetyDirector ?? '-',
          eventDirector: data.eventDirector ?? '-',
        }
        setEvent(normalized)

        const allTeams = data.participant?.flatMap(p => p.teams) || []
        setParticipants(allTeams)

        setRaceCategories(data.categoriesRace || [])
        setInitialCategories(data.categoriesInitial || [])
        setDivisionCategories(data.categoriesDivision || [])
        setEventCategories(data.categoriesEvent || [])
      } catch (err) {
        setErrMsg(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [id])

  return (
    <section className='min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-5xl mx-auto space-y-6'>
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

            {/* Officials */}
            <div className='px-6 py-4 grid sm:grid-cols-2 gap-4 text-sm border-t'>
              <p>
                <span className='font-medium'>Chief Judge:</span>{' '}
                {event.chiefJudge}
              </p>
              <p>
                <span className='font-medium'>Race Director:</span>{' '}
                {event.raceDirector}
              </p>
              <p>
                <span className='font-medium'>Safety Director:</span>{' '}
                {event.safetyDirector}
              </p>
              <p>
                <span className='font-medium'>Event Director:</span>{' '}
                {event.eventDirector}
              </p>
            </div>
          </div>
        )}

        {/* TAB NAVIGATION */}
        {!loading && !errMsg && (
          <div className='bg-white p-4 rounded-xl shadow'>
            <div className='flex space-x-4 border-b'>
              <button
                onClick={() => setActiveTab('participants')}
                className={`pb-2 px-1 font-medium ${
                  activeTab === 'participants'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500'
                }`}>
                Participants ({participants.length})
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`pb-2 px-1 font-medium ${
                  activeTab === 'categories'
                    ? 'border-b-2 border-green-500 text-green-600'
                    : 'text-gray-500'
                }`}>
                Categories
              </button>
              <button
                onClick={() => setActiveTab('event-categories')}
                className={`pb-2 px-1 font-medium ${
                  activeTab === 'event-categories'
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-gray-500'
                }`}>
                Event Categories ({eventCategories.length})
              </button>
            </div>
          </div>
        )}

        {/* PARTICIPANTS TAB */}
        {!loading && !errMsg && activeTab === 'participants' && (
          <div className='bg-white p-6 rounded-xl shadow'>
            <h3 className='text-lg font-semibold mb-4'>Participants</h3>
            {participants.length > 0 ? (
              <div className='overflow-x-auto'>
                <table className='min-w-full bg-white border rounded-lg'>
                  <thead className='bg-gray-200'>
                    <tr>
                      <th className='py-2 px-3 text-xs sm:text-sm'>No</th>
                      <th className='py-2 px-3 text-xs sm:text-sm'>Team ID</th>
                      <th className='py-2 px-3 text-xs sm:text-sm'>
                        Team Name
                      </th>
                      <th className='py-2 px-3 text-xs sm:text-sm'>BIB</th>
                      <th className='py-2 px-3 text-xs sm:text-sm'>Category</th>
                      <th className='py-2 px-3 text-xs sm:text-sm'>Division</th>
                      <th className='py-2 px-3 text-xs sm:text-sm'>Class</th>
                      <th className='py-2 px-3 text-xs sm:text-sm'>
                        Event Category
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((team, idx) => (
                      <tr
                        key={team._id || idx}
                        className='text-center odd:bg-gray-50 even:bg-white hover:bg-blue-50'>
                        <td className='py-2 px-3'>{idx + 1}</td>
                        <td className='py-2 px-3 font-mono text-xs text-gray-600'>
                          {team._id || '-'}
                        </td>
                        <td className='py-2 px-3 font-medium'>
                          {team.nameTeam}
                        </td>
                        <td className='py-2 px-3 font-mono'>{team.bibTeam}</td>
                        <td className='py-2 px-3'>
                          <span className='bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded'>
                            {team.initialName || '-'}
                          </span>
                        </td>
                        <td className='py-2 px-3'>
                          <span className='bg-green-100 text-green-800 text-xs px-2 py-1 rounded'>
                            {team.divisionName || '-'}
                          </span>
                        </td>
                        <td className='py-2 px-3'>
                          <span className='bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded'>
                            {team.raceName || '-'}
                          </span>
                        </td>
                        <td className='py-2 px-3'>
                          <span className='bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded'>
                            {team.eventCategory || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className='text-gray-500 text-center py-4'>
                No participants registered yet.
              </p>
            )}
          </div>
        )}

        {/* CATEGORIES TAB */}
        {!loading && !errMsg && activeTab === 'categories' && (
          <div className='space-y-6'>
            {raceCategories.length > 0 && (
              <div className='bg-white p-6 rounded-xl shadow'>
                <h3 className='text-lg font-semibold mb-4 flex items-center'>
                  <span className='bg-purple-100 text-purple-800 p-2 rounded mr-2'>
                    🏃
                  </span>
                  Race Categories ({raceCategories.length})
                </h3>
                <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {raceCategories.map((cat, idx) => (
                    <div
                      key={idx}
                      className='border rounded-lg p-4 bg-purple-50'>
                      <h4 className='font-semibold text-purple-700'>
                        {cat.name}
                      </h4>
                      {cat.description && (
                        <p className='text-sm text-purple-600 mt-1'>
                          {cat.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {initialCategories.length > 0 && (
              <div className='bg-white p-6 rounded-xl shadow'>
                <h3 className='text-lg font-semibold mb-4 flex items-center'>
                  <span className='bg-blue-100 text-blue-800 p-2 rounded mr-2'>
                    🏆
                  </span>
                  Initial Categories ({initialCategories.length})
                </h3>
                <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {initialCategories.map((cat, idx) => (
                    <div key={idx} className='border rounded-lg p-4 bg-blue-50'>
                      <h4 className='font-semibold text-blue-700'>
                        {cat.name}
                      </h4>
                      {cat.description && (
                        <p className='text-sm text-blue-600 mt-1'>
                          {cat.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {divisionCategories.length > 0 && (
              <div className='bg-white p-6 rounded-xl shadow'>
                <h3 className='text-lg font-semibold mb-4 flex items-center'>
                  <span className='bg-green-100 text-green-800 p-2 rounded mr-2'>
                    ⚡
                  </span>
                  Division Categories ({divisionCategories.length})
                </h3>
                <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {divisionCategories.map((cat, idx) => (
                    <div
                      key={idx}
                      className='border rounded-lg p-4 bg-green-50'>
                      <h4 className='font-semibold text-green-700'>
                        {cat.name}
                      </h4>
                      {cat.description && (
                        <p className='text-sm text-green-600 mt-1'>
                          {cat.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {raceCategories.length === 0 &&
              initialCategories.length === 0 &&
              divisionCategories.length === 0 && (
                <div className='bg-white p-6 rounded-xl shadow text-center'>
                  <h3 className='text-lg font-semibold mb-2'>No Categories</h3>
                  <p className='text-gray-500'>
                    No categories defined for this event.
                  </p>
                </div>
              )}
          </div>
        )}

        {/* EVENT CATEGORIES TAB */}
        {!loading && !errMsg && activeTab === 'event-categories' && (
          <div className='space-y-6'>
            {eventCategories.length > 0 ? (
              <div className='bg-white p-6 rounded-xl shadow'>
                <h3 className='text-lg font-semibold mb-4 flex items-center'>
                  <span className='bg-orange-100 text-orange-800 p-2 rounded mr-2'>
                    🏷️
                  </span>
                  Event Categories ({eventCategories.length})
                </h3>
                <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {eventCategories.map((category, idx) => (
                    <div
                      key={idx}
                      className='border rounded-lg p-4 bg-orange-50 hover:bg-orange-100 transition-colors'>
                      <h4 className='font-semibold text-orange-700 mb-2'>
                        {category.name}
                      </h4>
                      {category.description && (
                        <p className='text-sm text-orange-600 mb-3'>
                          {category.description}
                        </p>
                      )}
                      <div className='text-xs text-gray-500 space-y-1'>
                        {category.type && (
                          <p>
                            <span className='font-medium'>Type:</span>{' '}
                            {category.type}
                          </p>
                        )}
                        {category.level && (
                          <p>
                            <span className='font-medium'>Level:</span>{' '}
                            {category.level}
                          </p>
                        )}
                        {category.participantsCount && (
                          <p>
                            <span className='font-medium'>Participants:</span>{' '}
                            {category.participantsCount}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className='bg-white p-6 rounded-xl shadow text-center'>
                <h3 className='text-lg font-semibold mb-2'>
                  No Event Categories
                </h3>
                <p className='text-gray-500'>
                  No event categories defined for this event.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
