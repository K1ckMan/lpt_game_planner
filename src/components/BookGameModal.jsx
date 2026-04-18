import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const ALL_SLOTS = [
  '08:00','09:00','10:00','11:00','12:00',
  '14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00',
]

function getMockSlots(date) {
  if (!date) return []
  const seed = parseInt(date.replace(/-/g, ''))
  return ALL_SLOTS.filter((_, i) => (seed + i * 7) % 3 !== 0)
}

export default function BookGameModal({ divisionId, myTeam, opponents, profiles = {}, onClose, onBooked }) {
  const { user } = useAuth()
  const [awayTeamId, setAwayTeamId] = useState(opponents.length === 1 ? opponents[0].id : '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function pName(uid) {
    if (!uid) return ''
    const p = profiles[uid]
    return p ? `${p.name[0]}.${p.surname}` : '...'
  }

  function teamPlayers(team) {
    return [team?.player1_id, team?.player2_id].filter(Boolean).map(pName).join(' / ')
  }

  const awayTeam = opponents.find((t) => t.id === awayTeamId)
  const slots = getMockSlots(date)
  const today = new Date().toISOString().split('T')[0]

  async function handleBook() {
    if (!awayTeamId || !date || !time) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError('')
    try {
      const requiredPlayers = [
        myTeam.player1_id, myTeam.player2_id,
        awayTeam.player1_id, awayTeam.player2_id,
      ].filter(Boolean)

      const { data: match, error: err } = await supabase
        .from('matches')
        .insert({
          division_id: divisionId,
          home_team_id: myTeam.id,
          away_team_id: awayTeamId,
          date, time,
          status: 'pending',
          booked_by: user.uid,
          confirmed_by: [user.uid],
          required_players: requiredPlayers,
        })
        .select().single()
      if (err) throw err

      const dateFormatted = date.split('-').reverse().join('.')
      const message = `New game: ${myTeam.name} vs ${awayTeam.name} — ${dateFormatted} at ${time}. Please confirm.`
      const others = requiredPlayers.filter((uid) => uid !== user.uid)
      if (others.length > 0) {
        await supabase.from('notifications').insert(
          others.map((uid) => ({ user_id: uid, match_id: match.id, division_id: divisionId, message, read: false }))
        )
      }
      onBooked?.()
      onClose()
    } catch {
      setError('Booking failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Book Game</h2>
          <p className="text-xs text-gray-400">{pName(myTeam.player1_id)}</p>
          <p className="text-xs text-gray-400">{pName(myTeam.player2_id)}</p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

          {/* Opponent — only shown if more than one unplayed */}
          {opponents.length > 1 && (
            <div>
              <label className="block text-xs text-gray-500 mb-2">Opponent</label>
              <div className="flex flex-wrap gap-2">
                {opponents.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setAwayTeamId(t.id)}
                    className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                      awayTeamId === t.id
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-gray-200 text-gray-700 hover:border-emerald-400'
                    }`}
                  >
                    {teamPlayers(t)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {opponents.length === 1 && (
            <div className="text-sm text-gray-500">
              <p className="text-xs mb-0.5">vs</p>
              <p className="font-medium text-gray-800">{pName(opponents[0].player1_id)}</p>
              <p className="font-medium text-gray-800">{pName(opponents[0].player2_id)}</p>
            </div>
          )}

          <div className="overflow-hidden">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <div className="overflow-hidden rounded border border-gray-200 focus-within:ring-1 focus-within:ring-emerald-500">
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => { setDate(e.target.value); setTime('') }}
                className="w-full min-w-0 block appearance-none px-3 py-2 text-sm focus:outline-none bg-white"
              />
            </div>
          </div>

          {date && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available time <span className="text-gray-400 font-normal text-xs">(Playtomic)</span>
              </label>
              {slots.length === 0 ? (
                <p className="text-sm text-gray-400">No available slots</p>
              ) : (
                <div className="grid grid-cols-5 gap-1.5">
                  {slots.map((s) => (
                    <button
                      key={s}
                      onClick={() => setTime(s)}
                      className={`py-1.5 text-xs rounded border transition-colors ${
                        time === s
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'border-gray-200 text-gray-700 hover:border-emerald-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleBook}
            disabled={loading || !awayTeamId || !date || !time}
            className="flex-1 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Booking...' : 'Book Game'}
          </button>
        </div>
      </div>
    </div>
  )
}
