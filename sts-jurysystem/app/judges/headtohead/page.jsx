'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ResultHeadToHead from '@/components/ResultHeadToHead'
import { motion } from 'framer-motion'

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

  const [toasts, setToasts] = useState([])
  const toastId = useRef(1)

  const pushToast = (msg, ttlMs = 4000) => {
    const id = toastId.current++
    setToasts((prev) => [...prev, { id, ...msg }])
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      ttlMs
    )
  }
  const removeToast = (id) =>
    setToasts((prev) => prev.filter((t) => t.id !== id))

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
      pushToast({
        title: 'Data Belum Lengkap',
        text: 'Harap lengkapi semua pilihan sebelum submit.',
        type: 'error',
      })
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
    pushToast({
      title: 'Berhasil!',
      text: `✅ ${selectedHeat} - ${selectedBooyan}: Team A ${formData.teamA} / Team B ${formData.teamB}`,
      type: 'success',
    })
  }

  return (
    <>
      {/* Toasts */}
      <div className='fixed top-6 right-6 z-50 flex flex-col gap-4'>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 200, opacity: 0 }}
            className={`p-4 rounded-xl shadow-lg border backdrop-blur-xl bg-white/70 relative overflow-hidden ${
              toast.type === 'error'
                ? 'border-red-300 text-red-800'
                : toast.type === 'success'
                ? 'border-green-300 text-green-800'
                : 'border-blue-300 text-blue-800'
            }`}
          >
            <div className='flex items-start gap-3'>
              <div className='flex-1'>
                <p className='font-semibold text-sm'>{toast.title}</p>
                <p className='text-sm opacity-90'>{toast.text}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className='p-1 rounded-full hover:bg-black/10'
                aria-label='Close toast'
              >
                ✕
              </button>
            </div>
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: 0 }}
              transition={{ duration: 4, ease: 'linear' }}
              className='absolute bottom-0 left-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500'
            />
          </motion.div>
        ))}
      </div>

    <div className='min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8'>
      <div className='w-full max-w-md sm:max-w-lg md:max-w-xl bg-white p-6 md:p-8 rounded-2xl shadow-lg relative'>
        {/* Back */}
        <div className='text-start my-2'>
          <Link href={`/judges?eventId=${eventId}&userId=${userId}`}>
            <button className='inline-flex items-center gap-1 py-2 text-sm font-medium surface-text-sts hover:underline'>
              <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className='w-4 h-4'>
                <path fillRule='evenodd' d='M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z' clipRule='evenodd' />
              </svg>
              Back to Judge Dashboard
            </button>
          </Link>
        </div>

        {/* Event Detail */}
        {loadingEvent ? (
          <p className='text-gray-500 text-sm mb-4'>Loading event...</p>
        ) : (
          eventDetail && (
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
          )
        )}

        {/* Header */}
        <div className='mb-6 bg-white rounded-2xl shadow-sm p-5 border border-gray-100'>
          <small className='block text-sm text-gray-500 tracking-wide'>
            Race Number:{' '}
            <span className='font-medium text-gray-700'>Head To Head</span>
          </small>
          <div className='text-l font-semibold text-gray-900 mb-3 flex items-center gap-3 flex-wrap'>
            Judge Task :
          </div>
          <h1 className='text-2xl font-semibold text-gray-900 mb-3 flex items-center gap-3 flex-wrap'>
            <span className='px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium'>
              {assignedPosition || '—'}
            </span>
          </h1>
          {!assignedPosition && (
            <div className='mt-2 text-xs text-red-600 font-medium'>
              Posisi belum ter-assign untuk event ini. Hubungi admin
              assignment.
            </div>
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
              className='w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-sts/40 focus:border-sts transition'
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
              className='w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-sts/40 focus:border-sts transition'
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
                className={`min-h-[48px] py-3 text-base rounded-lg font-semibold border ${
                  teamAResult === true
                    ? 'bg-green-500 text-white border-green-600'
                    : 'bg-white border-gray-300 text-gray-700'
                } hover:bg-green-400 transition duration-300`}>
                YES
              </button>
              <button
                type='button'
                onClick={() => setTeamAResult(false)}
                className={`min-h-[48px] py-3 text-base rounded-lg font-semibold border ${
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
                className={`min-h-[48px] py-3 text-base rounded-lg font-semibold border ${
                  teamBResult === true
                    ? 'bg-green-500 text-white border-green-600'
                    : 'bg-white border-gray-300 text-gray-700'
                } hover:bg-green-400 transition duration-300`}>
                YES
              </button>
              <button
                type='button'
                onClick={() => setTeamBResult(false)}
                className={`min-h-[48px] py-3 text-base rounded-lg font-semibold border ${
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
            className='w-full min-h-[48px] py-3 text-base bg-blue-500 text-white rounded-lg font-semibold shadow-md hover:bg-blue-600 transition duration-300'>
            Submit →
          </button>
        </form>

        {/* View Result */}
        <div className='text-center mt-4'>
          <button
            onClick={() => setIsModalOpen(true)}
            className='inline-block py-2 text-sm font-medium surface-text-sts hover:underline'>
            View Result
          </button>
        </div>

        {/* Modal */}
        <ResultHeadToHead
          isOpen={isModalOpen}
          closeModal={() => setIsModalOpen(false)}
          resultData={resultData}
        />
      </div>
    </div>
    </>
  )
}

export default JudgesHeadToHeadPage
