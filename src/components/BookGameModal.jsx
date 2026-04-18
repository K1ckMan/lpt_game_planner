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

  const awayTeam = opponents.find((t) => t.id === awayTeamId)
  const slots = getMockSlots(date)
  const today = new Date().toISOString().split('T')[0]

  async function handleBook() {
    if (!awayTeamId || !date || !time) { setError('Please fill in all fields'); return }
    setLoading(true); setError('')
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
      onBooked?.(); onClose()
    } catch {
      setError('Booking failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-lg">

        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Book Game</p>

          {/* Matchup */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">{pName(myTeam.player1_id)}</p>
              <p className="text-sm font-semibold text-gray-800">{pName(myTeam.player2_id)}</p>
            </div>
            <p className="text-xs text-gray-300 font-medium px-1">vs</p>
            {opponents.length === 1 ? (
              <div className="flex-1 text-right">
                <p className="text-sm font-semibold text-gray-800">{pName(opponents[0].player1_id)}</p>
                <p className="text-sm font-semibold text-gray-800">{pName(opponents[0].player2_id)}</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-wrap gap-1.5 justify-end">
                {opponents.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setAwayTeamId(t.id)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      awayTeamId === t.id
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-gray-200 text-gray-600 hover:border-emerald-400'
                    }`}
                  >
                    {pName(t.player1_id)} / {pName(t.player2_id)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

          <div>
            <p className="text-xs text-gray-400 mb-1.5">Date</p>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => { setDate(e.target.value); setTime('') }}
              className="block w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            />
          </div>

          {date && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Time</p>
              {slots.length === 0 ? (
                <p className="text-sm text-gray-400">No available slots</p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {slots.map((s) => (
                    <button
                      key={s}
                      onClick={() => setTime(s)}
                      className={`py-2 text-xs rounded-lg border transition-colors ${
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

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleBook}
            disabled={loading || !awayTeamId || !date || !time}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Booking...' : 'Book Game'}
          </button>
        </div>

      </div>
    </div>
  )
}
