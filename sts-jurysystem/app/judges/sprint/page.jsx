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
  const [selectedPosition, setSelectedPosition] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('') // 🔥 ini _id dari team
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sprintResults, setSprintResults] = useState([])
  const [loading, setLoading] = useState(false)

  const [teams, setTeams] = useState([]) // 🔥 ambil dari DB
  const [loadingTeams, setLoadingTeams] = useState(true)

  const penalties = [0, 5, 50]
  const positions = ['Start', 'Finish']

  // ✅ Fetch Teams dari API
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/teams`)
        const data = await res.json()
        if (res.ok && data.success) {
          setTeams(data.teams)
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

  const handleSubmit = async e => {
    e.preventDefault()
    if (!selectedPosition || !selectedTeam || selectedPenalty === null) {
      alert('⚠️ Please select all options before submitting.')
      return
    }

    // Cari teamName dari state teams berdasarkan _id
    const teamName = teams.find(t => t._id === selectedTeam)?.nameTeam || ''

    const formData = {
      position: selectedPosition,
      teamId: selectedTeam,
      teamName,
      penalty: selectedPenalty,
      eventId,
      juryId,
    }

    console.log('📤 Sending:', formData) // 🔍 cek di console browser

    setLoading(true)

    try {
      const res = await fetch('/api/judges/sprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (res.ok) {
        alert('✅ Data submitted successfully!')
        fetchSprintResults()
      } else {
        alert(`❌ Error: ${data.message}`)
      }
    } catch (error) {
      console.error(error)
      alert('❌ Failed to submit data!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8'>
      <div className='w-full max-w-md bg-white p-6 rounded-2xl shadow-lg relative'>
        <h1 className='text-2xl font-bold text-center text-gray-800 mb-6'>
          Sprint Feature
        </h1>

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* POSITION */}
          <div>
            <label className='block text-gray-700 mb-2'>Position:</label>
            <select
              value={selectedPosition}
              onChange={e => setSelectedPosition(e.target.value)}
              className='w-full px-4 py-2 border rounded-lg'
              required>
              <option value='' disabled>
                Select Position
              </option>
              {positions.map((position, index) => (
                <option key={index} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </div>

          {/* LIST TEAMS + PENALTY */}
          <div>
            {teams.map(team => (
              <div key={team._id}>
                {team.nameTeam} → Penalty: {team.result?.penalty || 0}
              </div>
            ))}
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
                    {team.nameTeam} (Bib {team.bibTeam})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* PENALTY BUTTONS */}
          <div className='space-y-2'>
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
                {penalty}
              </button>
            ))}
          </div>

          {/* SUBMIT */}
          <button
            type='submit'
            className='w-full py-3 bg-blue-500 text-white rounded-lg font-semibold shadow-md'
            disabled={loading}>
            {loading ? 'Submitting...' : 'Submit →'}
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
            <button className='text-blue-500 hover:underline'>← Back</button>
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
