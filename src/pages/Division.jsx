import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import BookGameModal from '../components/BookGameModal'
import PostResultModal from '../components/PostResultModal'
import Footer from '../components/Footer'

const LEAGUE_LABELS = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze' }

const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled' }
const STATUS_CLASS = {
  pending: 'text-amber-700 bg-amber-50',
  confirmed: 'text-emerald-700 bg-emerald-50',
  cancelled: 'text-red-600 bg-red-50',
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
  const [bookingOpponent, setBookingOpponent] = useState(null)
  const [postingMatch, setPostingMatch] = useState(null)
  const [joining, setJoining] = useState(null)

  useEffect(() => {
    loadData()
    const ch = supabase
      .channel(`div-${divisionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, loadTeams)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, loadMatches)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [divisionId])

  useEffect(() => {
    const newUids = teams
      .flatMap((t) => [t.player1_id, t.player2_id])
      .filter((uid) => uid && !fetchedUids.current.has(uid))
    if (!newUids.length) return
    newUids.forEach((uid) => fetchedUids.current.add(uid))
    supabase
      .from('users').select('id, name, surname').in('id', newUids)
      .then(({ data }) => {
        if (data)
          setProfiles((p) => ({ ...p, ...Object.fromEntries(data.map((u) => [u.id, u])) }))
      })
  }, [teams])

  async function loadData() {
    await Promise.all([loadTeams(), loadMatches()])
    setLoading(false)
  }
  async function loadTeams() {
    const { data } = await supabase
      .from('teams').select('id, name, player1_id, player2_id')
      .eq('division_id', divisionId).order('id')
    setTeams(data || [])
  }
  async function loadMatches() {
    const { data } = await supabase
      .from('matches').select('*').eq('division_id', divisionId)
      .order('created_at', { ascending: false })
    setMatches(data || [])
  }

  async function handleJoin(teamId, slot) {
    if (teams.some((t) => t.player1_id === user.uid || t.player2_id === user.uid)) {
      alert('You are already in a team in this division')
      return
    }
    setJoining(`${teamId}-${slot}`)
    const { error } = await supabase
      .from('teams').update({ [`${slot}_id`]: user.uid })
      .eq('id', teamId).is(`${slot}_id`, null)
    if (error) alert('This slot is already taken')
    setJoining(null)
  }

  function playerName(uid) {
    if (!uid) return null
    const p = profiles[uid]
    return p ? `${p.name[0]}.${p.surname}` : '...'
  }

  function teamLabel(name) {
    return name?.replace(/^Team\s*/i, '') ?? ''
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

  const myTeam = teams.find((t) => t.player1_id === user?.uid || t.player2_id === user?.uid)
  const isInDivision = !!myTeam

  const activeMatches = matches.filter((m) => m.status !== 'cancelled')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="max-w-5xl w-full mx-auto px-4 py-8 grow">

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
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="px-5 py-2.5">#</th>
                <th className="px-5 py-2.5">#1</th>
                <th className="px-5 py-2.5">#2</th>
                <th className="px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {teams.map((team) => {
                const full = team.player1_id && team.player2_id
                const isMyTeam = myTeam?.id === team.id
                const alreadyBooked = myTeam && activeMatches.some(
                  (m) =>
                    (m.home_team_id === myTeam.id && m.away_team_id === team.id) ||
                    (m.home_team_id === team.id && m.away_team_id === myTeam.id)
                )
                const canBook = isInDivision && !isMyTeam && full && !alreadyBooked

                return (
                  <tr key={team.id} className={`hover:bg-gray-50/50 ${isMyTeam ? 'bg-emerald-50/30' : ''}`}>
                    <td className="px-5 py-3 font-medium text-gray-800">{teamLabel(team.name)}</td>
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
                        >+ Join</button>
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
                        >+ Join</button>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {isMyTeam ? (
                        <span className="text-xs text-emerald-600 font-medium">Your team</span>
                      ) : canBook ? (
                        <button
                          onClick={() => setBookingOpponent(team)}
                          className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                        >
                          Book Game
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">
                          {!full ? 'Incomplete' : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Booked games */}
        {matches.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="font-medium text-gray-800">Scheduled Games</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {matches.map((m) => {
                const home = teams.find((t) => t.id === m.home_team_id)
                const away = teams.find((t) => t.id === m.away_team_id)
                const dateStr = m.date ? m.date.split('-').reverse().join('.') : ''
                return (
                  <div key={m.id} className="px-5 py-3">
                    <div className="flex items-start gap-2">
                      <div>
                        <p className="text-xs text-gray-800">{playerName(home?.player1_id)}</p>
                        <p className="text-xs text-gray-800">{playerName(home?.player2_id)}</p>
                      </div>
                      <span className="text-xs text-gray-300 pt-0.5 shrink-0">vs</span>
                      <div className="flex-1">
                        <p className="text-xs text-gray-800">{playerName(away?.player1_id)}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-800">{playerName(away?.player2_id)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${STATUS_CLASS[m.status] || ''}`}>
                            {STATUS_LABEL[m.status] || m.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">{dateStr} · {m.time}</span>
                      {m.status === 'confirmed' && (
                        <button
                          onClick={() => setPostingMatch(m)}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          Post Result →
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {postingMatch && (
        <PostResultModal
          match={postingMatch}
          homeTeam={teams.find((t) => t.id === postingMatch.home_team_id)}
          awayTeam={teams.find((t) => t.id === postingMatch.away_team_id)}
          profiles={profiles}
          onClose={() => setPostingMatch(null)}
        />
      )}

      {bookingOpponent && myTeam && (
        <BookGameModal
          divisionId={divisionId}
          myTeam={myTeam}
          opponents={[bookingOpponent]}
          onClose={() => setBookingOpponent(null)}
          onBooked={loadMatches}
        />
      )}
      <Footer />
    </div>
  )
}
