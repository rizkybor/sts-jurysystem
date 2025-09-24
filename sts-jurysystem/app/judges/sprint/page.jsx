'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ResultSprint from '@/components/ResultSprint'

const JudgesSprintPages = () => {
  const searchParams = useSearchParams()
  const eventId = searchParams.get('eventId')
  const juryId = searchParams.get('userId')

  const [selectedPenalty, setSelectedPenalty] = useState(null)
  const [selectedTeam, setSelectedTeam] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sprintResults, setSprintResults] = useState([])
  const [loading, setLoading] = useState(false)

  const [teams, setTeams] = useState([])
  const [eventMetadata, setEventMetadata] = useState(null)
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const [eventDetail, setEventDetail] = useState(null)
  const [loadingEvent, setLoadingEvent] = useState(true)

  // checkbox selections
  const [selectedInitials, setSelectedInitials] = useState([])
  const [selectedDivisions, setSelectedDivisions] = useState([])
  const [selectedClasses, setSelectedClasses] = useState([])

  const penalties = [0, 5, 50]

  // ✅ Fungsi untuk konversi judgesSprint "1" atau "2" ke Position
  const getPositionFromJudgeSprint = judgeValue => {
    switch (judgeValue) {
      case '1':
        return 'Start'
      case '2':
        return 'Finish'
      default:
        return ''
    }
  }

  // ✅ Dapatkan position dari user.judgesSprint
  const assignedPosition = user
    ? getPositionFromJudgeSprint(user.judgesSprint)
    : ''
  const [selectedPosition, setSelectedPosition] = useState(
    assignedPosition || ''
  )

  // ✅ Tentukan apakah perlu menampilkan position selector
  const showPositionSelector = !assignedPosition

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch('/api/user')
        if (res.status === 200) {
          const data = await res.json()
          setUser(data)
          // ✅ Set selectedPosition setelah user data loaded
          setSelectedPosition(
            getPositionFromJudgeSprint(data.judgesSprint) || ''
          )
        }
      } catch (error) {
        console.log('Error fetching user:', error)
      } finally {
        setLoadingUser(false)
      }
    }

    fetchUserData()
  }, [])

  // ✅ Fetch Teams dari API termasuk metadata
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        console.log('🔄 [FRONTEND] Fetching teams for eventId:', eventId)
        const res = await fetch(`/api/events/${eventId}/teams`)
        const data = await res.json()

        console.log('📥 [FRONTEND] Full response:', data)

        if (res.ok && data.success) {
          setTeams(data.teams || [])
          setEventMetadata(data.eventMetadata || {})
        } else {
          console.error('Error fetching teams:', data.message)
        }
      } catch (error) {
        console.error('❌ Failed to fetch teams:', error)
      } finally {
        setLoadingTeams(false)
      }
    }

    if (eventId) fetchTeams()
  }, [eventId])

  useEffect(() => {
    const fetchEventDetail = async () => {
      if (!eventId) return
      setLoadingEvent(true)
      try {
        const res = await fetch(`/api/matches/${eventId}`)
        const data = await res.json()
        // sesuaikan bentuk response-mu; di sini kuanggap { event: {...} }
        const evt = data.event || data
        setEventDetail(evt || null)
      } catch (err) {
        console.error('❌ Failed to fetch event detail:', err)
        setEventDetail(null)
      } finally {
        setLoadingEvent(false)
      }
    }
    fetchEventDetail()
  }, [eventId])

  const toggleFromList = (value, list, setList) => {
    setList(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  // ✅ Fetch Sprint Results kalau modal dibuka
  useEffect(() => {
    if (isModalOpen) {
      fetchSprintResults()
    }
  }, [isModalOpen])

  const fetchSprintResults = async () => {
    try {
      const res = await fetch('/api/judges/sprint')
      const data = await res.json()
      if (res.ok) {
        setSprintResults(data.data)
      } else {
        console.error('Error fetching sprint results:', data.message)
      }
    } catch (error) {
      console.error('Failed to fetch sprint results:', error)
    }
  }

  // ✅ Function refresh teams dengan metadata
  const refreshTeams = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/teams?t=${Date.now()}`)
      const data = await res.json()

      if (res.ok && data.success) {
        setTeams(data.teams || [])
        setEventMetadata(data.eventMetadata || {})
      }
    } catch (error) {
      console.error('❌ Failed to refresh teams:', error)
    }
  }

  // Di JudgesSprintPages - handleSubmit function
  const handleSubmit = async e => {
    e.preventDefault()

    // ✅ Gunakan assignedPosition atau selectedPosition
    const finalPosition = assignedPosition || selectedPosition

    if (!selectedTeam || selectedPenalty === null || !finalPosition) {
      alert('⚠️ Please select team and penalty before submitting.')
      return
    }

    const selectedTeamData = teams.find(t => t._id === selectedTeam)
    if (!selectedTeamData) {
      alert(`❌ Error: Selected team not found. Please reselect the team.`)
      return
    }

    if (!eventMetadata) {
      alert('❌ Event metadata not loaded yet. Please wait...')
      await refreshTeams()
      return
    }

    // ✅ TAMBAHKAN updateBy DENGAN USERNAME
    const formData = {
      teamId: selectedTeam,
      penalty: Number(selectedPenalty),
      initialId: eventMetadata.initialId,
      raceId: eventMetadata.raceId,
      divisionId: eventMetadata.divisionId,
      position: finalPosition,
      updateBy: user?.username || 'Unknown Judge',
      selectedInitials,
      selectedDivisions,
      selectedClasses,
    }

    console.log('📤 [FRONTEND] Sending PATCH request with updateBy:', formData)

    setLoading(true)

    try {
      const res = await fetch(`/api/events/${eventId}/teams`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        alert(
          `✅ ${finalPosition} Penalty updated by ${user?.username || 'you'}!`
        )
        console.log('📝 Update details:', data.data)
        await refreshTeams()
        setSelectedTeam('')
        setSelectedPenalty(null)
        if (!assignedPosition) setSelectedPosition('')
      } else {
        alert(`❌ Error: ${data.message}`)
        if (data.message.includes('not found')) {
          await refreshTeams()
        }
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Fetch error:', error)
      alert('❌ Failed to update penalty! Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8'>
      <div className='w-full max-w-md bg-white p-6 rounded-2xl shadow-lg relative'>
        <h1 className='text-2xl font-bold text-center text-gray-800 mb-6'>
          Sprint Session
        </h1>

        {/* 🚀 DATA USER */}
        {loadingUser ? (
          <p className='text-gray-500 text-center'>Loading user data...</p>
        ) : user ? (
          <div className='flex flex-col items-center mb-6'>
            {/* Foto Profil */}
            {user.image && (
              <img
                src={user.image}
                alt={user.username}
                className='w-10 h-10 rounded-full shadow-md mb-3'
              />
            )}

            {/* Nama dan Email */}
            <h2 className='text-lg font-semibold text-gray-800'>
              {user.username}
            </h2>
            <p className='text-gray-600 text-sm'>{user.email}</p>

            {/* ✅ TAMPILKAN POSITION DARI judgesSprint */}
            {assignedPosition && (
              <div
                className={`mt-2 px-3 py-1 rounded-full border ${
                  assignedPosition === 'Start'
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-blue-100 text-blue-800 border-blue-200'
                }`}>
                <span className='font-semibold'>{assignedPosition} Judge</span>
                <span className='text-xs ml-1'>(Auto-assigned)</span>
              </div>
            )}
          </div>
        ) : (
          <p className='text-red-500 text-center'>User not found.</p>
        )}

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* ✅ FILTERS: Initial / Division / Class */}
          <div className='space-y-4'>
            <h3 className='text-base font-semibold text-gray-800'>Filters</h3>

            {/* Initial */}
            <div>
              <div className='text-sm font-medium text-gray-700 mb-2'>
                Initial
              </div>
              {loadingEvent ? (
                <p className='text-gray-500 text-sm'>Loading initial...</p>
              ) : eventDetail?.categoriesInitial?.length ? (
                <div className='grid grid-cols-2 gap-2'>
                  {eventDetail.categoriesInitial.map(item => (
                    <label
                      key={item._id}
                      className='flex items-center gap-2 text-sm'>
                      <input
                        type='checkbox'
                        checked={selectedInitials.includes(item.name)}
                        onChange={() =>
                          toggleFromList(
                            item.name,
                            selectedInitials,
                            setSelectedInitials
                          )
                        }
                        className='h-4 w-4'
                      />
                      <span>{item.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className='text-gray-500 text-sm'>No initial available.</p>
              )}
            </div>

            {/* Division */}
            <div>
              <div className='text-sm font-medium text-gray-700 mb-2'>
                Division
              </div>
              {loadingEvent ? (
                <p className='text-gray-500 text-sm'>Loading division...</p>
              ) : eventDetail?.categoriesDivision?.length ? (
                <div className='grid grid-cols-2 gap-2'>
                  {eventDetail.categoriesDivision.map(item => (
                    <label
                      key={item._id}
                      className='flex items-center gap-2 text-sm'>
                      <input
                        type='checkbox'
                        checked={selectedDivisions.includes(item.name)}
                        onChange={() =>
                          toggleFromList(
                            item.name,
                            selectedDivisions,
                            setSelectedDivisions
                          )
                        }
                        className='h-4 w-4'
                      />
                      <span>{item.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className='text-gray-500 text-sm'>No division available.</p>
              )}
            </div>

            {/* Class */}
            <div>
              <div className='text-sm font-medium text-gray-700 mb-2'>
                Class
              </div>
              {loadingEvent ? (
                <p className='text-gray-500 text-sm'>Loading class...</p>
              ) : eventDetail?.categoriesRace?.length ? (
                <div className='grid grid-cols-2 gap-2'>
                  {eventDetail.categoriesRace.map(item => (
                    <label
                      key={item._id}
                      className='flex items-center gap-2 text-sm'>
                      <input
                        type='checkbox'
                        checked={selectedClasses.includes(item.name)}
                        onChange={() =>
                          toggleFromList(
                            item.name,
                            selectedClasses,
                            setSelectedClasses
                          )
                        }
                        className='h-4 w-4'
                      />
                      <span>{item.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className='text-gray-500 text-sm'>No class available.</p>
              )}
            </div>
          </div>

          {/* TEAM SELECT */}
          <div>
            <label className='block text-gray-700 mb-2'>Team:</label>
            {loadingTeams ? (
              <p className='text-gray-500'>Loading teams...</p>
            ) : (
              <select
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
                className='w-full px-4 py-2 border rounded-lg'
                required>
                <option value='' disabled>
                  Select Team
                </option>
                {teams.map(team => (
                  <option key={team._id} value={team._id}>
                    {team.nameTeam} (BIB {team.bibTeam})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* PENALTY BUTTONS */}
          <div className='space-y-2'>
            <div className='text-sm text-gray-600 mb-2'>Select Penalty:</div>
            {penalties.map((pen, index) => (
              <button
                key={index}
                type='button'
                onClick={() => setSelectedPenalty(pen)}
                className={`w-full py-3 rounded-lg border ${
                  selectedPenalty === pen
                    ? 'bg-blue-100 border-blue-500 text-blue-700 font-semibold'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}>
                Penalty: {pen} points
              </button>
            ))}
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type='submit'
            className='w-full py-3 bg-blue-500 text-white rounded-lg font-semibold shadow-md hover:bg-blue-600 disabled:bg-gray-400'
            disabled={
              loading ||
              !selectedTeam ||
              selectedPenalty === null ||
              !eventMetadata
            }>
            {loading
              ? 'Submitting...'
              : `Submit as ${assignedPosition || selectedPosition} Judge →`}
          </button>
        </form>

        {/* VIEW RESULT */}
        <div className='text-center mt-4'>
          <button
            onClick={() => setIsModalOpen(true)}
            className='text-blue-500 hover:underline'>
            View Result
          </button>
        </div>

        {/* BACK */}
        <div className='text-center mt-4'>
          <Link href='/judges'>
            <button className='text-blue-500 hover:underline'>
              ← Back to Judges
            </button>
          </Link>
        </div>
      </div>

      {/* MODAL RESULT */}
      <ResultSprint
        isOpen={isModalOpen}
        closeModal={() => setIsModalOpen(false)}
        sprintResults={sprintResults}
      />
    </div>
  )
}

export default JudgesSprintPages
