'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ResultHeadToHead from '@/components/ResultHeadToHead'

/** 🔹 Helper: ambil posisi HeadToHead dari assignments */
const getHeadToHeadPositionFromAssignments = (list, evId) => {
  if (!Array.isArray(list) || !evId) return ''
  const match = list
    .flatMap(item => item.judges || [])
    .find(j => String(j.eventId) === String(evId))

  if (!match?.h2h) return ''

  if (match.h2h.start) return 'Start'
  if (match.h2h.finish) return 'Finish'
  if (match.h2h.R1) return 'R1'
  if (match.h2h.R2) return 'R2'
  if (match.h2h.L1) return 'L1'
  if (match.h2h.L2) return 'L2'
  return ''
}

/** 🔹 Helper: ambil opsi Booyan dari assignments */
const getBooyanOptionsFromAssignments = (assignments, eventId) => {
  if (!Array.isArray(assignments) || !eventId) return []
  const match = assignments
    .flatMap(item => item.judges || [])
    .find(j => String(j.eventId) === String(eventId))

  if (!match?.h2h) return []

  return Object.entries(match.h2h)
    .filter(([key, value]) => value === true)
    .map(([key]) => key)
}

const JudgesHeadToHeadPage = () => {
  const searchParams = useSearchParams()
  const eventId = searchParams.get('eventId')
  const userId = searchParams.get('userId')

  const [user, setUser] = useState(null)
  const [assignments, setAssignments] = useState([])

  const [selectedHeat, setSelectedHeat] = useState('')
  const [selectedBooyan, setSelectedBooyan] = useState('')
  const [teamAResult, setTeamAResult] = useState(null)
  const [teamBResult, setTeamBResult] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [resultData, setResultData] = useState({})

  const [eventDetail, setEventDetail] = useState(null)
  const [loadingEvent, setLoadingEvent] = useState(true)

  // 🔹 derive posisi otomatis dari assignments
  const assignedPosition = useMemo(() => {
    return getHeadToHeadPositionFromAssignments(assignments, eventId)
  }, [assignments, eventId])

  // 🔹 derive booyan options dari assignments
  const booyanOptions = useMemo(() => {
    return getBooyanOptionsFromAssignments(assignments, eventId)
  }, [assignments, eventId])

  const heatOptions = ['Heat 1', 'Heat 2', 'Final']

  // 🔹 Fetch event detail
  useEffect(() => {
    if (!eventId) return
    const fetchEventDetail = async () => {
      setLoadingEvent(true)
      try {
        const res = await fetch(`/api/matches/${eventId}`, {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Failed to fetch event detail')
        const data = await res.json()
        const evt = data.event || data
        setEventDetail(evt || null)
      } catch (err) {
        console.error('❌ Event detail error:', err)
        setEventDetail(null)
      } finally {
        setLoadingEvent(false)
      }
    }
    fetchEventDetail()
  }, [eventId])

  // 🔹 Fetch assignments
  useEffect(() => {
    if (!eventId) return
    const fetchData = async () => {
      try {
        const judgesRes = await fetch('/api/judges', { cache: 'no-store' })
        if (!judgesRes.ok) return
        const judgesData = await judgesRes.json()
        setUser(judgesData.user || null)

        const userEmail = judgesData.user?.email
        if (!userEmail) return

        const assignmentsRes = await fetch(
          `/api/assignments?email=${encodeURIComponent(userEmail)}`,
          { cache: 'no-store' }
        )
        if (!assignmentsRes.ok) return
        const assignmentsData = await assignmentsRes.json()
        const list = Array.isArray(assignmentsData?.data)
          ? assignmentsData.data
          : Array.isArray(assignmentsData)
          ? assignmentsData
          : []
        setAssignments(list)
      } catch (err) {
        console.error(err)
      }
    }
    fetchData()
  }, [eventId])

  const handleSubmit = e => {
    e.preventDefault()
    if (
      !selectedHeat ||
      !selectedBooyan ||
      teamAResult === null ||
      teamBResult === null
    ) {
      alert('⚠️ Please complete all selections before submitting.')
      return
    }

    const formData = {
      heat: selectedHeat,
      booyan: selectedBooyan,
      teamA: teamAResult ? 'Y' : 'N',
      teamB: teamBResult ? 'Y' : 'N',
      assignedPosition,
    }

    setResultData(formData)
    alert('📊 Submitted Data:\n\n' + JSON.stringify(formData, null, 2))
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8'>
      <div className='w-full max-w-md bg-white p-6 rounded-2xl shadow-lg relative'>
        {/* Event Detail */}
        {eventDetail && (
          <div className='mb-4 space-y-1 bg-gray-100 p-4 rounded-lg'>
            <div className='font-semibold'>{eventDetail.eventName}</div>
            <div className='text-sm text-gray-600'>
              {new Date(eventDetail.startDateEvent).toLocaleDateString(
                'id-ID',
                { day: '2-digit', month: 'long', year: 'numeric' }
              )}
              {' – '}
              {new Date(eventDetail.endDateEvent).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </div>
            <div className='text-sm text-gray-600'>
              {eventDetail.addressProvince}, {eventDetail.addressState}
            </div>
          </div>
        )}

        {/* Header */}
        <div className='text-center mb-5'>
          <h1 className='text-2xl font-bold text-gray-800'>
            Judges{assignedPosition ? ` ${assignedPosition}` : ''}
          </h1>
          {eventDetail && (
            <small className='text-gray-600'>Race Number : H2H Race</small>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* Heat */}
          <div>
            <label className='block text-gray-700 mb-2'>Heat:</label>
            <select
              value={selectedHeat}
              onChange={e => setSelectedHeat(e.target.value)}
              className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400'
              required>
              <option value='' disabled>
                Select Heat
              </option>
              {heatOptions.map((heat, index) => (
                <option key={index} value={heat}>
                  {heat}
                </option>
              ))}
            </select>
          </div>

          {/* Booyan */}
          <div>
            <label className='block text-gray-700 mb-2'>Booyan:</label>
            <select
              value={selectedBooyan}
              onChange={e => setSelectedBooyan(e.target.value)}
              className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400'
              required>
              <option value='' disabled>
                Select Booyan
              </option>
              {booyanOptions.map((booyan, index) => (
                <option key={index} value={booyan}>
                  {booyan}
                </option>
              ))}
            </select>
          </div>

          {/* Team A */}
          <div>
            <h3 className='text-lg font-semibold text-gray-800 mb-2'>Team A</h3>
            <div className='grid grid-cols-2 gap-4'>
              <button
                type='button'
                onClick={() => setTeamAResult(true)}
                className={`py-3 rounded-lg font-semibold border ${
                  teamAResult === true
                    ? 'bg-green-500 text-white border-green-600'
                    : 'bg-white border-gray-300 text-gray-700'
                } hover:bg-green-400 transition duration-300`}>
                YES
              </button>
              <button
                type='button'
                onClick={() => setTeamAResult(false)}
                className={`py-3 rounded-lg font-semibold border ${
                  teamAResult === false
                    ? 'bg-red-500 text-white border-red-600'
                    : 'bg-white border-gray-300 text-gray-700'
                } hover:bg-red-400 transition duration-300`}>
                NO
              </button>
            </div>
          </div>

          {/* Team B */}
          <div>
            <h3 className='text-lg font-semibold text-gray-800 mb-2'>Team B</h3>
            <div className='grid grid-cols-2 gap-4'>
              <button
                type='button'
                onClick={() => setTeamBResult(true)}
                className={`py-3 rounded-lg font-semibold border ${
                  teamBResult === true
                    ? 'bg-green-500 text-white border-green-600'
                    : 'bg-white border-gray-300 text-gray-700'
                } hover:bg-green-400 transition duration-300`}>
                YES
              </button>
              <button
                type='button'
                onClick={() => setTeamBResult(false)}
                className={`py-3 rounded-lg font-semibold border ${
                  teamBResult === false
                    ? 'bg-red-500 text-white border-red-600'
                    : 'bg-white border-gray-300 text-gray-700'
                } hover:bg-red-400 transition duration-300`}>
                NO
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type='submit'
            className='w-full py-3 bg-blue-500 text-white rounded-lg font-semibold shadow-md hover:bg-blue-600 transition duration-300'>
            Submit →
          </button>
        </form>

        {/* View Result */}
        <div className='text-center mt-4'>
          <button
            onClick={() => setIsModalOpen(true)}
            className='text-blue-500 hover:underline'>
            View Result
          </button>
        </div>

        {/* Back */}
        <div className='text-center mt-4'>
          <Link href={`/judges?eventId=${eventId}&userId=${userId}`}>
            <button className='text-blue-500 hover:underline'>← Back</button>
          </Link>
        </div>

        {/* Modal */}
        <ResultHeadToHead
          isOpen={isModalOpen}
          closeModal={() => setIsModalOpen(false)}
          resultData={resultData}
        />
      </div>
    </div>
  )
}

export default JudgesHeadToHeadPage
