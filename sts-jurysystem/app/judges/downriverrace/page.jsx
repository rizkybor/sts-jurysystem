'use client'
import Link from 'next/link'
import getSocket from '@/utils/socket'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect, useMemo, useRef } from 'react'
import ResultDRR from '@/components/ResultDRR'
import { motion } from 'framer-motion'

const JudgesDRRPages = () => {
  const searchParams = useSearchParams()
  const eventId = searchParams.get('eventId')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [user, setUser] = useState(null)
  const [eventDetail, setEventDetail] = useState(null)
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [teams, setTeams] = useState([])
  const [loadingTeams, setLoadingTeams] = useState(true)

  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedPenalty, setSelectedPenalty] = useState(null)

  const [drrResults, setDrrResults] = useState([])
  const [assignments, setAssignments] = useState([])
  const [events, setEvents] = useState([])
  const [error, setError] = useState(null)
  const [toasts, setToasts] = useState([])
  const toastId = useRef(1)
  const socketRef = useRef(null)

  const penalties = [0, -10, 10, 50]

  function getDRRPositionsFromAssignments(list, evId) {
    if (!Array.isArray(list) || !evId) return []
    const allJudges = list.flatMap(item => item.judges || [])
    const match = allJudges.find(j => String(j.eventId) === String(evId))
    if (!match?.drr) return []
    const positions = []
    if (Array.isArray(match.drr.sections))
      positions.push(...match.drr.sections.map(s => `Section ${s}`))
    if (match.drr.start) positions.push('Start')
    if (match.drr.finish) positions.push('Finish')
    return positions
  }

  const assignedPosition = useMemo(() => {
    return getDRRPositionsFromAssignments(assignments, eventId).join(', ')
  }, [assignments, eventId])

  const pushToast = (msg, ttlMs = 4000) => {
    const id = toastId.current++
    setToasts(prev => [...prev, { id, ...msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ttlMs)
  }
  const removeToast = id => setToasts(prev => prev.filter(t => t.id !== id))

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null)
        setLoading(true)
        const judgesRes = await fetch('/api/judges', { cache: 'no-store' })
        const judgesData = await judgesRes.json()
        if (judgesData.user) setUser(judgesData.user)
        setEvents(judgesData.events || [])
        const userEmail = judgesData.user?.email
        if (!userEmail) throw new Error('Email tidak ditemukan')
        const assignmentsRes = await fetch(
          `/api/assignments?email=${encodeURIComponent(userEmail)}`,
          { cache: 'no-store' }
        )
        const assignmentsData = await assignmentsRes.json()
        setAssignments(assignmentsData.data || [])
      } catch (err) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (!eventId || !selectedCategory) return
    const fetchTeams = async () => {
      try {
        const [initialId, divisionId, raceId] = selectedCategory.split('|')
        const catEvent = 'DRR'
        const res = await fetch(
          `/api/events/${eventId}/judge-tasks?initialId=${initialId}&divisionId=${divisionId}&raceId=${raceId}&eventName=${catEvent}`
        )
        const data = await res.json()
        setTeams(res.ok && data?.success ? data.teams || [] : [])
      } catch (err) {
        console.error(err)
        setTeams([])
      } finally {
        setLoadingTeams(false)
      }
    }
    setLoadingTeams(true)
    fetchTeams()
  }, [eventId, selectedCategory])

  useEffect(() => {
    if (!eventId) return
    const fetchEventDetail = async () => {
      setLoadingEvent(true)
      try {
        const res = await fetch(`/api/matches/${eventId}`)
        const data = await res.json()
        setEventDetail(data.event || data)
      } catch {
        setEventDetail(null)
      } finally {
        setLoadingEvent(false)
      }
    }
    fetchEventDetail()
  }, [eventId])

  useEffect(() => {
    if (!isModalOpen) return
    const fetchDRRResults = async () => {
      try {
        const res = await fetch('/api/judges/drr')
        const data = await res.json()
        if (res.ok) setDrrResults(data.data || [])
      } catch {}
    }
    fetchDRRResults()
  }, [isModalOpen])

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket
    const handler = msg => {
      if (msg?.senderId && msg.senderId === socketRef.current?.id) return
      pushToast({
        title: msg.from ? `Pesan dari ${msg.from}` : 'Notifikasi',
        text: msg.text || 'Pesan baru diterima',
        type: 'info',
      })
    }
    socket.on('custom:event', handler)
    return () => socket.off('custom:event', handler)
  }, [])

  const sendRealtimeMessage = () => {
    const socket = socketRef.current || getSocket()
    if (!socket) return
    socket.emit(
      'custom:event',
      {
        senderId: socket.id,
        from: 'Judges DRR Dashboard',
        text: 'Pesan realtime ke operator timing',
        ts: new Date().toISOString(),
      },
      ok => {
        if (ok)
          pushToast({
            title: 'Berhasil',
            text: 'Pesan terkirim ke operator timing',
            type: 'success',
          })
      }
    )
  }

  const combinedCategories = useMemo(() => {
    const list = []
    const initials = eventDetail?.categoriesInitial || []
    const divisions = eventDetail?.categoriesDivision || []
    const races = eventDetail?.categoriesRace || []
    initials.forEach(initial => {
      divisions.forEach(division => {
        races.forEach(race => {
          list.push({
            label: `${initial.name} - ${division.name} - ${race.name}`,
            value: `${initial.value}|${division.value}|${race.value}`,
          })
        })
      })
    })
    return list
  }, [eventDetail])

  const handleCategoryChange = value => {
    setSelectedCategory(value)
    setSelectedTeam('')
    setTeams([])
    setLoadingTeams(true)
  }

  const filteredTeams = useMemo(() => {
    if (!selectedCategory) return []
    const [initialId, divisionId, raceId] = selectedCategory.split('|')
    return teams.filter(
      team =>
        String(team.initialId) === String(initialId) &&
        String(team.divisionId) === String(divisionId) &&
        String(team.raceId) === String(raceId)
    )
  }, [selectedCategory, teams])

  const handleSubmit = e => {
    e.preventDefault()
    if (!selectedTeam || selectedPenalty === null || !selectedCategory) {
      alert('⚠️ Please select all fields before submitting.')
      return
    }
    const [initialId, divisionId, raceId] = selectedCategory.split('|')
    const formData = {
      teamId: selectedTeam,
      penalty: selectedPenalty,
      initialId,
      divisionId,
      raceId,
      assignedPosition,
      updateBy: user?.username || 'Unknown Judge',
    }
    console.log('DRR Submit:', formData)
  }

  return (
    <>
      <div className='fixed top-6 right-6 z-50 flex flex-col gap-4'>
        {toasts.map(toast => (
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
            }`}>
            <div className='flex items-start gap-3'>
              <div className='flex-1'>
                <p className='font-semibold text-sm'>{toast.title}</p>
                <p className='text-sm opacity-90'>{toast.text}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className='p-1 rounded-full hover:bg-black/10'>
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className='min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8'>
        <div className='w-full max-w-md bg-white p-6 rounded-2xl shadow-lg relative'>
          {eventDetail && (
            <div className='mb-4 space-y-1 bg-gray-100 p-4 rounded-lg'>
              <div className='font-semibold'>{eventDetail.eventName}</div>
              <div className='text-sm text-gray-600'>
                {new Date(eventDetail.startDateEvent).toLocaleDateString()} –{' '}
                {new Date(eventDetail.endDateEvent).toLocaleDateString()}
              </div>
              <div className='text-sm text-gray-600'>
                {eventDetail.addressProvince}, {eventDetail.addressState}
              </div>
            </div>
          )}

          <h1 className='text-2xl font-bold text-center text-gray-800 mb-6'>
            Judges {assignedPosition || 'DRR'}
          </h1>

          <button
            onClick={sendRealtimeMessage}
            className='w-full py-2 bg-blue-600 text-white rounded-lg mb-4'>
            Kirim Pesan ke Operator
          </button>

          <form onSubmit={handleSubmit} className='space-y-6'>
            <div>
              {loadingEvent ? (
                <p>Loading categories...</p>
              ) : combinedCategories.length ? (
                <select
                  value={selectedCategory}
                  onChange={e => handleCategoryChange(e.target.value)}
                  className='w-full px-4 py-2 border rounded-lg'>
                  <option value=''>Select Category</option>
                  {combinedCategories.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p>No categories available.</p>
              )}
            </div>

            <div>
              <label>Team:</label>
              <select
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
                className='w-full px-4 py-2 border rounded-lg'
                disabled={
                  !selectedCategory || loadingTeams || !filteredTeams.length
                }>
                <option value=''>
                  {selectedCategory
                    ? loadingTeams
                      ? 'Loading teams...'
                      : 'Select Team'
                    : 'Select category first'}
                </option>
                {filteredTeams.map(team => (
                  <option key={team._id} value={team._id}>
                    {team.nameTeam} (BIB {team.bibTeam})
                  </option>
                ))}
              </select>
            </div>

            <div className='space-y-2'>
              {penalties.map(pen => (
                <button
                  key={pen}
                  type='button'
                  onClick={() => setSelectedPenalty(pen)}
                  className={`w-full py-3 rounded-lg border ${
                    selectedPenalty === pen
                      ? 'bg-blue-100 border-blue-500 font-semibold'
                      : 'bg-white border-gray-300'
                  }`}>
                  Penalty: {pen}
                </button>
              ))}
            </div>

            <button
              type='submit'
              className='w-full py-3 bg-blue-500 text-white rounded-lg font-semibold'>
              Submit →
            </button>
          </form>

          <div className='text-center mt-4'>
            <button
              onClick={() => setIsModalOpen(true)}
              className='text-blue-500 hover:underline'>
              View Result
            </button>
          </div>

          <div className='text-center mt-4'>
            <Link href='/judges'>
              <button className='text-blue-500 hover:underline'>
                ← Back to Judges
              </button>
            </Link>
          </div>
        </div>

        <ResultDRR
          isOpen={isModalOpen}
          closeModal={() => setIsModalOpen(false)}
          resultData={{ team: selectedTeam, penalty: selectedPenalty }}
        />
      </div>
    </>
  )
}

export default JudgesDRRPages
