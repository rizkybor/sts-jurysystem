'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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

  const pushToast = (msg, ttlMs = 4000) => {
    const id = toastId.current++
    setToasts(prev => [...prev, { id, ...msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ttlMs)
  }

  const removeToast = id => setToasts(prev => prev.filter(t => t.id !== id))

  const socketRef = useRef(null)

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket

    const handler = msg => {
      if (
        msg?.senderId &&
        socketRef.current &&
        msg.senderId === socketRef.current.id
      )
        return

      pushToast({
        title: msg.from ? `Pesan dari ${msg.from}` : 'Notifikasi',
        text: msg.text || 'Pesan baru diterima',
        type: 'info',
      })
    }

    socket.on('custom:event', handler)
    return () => {
      socket.off('custom:event', handler)
    }
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

        // Fetch judges data
        const judgesRes = await fetch('/api/judges', { cache: 'no-store' })
        if (!judgesRes.ok)
          throw new Error(`Gagal memuat data judges: ${judgesRes.status}`)

        const judgesData = await judgesRes.json()
        setUser(judgesData.user)
        setEvents(judgesData.events || [])

        // Fetch assignments
        const userEmail = judgesData.user?.email
        if (!userEmail) throw new Error('Email tidak ditemukan')

        const assignmentsRes = await fetch(
          `/api/assignments?email=${encodeURIComponent(userEmail)}`,
          {
            cache: 'no-store',
          }
        )

        if (!assignmentsRes.ok) {
          if (assignmentsRes.status === 400)
            throw new Error('Email tidak valid')
          throw new Error(`Gagal memuat assignments: ${assignmentsRes.status}`)
        }

        const assignmentsData = await assignmentsRes.json()
        setAssignments(assignmentsData.data || [])
      } catch (error) {
        console.error('Error:', error)
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

  // Helper functions
  const getJudgeAssignment = eventId => {
    if (!assignments?.length) return null

    for (const assign of assignments) {
      if (assign.judges?.length) {
        const judgeAssignment = assign.judges.find(
          judge => judge.eventId === eventId
        )
        if (judgeAssignment) return judgeAssignment
      }
    }
    return null
  }

  const hasAnyActiveRole = assignment => {
    if (!assignment) return false

    return (
      (assignment.sprint &&
        (assignment.sprint.start || assignment.sprint.finish)) ||
      (assignment.h2h &&
        Object.values(assignment.h2h).some(val => val === true)) ||
      (assignment.slalom &&
        (assignment.slalom.start || assignment.slalom.finish)) ||
      (assignment.drr && (assignment.drr.start || assignment.drr.finish))
    )
  }

  // Judge buttons configuration
  const judgeButtonsConfig = useMemo(
    () => [
      {
        key: 'sprint',
        href: '/judges/sprint',
        label: 'Sprint',
        icon: '🏎️',
        color: 'from-blue-500 to-blue-600',
        checkActive: assignment =>
          assignment?.sprint &&
          (assignment.sprint.start || assignment.sprint.finish),
      },
      {
        key: 'h2h',
        href: '/judges/headtohead',
        label: 'Head to Head',
        icon: '⚔️',
        color: 'from-green-500 to-green-600',
        checkActive: assignment =>
          assignment?.h2h &&
          Object.values(assignment.h2h).some(val => val === true),
      },
      {
        key: 'slalom',
        href: '/judges/slalom',
        label: 'Slalom',
        icon: '🌀',
        color: 'from-purple-500 to-purple-600',
        checkActive: assignment =>
          assignment?.slalom &&
          (assignment.slalom.start || assignment.slalom.finish),
      },
      {
        key: 'drr',
        href: '/judges/downriverrace',
        label: 'Down River',
        icon: '🌊',
        color: 'from-red-500 to-red-600',
        checkActive: assignment =>
          assignment?.drr && (assignment.drr.start || assignment.drr.finish),
      },
    ],
    []
  )

  // Loading state
  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4'></div>
          <h2 className='text-xl font-semibold text-gray-700 mb-2'>
            Memuat Dashboard
          </h2>
          <p className='text-gray-500'>Menyiapkan data judges...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !user) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center max-w-md mx-4'>
          <div className='text-6xl mb-4'>😕</div>
          <h2 className='text-2xl font-bold text-gray-800 mb-2'>
            Terjadi Kesalahan
          </h2>
          <p className='text-gray-600 mb-6'>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className='px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200'>
            Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Toast Notifications */}
      <div className='fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full'>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`transform transition-all duration-300 animate-in slide-in-from-right-full
              p-4 rounded-xl shadow-lg border backdrop-blur-sm
              ${
                toast.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : toast.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}>
            <div className='flex items-start gap-3'>
              <div
                className={`mt-0.5 w-3 h-3 rounded-full ${
                  toast.type === 'error'
                    ? 'bg-red-500'
                    : toast.type === 'success'
                    ? 'bg-green-500'
                    : 'bg-blue-500'
                }`}
              />
              <div className='flex-1'>
                <p className='font-semibold text-sm'>{toast.title}</p>
                <p className='text-sm opacity-90'>{toast.text}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className='p-1 rounded-full hover:bg-black/10 transition-colors'>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          {/* Header Section */}
          <div className='text-center mb-8'>
            <h1 className='text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3'>
              Judges Dashboard
            </h1>
            <p className='text-gray-600 text-lg'>
              Kelola tugas sebagai juri kompetisi
            </p>
          </div>

          {/* User Profile Card */}
          <div className='flex justify-center mb-8'>
            <div className='bg-white rounded-2xl shadow-xl p-6 max-w-md w-full border border-gray-100'>
              <div className='flex items-center space-x-4'>
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user.username}
                    className='w-16 h-16 rounded-full border-4 border-blue-100'
                  />
                ) : (
                  <div className='w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold'>
                    {user?.username?.charAt(0) || 'U'}
                  </div>
                )}
                <div className='flex-1 min-w-0'>
                  <h2 className='text-xl font-bold text-gray-800 truncate'>
                    {user?.username || 'User'}
                  </h2>
                  <p className='text-gray-600 text-sm truncate'>
                    {user?.email}
                  </p>
                  <div className='flex items-center mt-1 space-x-2'>
                    <span className='px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full font-medium'>
                      Juri
                    </span>
                    <span className='px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full font-medium'>
                      {assignments.length} Tugas
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={sendRealtimeMessage}
                className='w-full mt-4 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'>
                📨 Kirim Pesan ke Operator
              </button>
            </div>
          </div>

          {/* Events Section */}
          <div className='space-y-6'>
            {events.length === 0 ? (
              <div className='text-center py-12'>
                <div className='text-6xl mb-4'>📋</div>
                <h3 className='text-xl font-semibold text-gray-700 mb-2'>
                  Belum Ada Event
                </h3>
                <p className='text-gray-500'>
                  Tidak ada event yang ditugaskan kepada Anda saat ini.
                </p>
              </div>
            ) : (
              events.map(event => {
                const assignment = getJudgeAssignment(event._id)
                const hasActiveRole = hasAnyActiveRole(assignment)
                const banner =
                  event.eventBanner?.trim() || '/images/logo-dummy.png'

                return (
                  <div
                    key={event._id}
                    className='bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden'>
                    {/* Event Header */}
                    <div className='relative h-48 bg-gradient-to-r from-blue-500 to-purple-600'>
                      <img
                        src={banner}
                        alt={event.eventName}
                        className='w-full h-full object-cover'
                      />
                      <div className='absolute inset-0 bg-black/20'></div>
                      <div className='absolute bottom-4 left-6'>
                        <h2 className='text-2xl font-bold text-white drop-shadow-lg'>
                          {event.eventName}
                        </h2>
                        <div className='flex items-center space-x-2 mt-1'>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                              event.statusEvent === 'Activated'
                                ? 'bg-green-500/90 text-white'
                                : 'bg-red-500/90 text-white'
                            }`}>
                            {event.statusEvent}
                          </span>
                          <span className='px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white'>
                            {assignment ? '✅ Terassign' : '❌ Belum Assign'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Event Content */}
                    <div className='p-6'>
                      <p className='text-gray-700 mb-4 leading-relaxed'>
                        {event.description || 'Deskripsi event tidak tersedia.'}
                      </p>

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                        <div className='space-y-2'>
                          <div className='flex items-center text-sm text-gray-600'>
                            <span className='w-2 h-2 bg-blue-500 rounded-full mr-2'></span>
                            <strong>Lokasi:</strong> {event.riverName || 'N/A'}
                          </div>
                          <div className='flex items-center text-sm text-gray-600'>
                            <span className='w-2 h-2 bg-green-500 rounded-full mr-2'></span>
                            <strong>Level:</strong> {event.levelName || 'N/A'}
                          </div>
                        </div>
                        <div className='space-y-2'>
                          <div className='flex items-center text-sm text-gray-600'>
                            <span className='w-2 h-2 bg-purple-500 rounded-full mr-2'></span>
                            <strong>Status:</strong> {event.statusEvent}
                          </div>
                          <div className='flex items-center text-sm text-gray-600'>
                            <span className='w-2 h-2 bg-orange-500 rounded-full mr-2'></span>
                            <strong>Peran Aktif:</strong>{' '}
                            {hasActiveRole ? '✅' : '❌'}
                          </div>
                        </div>
                      </div>

                      {/* Judge Buttons */}
                      {assignment && hasActiveRole ? (
                        <div>
                          <h3 className='font-semibold text-gray-800 mb-4 flex items-center'>
                            <span className='w-3 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded-full mr-2 animate-pulse'></span>
                            Tugas Juri yang Tersedia:
                          </h3>
                          <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
                            {judgeButtonsConfig.map(btn => {
                              if (!btn.checkActive(assignment)) return null

                              return (
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
                                  className='group relative overflow-hidden'
                                />
                              )
                            })}
                          </div>
                        </div>
                      ) : assignment ? (
                        <div className='text-center py-4 bg-amber-50 rounded-lg border border-amber-200'>
                          <p className='text-amber-700 font-medium'>
                            ⚠️ Tidak ada peran juri yang aktif untuk event ini
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
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className='text-center mt-12 pt-8 border-t border-gray-200'>
            <p className='text-gray-500 text-sm'>
              Judges Dashboard • {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default JudgesPage
