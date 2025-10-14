'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ResultSlalom from '@/components/ResultSlalom'
import getSocket from '@/utils/socket'
import { motion } from 'framer-motion'

/** 🔹 Helper: ambil posisi Slalom dari assignments */
const getSlalomPositionsFromAssignments = (list, evId) => {
  if (!Array.isArray(list) || !evId) return []

  const match = list
    .flatMap(item => item.judges || [])
    .find(j => String(j.eventId) === String(evId))

  if (!match?.slalom) return []

  const positions = []
  if (Array.isArray(match.slalom.gates)) {
    positions.push(...match.slalom.gates.map(g => `Gate ${g}`))
  }
  if (match.slalom.start === true) positions.push('Start')
  if (match.slalom.finish === true) positions.push('Finish')
  return positions
}

const JudgesSlalomPage = () => {
  const searchParams = useSearchParams()
  const eventId = searchParams.get('eventId')
  const userId = searchParams.get('userId')

  const [user, setUser] = useState(null)
  const [assignments, setAssignments] = useState([])

  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedGate, setSelectedGate] = useState('')
  const [selectedPenalty, setSelectedPenalty] = useState(null)
  const [runNumber, setRunNumber] = useState(1)

  const [clickedCircles, setClickedCircles] = useState({
    P1: false,
    P2: false,
    P3: false,
    P4: false,
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [resultData, setResultData] = useState({})

  const [eventDetail, setEventDetail] = useState(null)
  const [loadingEvent, setLoadingEvent] = useState(true)

  const [teams, setTeams] = useState([])
  const [loadingTeams, setLoadingTeams] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
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

  const gateOptions = useMemo(() => {
    return getSlalomPositionsFromAssignments(assignments, eventId)
  }, [assignments, eventId])

  const penalties = useMemo(() => {
    if (selectedGate === 'Start' || selectedGate === 'Finish') {
      return [0, 10, 50]
    } else if (selectedGate.startsWith('Gate')) {
      return [0, 5, 50]
    } else {
      return [] // fallback, misal belum pilih gate
    }
  }, [selectedGate])

  const runs = [
    { label: 'Run 1', value: 1 },
    { label: 'Run 2', value: 2 },
  ]

  // ✅ SOCKET CONNECTION
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

  // ✅ SEND REALTIME MESSAGE FUNCTION
  const sendRealtimeMessage = (operationType, gateNumber) => {
    const socket = socketRef.current || getSocket()
    if (!socket) return

    const selectedTeamData = teams.find(t => t._id === selectedTeam)
    const teamName = selectedTeamData?.nameTeam || 'Unknown Team'

    let messageData = {}

    if (operationType === 'start') {
      messageData = {
        senderId: socket.id,
        from: 'Judges Dashboard - SLALOM',
        text: `Slalom: ${teamName} - Run ${runNumber} Start - Penalty ${selectedPenalty} detik`,
        teamId: selectedTeam,
        teamName: teamName,
        type: 'PenaltyStart',
        runNumber: runNumber,
        penalty: Number(selectedPenalty),
        eventId: eventId,
        ts: new Date().toISOString(),
        bib: selectedTeamData?.bibTeam || '',
        run: runNumber,
      }
    } else if (operationType === 'finish') {
      messageData = {
        senderId: socket.id,
        from: 'Judges Dashboard - SLALOM',
        text: `Slalom: ${teamName} - Run ${runNumber} Finish - Penalty ${selectedPenalty} detik`,
        teamId: selectedTeam,
        teamName: teamName,
        type: 'PenaltyFinish',
        runNumber: runNumber,
        penalty: Number(selectedPenalty),
        eventId: eventId,
        ts: new Date().toISOString(),
        bib: selectedTeamData?.bibTeam || '',
        run: runNumber,
      }
    } else {
      messageData = {
        senderId: socket.id,
        from: 'Judges Dashboard - SLALOM',
        text: `Slalom: ${teamName} - Run ${runNumber} Gate ${gateNumber} - Penalty ${selectedPenalty} detik`,
        teamId: selectedTeam,
        teamName: teamName,
        type: 'PenaltiesUpdated',
        runNumber: runNumber,
        gate: `Gate ${gateNumber}`,
        gateNumber: gateNumber,
        penalty: Number(selectedPenalty),
        eventId: eventId,
        ts: new Date().toISOString(),
        bib: selectedTeamData?.bibTeam || '',
        run: runNumber,
      }
    }

    console.log('📡 [SLALOM SOCKET] Sending realtime message:', messageData)

    socket.emit('custom:event', messageData, ok => {
      if (ok) {
        console.log('✅ [SLALOM SOCKET] Message delivered to operator')
      } else {
        console.log('❌ [SLALOM SOCKET] Message failed to deliver')
        pushToast({
          title: 'Peringatan',
          text: 'Pesan tidak terkirim ke operator',
          type: 'warning',
        })
      }
    })
  }

  /** 🔹 Fetch event detail */
  useEffect(() => {
    if (!eventId) return
    const fetchEventDetail = async () => {
      setLoadingEvent(true)
      try {
        const res = await fetch(`/api/matches/${eventId}`, {
          cache: 'no-store',
        })
        const data = await res.json()
        const evt = data.event || data
        setEventDetail(evt || null)
      } catch (err) {
        console.error(err)
        setEventDetail(null)
      } finally {
        setLoadingEvent(false)
      }
    }
    fetchEventDetail()
  }, [eventId])

  /** 🔹 Fetch user & assignments */
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
        setAssignments(assignmentsData.data || [])
      } catch (err) {
        console.error(err)
      }
    }
    fetchData()
  }, [eventId])

  /** 🔹 Fetch registered teams (SLALOM) */
  useEffect(() => {
    if (!eventId || !selectedCategory) return

    const fetchTeams = async () => {
      try {
        const [initialId, divisionId, raceId] = selectedCategory.split('|')
        const catEvent = 'SLALOM'

        const res = await fetch(
          `/api/events/${eventId}/judge-tasks?initialId=${initialId}&divisionId=${divisionId}&raceId=${raceId}&eventName=${catEvent}`
        )

        const data = await res.json()
        if (res.ok && data?.success) {
          setTeams(data.teams || [])
          console.log('🔍 SLALOM Teams loaded:', data.teams)

          // ✅ DEBUG: Lihat data slalom setiap team
          data.teams.forEach(team => {
            console.log(`Team: ${team.nameTeam}`)
            console.log(
              'Run 1 penalties:',
              team.results?.[0]?.penaltyTotal?.gates || []
            )
            console.log(
              'Run 2 penalties:',
              team.results?.[1]?.penaltyTotal?.gates || []
            )
          })
        } else {
          setTeams([])
          pushToast({
            title: 'Data Tim Kosong',
            text: 'Tidak ada tim untuk kategori ini',
            type: 'info',
          })
        }
      } catch (err) {
        console.error('❌ Failed to fetch SLALOM teams:', err)
        setTeams([])
        pushToast({
          title: 'Error',
          text: 'Gagal memuat data tim',
          type: 'error',
        })
      } finally {
        setLoadingTeams(false)
      }
    }

    setLoadingTeams(true)
    fetchTeams()
  }, [eventId, selectedCategory])

  /** 🔹 Refresh teams setelah submit */
  const refreshTeams = async () => {
    if (!selectedCategory || !eventId) return

    try {
      const [initialId, divisionId, raceId] = selectedCategory.split('|')
      const res = await fetch(
        `/api/events/${eventId}/judge-tasks?initialId=${initialId}&divisionId=${divisionId}&raceId=${raceId}&eventName=SLALOM&t=${Date.now()}`
      )
      const data = await res.json()
      if (res.ok && data?.success) {
        setTeams(data.teams || [])
      }
    } catch (error) {
      console.error('❌ Failed to refresh teams:', error)
    }
  }

  /** 🔹 Combined categories */
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

  /** 🔹 Filtered teams */
  const filteredTeams = useMemo(() => {
    if (!selectedCategory) return teams
    const [initialId, divisionId, raceId] = selectedCategory.split('|')
    return teams.filter(
      team =>
        String(team.initialId) === String(initialId) &&
        String(team.divisionId) === String(divisionId) &&
        String(team.raceId) === String(raceId)
    )
  }, [selectedCategory, teams])

  /** 🔹 Handlers */
  const handleCategoryChange = value => {
    setSelectedCategory(value)
    setSelectedTeam('')
    setTeams([])
    setLoadingTeams(true)
  }

  const handleClick = position => {
    setClickedCircles(prev => ({
      ...prev,
      [position]: !prev[position],
    }))
  }

  /** 🔹 SUBMIT HANDLER YANG SUDAH DIPERBAIKI */
  const handleSubmit = async e => {
    e.preventDefault()
    if (
      !selectedCategory ||
      !selectedTeam ||
      !selectedGate ||
      selectedPenalty === null
    ) {
      pushToast({
        title: 'Data Belum Lengkap',
        text: 'Harap pilih kategori, tim, gate, dan penalty sebelum submit',
        type: 'error',
      })
      return
    }

    // ✅ DETERMINE OPERATION TYPE
    let operationType = ''
    let gateNumber = undefined

    if (selectedGate === 'Start') {
      operationType = 'start'
    } else if (selectedGate === 'Finish') {
      operationType = 'finish'
    } else {
      operationType = 'gate'
      // ✅ EXTRACT GATE NUMBER dari "Gate X"
      gateNumber = parseInt(selectedGate.replace('Gate ', ''))
      if (isNaN(gateNumber)) {
        pushToast({
          title: 'Gate Tidak Valid',
          text: 'Format gate tidak valid',
          type: 'error',
        })
        return
      }
    }

    // ✅ CEK APAKAH TEAM VALID
    const selectedTeamData = teams.find(t => t._id === selectedTeam)
    if (!selectedTeamData?.hasValidTeamId) {
      pushToast({
        title: 'Team Tidak Valid',
        text: `Team ${selectedTeamData?.nameTeam} tidak memiliki ID yang valid dan tidak bisa submit penalty. Silakan pilih team lain.`,
        type: 'warning',
        ttlMs: 6000,
      })
      return
    }

    const [initialId, divisionId, raceId] = selectedCategory.split('|')
    const actualTeamId = selectedTeamData.teamId

    // ✅ PAYLOAD YANG SESUAI DENGAN API BARU
    const payload = {
      runNumber,
      team: actualTeamId,
      penalty: selectedPenalty,
      eventId,
      initialId,
      divisionId,
      raceId,
      operationType, // ✅ 'start', 'gate', atau 'finish'
    }

    // ✅ HANYA TAMBAH gateNumber UNTUK OPERASI GATES
    if (operationType === 'gate') {
      payload.gateNumber = gateNumber
    }

    console.log('🔍 Submitting SLALOM penalty:', payload)
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/judges/slalom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      let data = null
      try {
        data = await res.json()
      } catch {
        // non-JSON response
      }

      if (res.ok && data?.success) {
        let successMessage = ''

        if (operationType === 'start') {
          successMessage = `✅ Start penalty recorded - Run ${runNumber}: ${selectedPenalty} seconds`
        } else if (operationType === 'finish') {
          successMessage = `✅ Finish penalty recorded - Run ${runNumber}: ${selectedPenalty} seconds`
        } else {
          successMessage = `✅ Gate penalty added - Run ${runNumber} Gate ${gateNumber}: ${selectedPenalty} seconds`
        }

        pushToast({
          title: 'Berhasil!',
          text: successMessage,
          type: 'success',
        })

        // ✅ KIRIM REALTIME MESSAGE KE OPERATOR
        sendRealtimeMessage(operationType, gateNumber)

        // Refresh teams data
        await refreshTeams()
        // Reset form
        setSelectedGate('')
        setSelectedPenalty(null)
        setClickedCircles({ P1: false, P2: false, P3: false, P4: false })
      } else {
        const msg = data?.message || `HTTP ${res.status}`
        pushToast({
          title: 'Error Submit',
          text: `❌ ${msg}`,
          type: 'error',
        })
      }
    } catch (err) {
      console.error('Submit error:', err)
      pushToast({
        title: 'Network Error',
        text: '❌ Gagal mengirim data! Coba lagi.',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  /** 🔹 Render */
  return (
    <>
      {/* Toasts dengan animasi */}
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
                  : toast.type === 'warning'
                  ? 'border-orange-300 text-orange-800'
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

      <div className='min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8'>
        <div className='w-full max-w-5xl bg-white p-6 rounded-2xl shadow-lg'>
          {eventDetail && (
            <div className='mb-4 space-y-1 bg-gray-100 p-4 rounded-lg'>
              <div className='font-semibold'>{eventDetail.eventName}</div>
              <div className='text-sm text-gray-600'>
                {new Date(eventDetail.startDateEvent).toLocaleDateString(
                  'id-ID',
                  {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  }
                )}{' '}
                –{' '}
                {new Date(eventDetail.endDateEvent).toLocaleDateString(
                  'id-ID',
                  {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  }
                )}
              </div>
              <div className='text-sm text-gray-600'>
                {eventDetail.addressProvince}, {eventDetail.addressState}
              </div>
            </div>
          )}

          <div className='mb-5'>
            <h1 className='text-2xl font-bold text-gray-800'>
              Judges {gateOptions.join(', ') || ''}
            </h1>
            <small className='text-center'>Race Number : Slalom Race</small>
          </div>

          {/* ✅ BUTTON TEST REALTIME MESSAGE */}
          <div className='mb-6 text-center'>
            <button
              onClick={() => {
                let operationType = ''
                let gateNumber = undefined

                if (selectedGate === 'Start') {
                  operationType = 'start'
                } else if (selectedGate === 'Finish') {
                  operationType = 'finish'
                } else {
                  operationType = 'gate'
                  gateNumber = parseInt(selectedGate.replace('Gate ', ''))
                }

                sendRealtimeMessage(operationType, gateNumber)
              }}
              disabled={!selectedTeam || !selectedGate}
              className={`px-5 py-2.5 w-full sm:w-auto rounded-xl shadow transition-all ${
                !selectedTeam || !selectedGate
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-blue-600 text-white hover:shadow-lg hover:scale-105'
              }`}>
              Test Kirim Pesan ke Operator
            </button>
            <p className='text-xs text-gray-500 mt-2'>
              *Button untuk test mengirim pesan realtime ke operator timing
            </p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='flex flex-col-reverse md:flex-row gap-8'>
              {/* 🏁 LEFT FORM */}
              <div className='w-full md:w-1/2 space-y-6'>
                {/* RUN SELECT */}
                <div>
                  <label className='block text-gray-700 mb-2'>
                    Select Run :
                  </label>
                  <select
                    value={runNumber}
                    onChange={e => setRunNumber(Number(e.target.value))}
                    className='w-full px-4 py-2 border rounded-lg'>
                    {runs.map(r => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SELECT CATEGORY */}
                <div>
                  <label className='block text-gray-700 mb-2'>
                    Select Category :
                  </label>
                  {loadingEvent ? (
                    <p className='text-gray-500 text-sm'>
                      Loading categories...
                    </p>
                  ) : combinedCategories.length ? (
                    <select
                      value={selectedCategory}
                      onChange={e => handleCategoryChange(e.target.value)}
                      className='w-full px-4 py-2 border rounded-lg'
                      required>
                      <option value=''>Select Category</option>
                      {combinedCategories.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className='text-gray-500 text-sm'>
                      No categories available.
                    </p>
                  )}
                </div>

                {/* SELECT TEAM */}
                <div>
                  <label className='block text-gray-700 mb-2'>
                    Select Team:
                  </label>
                  {loadingTeams ? (
                    <select
                      disabled
                      className='w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-400'>
                      <option>Loading teams...</option>
                    </select>
                  ) : filteredTeams.length ? (
                    <select
                      value={selectedTeam}
                      onChange={e => setSelectedTeam(e.target.value)}
                      className='w-full px-4 py-2 border rounded-lg'
                      required>
                      <option value=''>Select Team</option>
                      {filteredTeams.map(team => (
                        <option
                          key={team._id}
                          value={team._id}
                          className={
                            !team.hasValidTeamId
                              ? 'text-orange-500 bg-orange-50'
                              : ''
                          }>
                          {team.nameTeam} (BIB {team.bibTeam})
                          {!team.hasValidTeamId && ' ⚠️ Tidak bisa submit'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      disabled
                      className='w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-400'>
                      <option>No teams available for this category</option>
                    </select>
                  )}

                  {/* WARNING MESSAGE */}
                  {selectedTeam &&
                    !filteredTeams.find(t => t._id === selectedTeam)
                      ?.hasValidTeamId && (
                      <div className='mt-2 p-3 bg-orange-100 border border-orange-300 rounded-lg'>
                        <p className='text-orange-800 text-sm font-medium'>
                          ⚠️ Team ini tidak memiliki ID yang valid dan tidak
                          bisa menerima penalty.
                        </p>
                        <p className='text-orange-700 text-xs mt-1'>
                          Silakan hubungi administrator untuk memperbaiki data
                          team.
                        </p>
                      </div>
                    )}
                </div>

                {/* SELECT GATE */}
                <div>
                  <label className='block text-gray-700 mb-2'>
                    Select Gate :
                  </label>
                  <select
                    value={selectedGate}
                    onChange={e => setSelectedGate(e.target.value)}
                    className='w-full px-4 py-2 border rounded-lg'
                    required>
                    <option value=''>Select Gate</option>
                    {gateOptions.map((gate, index) => (
                      <option key={index} value={gate}>
                        {gate}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PENALTY */}
                <div className='space-y-4'>
                  {penalties.map((penalty, index) => (
                    <button
                      key={index}
                      type='button'
                      onClick={() => setSelectedPenalty(penalty)}
                      className={`w-full py-3 rounded-lg border ${
                        selectedPenalty === penalty
                          ? 'bg-blue-100 border-blue-500 text-blue-700 font-semibold'
                          : 'bg-white border-gray-300 text-gray-700'
                      }`}>
                      Penalty: {penalty} points
                    </button>
                  ))}
                </div>

                {/* SUBMIT */}
                <button
                  type='submit'
                  disabled={isSubmitting}
                  className={`w-full py-3 rounded-lg font-semibold shadow-md transition duration-300 ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}>
                  {isSubmitting ? 'Submitting...' : 'Submit →'}
                </button>

                {/* View Result */}
                <div className='text-center mt-4'>
                  <button
                    type='button'
                    onClick={() => setIsModalOpen(true)}
                    className='text-blue-500 hover:underline'>
                    View Result
                  </button>
                </div>

                {/* Back */}
                <div className='text-center mt-4'>
                  <Link href={`/judges?eventId=${eventId}&userId=${userId}`}>
                    <button className='text-blue-500 hover:underline'>
                      ← Back to Judges
                    </button>
                  </Link>
                </div>
              </div>

              {/* 🚣‍♂️ RIGHT VIEW */}
              <div className='w-full md:w-1/2 flex flex-col items-center'>
                <h2 className='text-lg font-semibold mb-4'>Penalties Detail</h2>
                <div className='relative w-64 h-96 bg-green-300 rounded-full shadow-inner border-8 border-green-600'>
                  {['P1', 'P2', 'P3', 'P4'].map((pos, index) => (
                    <div
                      key={index}
                      onClick={() => handleClick(pos)}
                      className={`absolute w-14 h-14 flex items-center justify-center rounded-full cursor-pointer font-bold ${
                        clickedCircles[pos] ? 'bg-red-500' : 'bg-yellow-300'
                      } hover:scale-105 transition`}
                      style={{
                        top: index < 2 ? '10%' : '70%',
                        left: index % 2 === 0 ? '20%' : '60%',
                      }}>
                      {pos}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </form>

          {/* Modal Result */}
          <ResultSlalom
            isOpen={isModalOpen}
            closeModal={() => setIsModalOpen(false)}
            resultData={{
              category: selectedCategory,
              team: selectedTeam,
              gate: selectedGate,
              selectedPenalty,
              penaltiesDetail: clickedCircles,
              runNumber,
            }}
          />
        </div>
      </div>
    </>
  )
}

export default JudgesSlalomPage
