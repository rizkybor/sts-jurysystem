'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ResultSlalom from '@/components/ResultSlalom'

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

  const toastId = useRef(1)

  const gateOptions = useMemo(() => {
    return getSlalomPositionsFromAssignments(assignments, eventId)
  }, [assignments, eventId])

  const penalties = [0, 5, 50]

  // Fetch event detail
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

  // Fetch assignments
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
        const list = assignmentsData.data || []
        setAssignments(list)
      } catch (err) {
        console.error(err)
      }
    }
    fetchData()
  }, [eventId])

  // Fetch teams berdasarkan kategori
  useEffect(() => {
    if (!eventId || !selectedCategory) return

    const fetchTeams = async () => {
      try {
        const [initialId, divisionId, raceId] = selectedCategory.split('|')
        const res = await fetch(
          `/api/events/${eventId}/judge-tasks?initialId=${initialId}&divisionId=${divisionId}&raceId=${raceId}&eventName=SLALOM`
        )
        const data = await res.json()
        if (res.ok && data?.success) setTeams(data.teams || [])
        else setTeams([])
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

  const handleCategoryChange = value => {
    setSelectedCategory(value)
    setSelectedTeam('')
    setTeams([])
    setLoadingTeams(true)
  }

  const handleSubmit = e => {
    e.preventDefault()
    if (
      !selectedCategory ||
      !selectedTeam ||
      !selectedGate ||
      selectedPenalty === null
    ) {
      alert('⚠️ Please complete all selections.')
      return
    }

    const formData = {
      category: selectedCategory,
      team: selectedTeam,
      gate: selectedGate,
      penalty: selectedPenalty,
      penaltiesDetail: clickedCircles,
    }
    setResultData(formData)
    alert('📊 Submitted Data:\n\n' + JSON.stringify(formData, null, 2))
  }

  const handleClick = position => {
    setClickedCircles(prev => ({
      ...prev,
      [position]: !prev[position],
    }))
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8'>
      <div className='w-full max-w-5xl bg-white p-6 rounded-2xl shadow-lg'>
        {eventDetail && (
          <div className='mb-4 space-y-1 bg-gray-100 p-4 rounded-lg'>
            <div className='font-semibold'>{eventDetail.eventName}</div>
            <div className='text-sm text-gray-600'>
              {new Date(eventDetail.startDateEvent).toLocaleDateString(
                'id-ID',
                { day: '2-digit', month: 'long', year: 'numeric' }
              )}{' '}
              –{' '}
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
        <div className='mb-5'>
          <h1 className='text-2xl font-bold text-gray-800'>
            Judges {gateOptions.join(', ') || ''}
          </h1>
          <small className='text-center'>Race Number : Slalom Race</small>
        </div>
        <form onSubmit={handleSubmit} className='space-y-6'>
          <div className='flex flex-col-reverse md:flex-row gap-8'>
            <div className='w-full md:w-1/2 space-y-6'>
              {/* SELECT CATEGORY */}
              <div>
                {loadingEvent ? (
                  <p className='text-gray-500 text-sm'>Loading categories...</p>
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
                <label className='block text-gray-700 mb-2'>Select Team:</label>
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
                      <option key={team._id} value={team._id}>
                        {team.nameTeam} (BIB {team.bibTeam})
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
              </div>

              {/* SELECT GATE */}
              <div>
                <label className='block text-gray-700 mb-2'>Select Gate:</label>
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
                className='w-full py-3 bg-blue-500 text-white rounded-lg font-semibold shadow-md hover:bg-blue-600 transition duration-300'>
                Submit →
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
                    ← Back
                  </button>
                </Link>
              </div>
            </div>

            {/* Boat view kanan */}
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
          }}
        />
      </div>
    </div>
  )
}

export default JudgesSlalomPage
