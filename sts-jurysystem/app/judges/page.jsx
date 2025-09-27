'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import NavigationButton from '@/components/NavigationButton'
import getSocket from '@/utils/socket'

const JudgesPage = () => {
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toasts, setToasts] = useState([])
  const toastId = useRef(1)
  const socketRef = useRef(null)

  // Toast handler
  const pushToast = (msg, ttlMs = 4000) => {
    const id = toastId.current++
    setToasts(prev => [...prev, { id, ...msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ttlMs)
  }
  const removeToast = id => setToasts(prev => prev.filter(t => t.id !== id))

  // Socket connect
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
        from: 'Judges Dashboard',
        text: 'Pesan realtime ke operator timing',
        ts: new Date().toISOString(),
      },
      ok => {
        if (ok) {
          pushToast({
            title: 'Berhasil',
            text: 'Pesan terkirim ke operator timing',
            type: 'success',
          })
        }
      }
    )
  }

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null)
        const judgesRes = await fetch('/api/judges', { cache: 'no-store' })
        if (!judgesRes.ok)
          throw new Error(`Gagal memuat data judges: ${judgesRes.status}`)
        const judgesData = await judgesRes.json()
        setUser(judgesData.user)
        setEvents(judgesData.events || [])

        const userEmail = judgesData.user?.email
        if (!userEmail) throw new Error('Email tidak ditemukan')

        const assignmentsRes = await fetch(
          `/api/assignments?email=${encodeURIComponent(userEmail)}`,
          { cache: 'no-store' }
        )
        if (!assignmentsRes.ok)
          throw new Error(`Gagal memuat assignments: ${assignmentsRes.status}`)
        const assignmentsData = await assignmentsRes.json()
        setAssignments(assignmentsData.data || [])
      } catch (error) {
        console.error(error)
        setError(error.message)
        pushToast({
          title: 'Error',
          text: error.message,
          type: 'error',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const getJudgeAssignment = eventId => {
    if (!assignments?.length) return null
    for (const assign of assignments) {
      if (assign.judges?.length) {
        const judgeAssignment = assign.judges.find(j => j.eventId === eventId)
        if (judgeAssignment) return judgeAssignment
      }
    }
    return null
  }

  const hasAnyActiveRole = assignment =>
    assignment &&
    ((assignment.sprint &&
      (assignment.sprint.start || assignment.sprint.finish)) ||
      (assignment.h2h &&
        Object.values(assignment.h2h).some(val => val === true)) ||
      (assignment.slalom &&
        (assignment.slalom.start || assignment.slalom.finish)) ||
      (assignment.drr && (assignment.drr.start || assignment.drr.finish)))

  const judgeButtonsConfig = useMemo(
    () => [
      {
        key: 'sprint',
        href: '/judges/sprint',
        label: 'Sprint',
        icon: '🏎️',
        color: 'from-blue-500 to-blue-600',
        checkActive: a => a?.sprint && (a.sprint.start || a.sprint.finish),
      },
      {
        key: 'h2h',
        href: '/judges/headtohead',
        label: 'Head to Head',
        icon: '⚔️',
        color: 'from-green-500 to-green-600',
        checkActive: a => a?.h2h && Object.values(a.h2h).some(v => v === true),
      },
      {
        key: 'slalom',
        href: '/judges/slalom',
        label: 'Slalom',
        icon: '🌀',
        color: 'from-purple-500 to-purple-600',
        checkActive: a => a?.slalom && (a.slalom.start || a.slalom.finish),
      },
      {
        key: 'drr',
        href: '/judges/downriverrace',
        label: 'Down River',
        icon: '🌊',
        color: 'from-red-500 to-red-600',
        checkActive: a => a?.drr && (a.drr.start || a.drr.finish),
      },
    ],
    []
  )

  // Loading
  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100'>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className='w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full'
        />
      </div>
    )
  }

  // Error
  if (error && !user) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 px-6'>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className='text-7xl mb-4'>
          😕
        </motion.div>
        <h2 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2'>
          Terjadi Kesalahan
        </h2>
        <p className='text-gray-600 mb-6'>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className='px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow hover:shadow-xl hover:scale-105 transition-all'>
          Coba Lagi
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Toasts */}
      <div className='fixed top-6 right-6 z-50 flex flex-col gap-4'>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 200, opacity: 0 }}
            className={`p-4 rounded-xl shadow-lg border backdrop-blur-xl bg-white/70 relative overflow-hidden
              ${
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
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: 0 }}
              transition={{ duration: 4, ease: 'linear' }}
              className='absolute bottom-0 left-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500'
            />
          </motion.div>
        ))}
      </div>

      {/* Main */}
      <div className='min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50'>
        <div className='max-w-4xl px-4 sm:px-6 lg:px-8 py-10 mx-auto'>
          {/* Profile */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className='bg-white/70 rounded-2xl shadow-xl p-6 border border-gray-100'>
            <div className='flex flex-col md:flex-row items-center md:items-start gap-6'>
              {/* Foto profil */}
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.username}
                  className='w-28 h-28 sm:w-32 sm:h-32 rounded-xl border-4 border-indigo-100 shadow-md object-cover'
                />
              ) : (
                <div
                  className='w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-600 
                   flex items-center justify-center 
                   text-white text-3xl font-bold shadow-md'>
                  {user?.username?.charAt(0) || 'U'}
                </div>
              )}

              {/* Info user */}
              <div className='flex-1 text-center md:text-left'>
                <h2 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800'>
                  {user?.username}
                </h2>
                <p className='text-sm sm:text-base text-gray-600'>
                  {user?.email}
                </p>

                <div className='flex justify-center md:justify-start gap-2 mt-3 flex-wrap'>
                  <span className='px-3 py-1 bg-gray-200 text-blue-600 text-xs sm:text-sm rounded-xl'>
                    Judge
                  </span>
                  <span className='px-3 py-1 bg-gray-200 text-blue-600 text-xs sm:text-sm rounded-xl'>
                    {assignments.length} Tugas
                  </span>
                </div>

                <button
                  onClick={sendRealtimeMessage}
                  className='mt-5 px-5 py-2.5 w-full sm:w-auto
                   bg-blue-600 text-white rounded-xl shadow 
                   hover:shadow-lg hover:scale-105 transition-all'>
                  Kirim Pesan ke Operator
                </button>
              </div>
            </div>
          </motion.div>

          {/* Events */}
          <div className='space-y-10 mt-12'>
            {events.map(event => {
              const assignment = getJudgeAssignment(event._id)
              const hasActiveRole = hasAnyActiveRole(assignment)
              const banner =
                event.eventBanner?.trim() || '/images/logo-dummy.png'

              return (
                <motion.div
                  key={event._id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className='bg-white/80 flex flex-col backdrop-blur-md rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-100 overflow-hidden'>
                  {/* Banner */}
                  <div className='relative w-full h-48 sm:h-56 lg:h-64'>
                    <img
                      src={banner}
                      alt={event.eventName}
                      className='w-full h-full object-cover'
                    />
                    <div className='absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent'></div>
                    <div className='absolute bottom-4 left-6'>
                      <h2 className='text-lg sm:text-xl lg:text-2xl font-bold text-white drop-shadow'>
                        {event.eventName}
                      </h2>
                      <div className='flex gap-2 mt-2'>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium shadow ${
                            event.statusEvent === 'Activated'
                              ? 'bg-green-500 text-white'
                              : 'bg-red-500 text-white'
                          }`}>
                          {event.statusEvent}
                        </span>
                        <span className='px-3 py-1 bg-white/30 rounded-full text-xs text-white shadow'>
                          {assignment ? '✅ Terassign' : '❌ Belum Assign'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className='p-6 flex-1 flex flex-col'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                      <div className='space-y-2 text-sm sm:text-base text-gray-600'>
                        <p>
                          <strong>Lokasi:</strong> {event.riverName || 'N/A'}
                        </p>
                        <p>
                          <strong>Level:</strong> {event.levelName || 'N/A'}
                        </p>
                      </div>
                      <div className='space-y-2 text-sm sm:text-base text-gray-600'>
                        <p>
                          <strong>Status:</strong> {event.statusEvent}
                        </p>
                        <p>
                          <strong>Peran Aktif:</strong>{' '}
                          {hasActiveRole ? '✅' : '❌'}
                        </p>
                      </div>
                    </div>

                    {/* Buttons */}
                    {assignment && hasActiveRole ? (
                      <div>
                        <h3 className='font-semibold text-gray-800 mb-3'>
                          Tugas Juri:
                        </h3>
                        <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
                          {judgeButtonsConfig.map(btn =>
                            btn.checkActive(assignment) ? (
                              <NavigationButton
                                key={btn.key}
                                href={btn.href}
                                label={btn.label}
                                icon={btn.icon}
                                color={btn.color}
                                params={{
                                  eventId: event._id,
                                  userId: user?._id,
                                  assignmentId: assignment._id,
                                }}
                                className='h-full'
                              />
                            ) : null
                          )}
                        </div>
                      </div>
                    ) : assignment ? (
                      <div className='text-center py-4 bg-amber-50 rounded-lg border border-amber-200'>
                        <p className='text-amber-700 font-medium'>
                          ⚠️ Tidak ada peran juri aktif untuk event ini
                        </p>
                      </div>
                    ) : (
                      <div className='text-center py-4 bg-gray-50 rounded-lg border border-gray-200'>
                        <p className='text-gray-600 font-medium'>
                          📝 Menunggu assignment dari administrator
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

export default JudgesPage
