import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import BookGameModal from '../components/BookGameModal'

const LEAGUE_LABELS = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze' }

const STATUS_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
}

const STATUS_CLASS = {
  pending: 'text-amber-700 bg-amber-50',
  confirmed: 'text-emerald-700 bg-emerald-50',
  cancelled: 'text-red-600 bg-red-50',
}

function generateSchedule(teams) {
  const pairs = []
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      pairs.push({ home: teams[i], away: teams[j] })
    }
  }
  return pairs
}

export default function Division() {
  const { league, division: divNum } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const divisionId = `${league}-${divNum}`
  const fetchedUids = useRef(new Set())

  const [teams, setTeams] = useState([])
  const [profiles, setProfiles] = useState({})
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [bookingPair, setBookingPair] = useState(null) // { home, away }
  const [joining, setJoining] = useState(null)

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel(`div-${divisionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, loadTeams)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, loadMatches)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [divisionId])

  useEffect(() => {
    const newUids = teams
      .flatMap((t) => [t.player1_id, t.player2_id])
      .filter((uid) => uid && !fetchedUids.current.has(uid))
    if (newUids.length === 0) return
    newUids.forEach((uid) => fetchedUids.current.add(uid))
    supabase
      .from('users')
      .select('id, name, surname')
      .in('id', newUids)
      .then(({ data }) => {
        if (data)
          setProfiles((prev) => ({
            ...prev,
            ...Object.fromEntries(data.map((u) => [u.id, u])),
          }))
      })
  }, [teams])

  async function loadData() {
    await Promise.all([loadTeams(), loadMatches()])
    setLoading(false)
  }

  async function loadTeams() {
    const { data } = await supabase
      .from('teams')
      .select('id, name, player1_id, player2_id')
      .eq('division_id', divisionId)
      .order('id')
    setTeams(data || [])
  }

  async function loadMatches() {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('division_id', divisionId)
      .order('created_at', { ascending: false })
    setMatches(data || [])
  }

  async function handleJoin(teamId, slot) {
    const alreadyIn = teams.some(
      (t) => t.player1_id === user.uid || t.player2_id === user.uid
    )
    if (alreadyIn) {
      alert('You are already in a team in this division')
      return
    }
    setJoining(`${teamId}-${slot}`)
    const { error } = await supabase
      .from('teams')
      .update({ [`${slot}_id`]: user.uid })
      .eq('id', teamId)
      .is(`${slot}_id`, null)
    if (error) alert('This slot is already taken')
    setJoining(null)
  }

  function playerName(uid) {
    if (!uid) return null
    const p = profiles[uid]
    return p ? `${p.name} ${p.surname}` : '...'
  }

  function getMatchForPair(homeId, awayId) {
    return matches.find(
      (m) =>
        (m.home_team_id === homeId && m.away_team_id === awayId) ||
        (m.home_team_id === awayId && m.away_team_id === homeId)
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center pt-20">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const myTeamId = teams.find(
    (t) => t.player1_id === user?.uid || t.player2_id === user?.uid
  )?.id

  const isInDivision = !!myTeamId
  const schedule = generateSchedule(teams)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
          <button onClick={() => navigate('/leagues')} className="hover:text-gray-600">Leagues</button>
          <span>/</span>
          <button onClick={() => navigate(`/leagues/${league}`)} className="hover:text-gray-600">
            {LEAGUE_LABELS[league]}
          </button>
          <span>/</span>
          <span className="text-gray-700">Division {divNum}</span>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-6">
          {LEAGUE_LABELS[league]} League — Division {divNum}
        </h1>

        {/* Teams */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-medium text-gray-800">Teams</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="px-5 py-2.5">Team</th>
                  <th className="px-5 py-2.5">Player 1</th>
                  <th className="px-5 py-2.5">Player 2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teams.map((team) => (
                  <tr key={team.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-800">{team.name}</td>
                    <td className="px-5 py-3">
                      {team.player1_id ? (
                        <span className={team.player1_id === user?.uid ? 'text-emerald-600 font-medium' : 'text-gray-700'}>
                          {playerName(team.player1_id)}{team.player1_id === user?.uid && ' (you)'}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleJoin(team.id, 'player1')}
                          disabled={!!joining || isInDivision}
                          className="text-xs px-2.5 py-1 border border-dashed border-gray-300 text-gray-400 rounded hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          + Join
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {team.player2_id ? (
                        <span className={team.player2_id === user?.uid ? 'text-emerald-600 font-medium' : 'text-gray-700'}>
                          {playerName(team.player2_id)}{team.player2_id === user?.uid && ' (you)'}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleJoin(team.id, 'player2')}
                          disabled={!!joining || isInDivision}
                          className="text-xs px-2.5 py-1 border border-dashed border-gray-300 text-gray-400 rounded hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          + Join
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-medium text-gray-800">Schedule</h2>
            <span className="text-xs text-gray-400">{schedule.length} games</span>
          </div>
          <div className="divide-y divide-gray-50">
            {schedule.map(({ home, away }) => {
              const booked = getMatchForPair(home.id, away.id)
              const bothFull = home.player1_id && home.player2_id && away.player1_id && away.player2_id
              const canBook = isInDivision && bothFull && !booked

              return (
                <div key={`${home.id}-${away.id}`} className="px-5 py-3 flex items-center justify-between">
                  <p className="text-sm text-gray-800">
                    <span className={myTeamId === home.id ? 'font-semibold text-emerald-700' : ''}>{home.name}</span>
                    <span className="text-gray-300 mx-2">vs</span>
                    <span className={myTeamId === away.id ? 'font-semibold text-emerald-700' : ''}>{away.name}</span>
                  </p>

                  <div className="flex items-center gap-3">
                    {booked ? (
                      <>
                        <span className="text-xs text-gray-400">
                          {booked.date.split('-').reverse().join('.')} · {booked.time}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${STATUS_CLASS[booked.status] || ''}`}>
                          {STATUS_LABEL[booked.status] || booked.status}
                        </span>
                      </>
                    ) : bothFull ? (
                      canBook ? (
                        <button
                          onClick={() => setBookingPair({ home, away })}
                          className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                        >
                          Book Game
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">Not scheduled</span>
                      )
                    ) : (
                      <span className="text-xs text-gray-300">Teams incomplete</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {bookingPair && (
        <BookGameModal
          divisionId={divisionId}
          homeTeam={bookingPair.home}
          awayTeam={bookingPair.away}
          onClose={() => setBookingPair(null)}
          onBooked={loadMatches}
        />
      )}
    </div>
  )
}
