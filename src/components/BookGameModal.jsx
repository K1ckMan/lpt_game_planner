import { useState } from 'react'
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

export default function BookGameModal({ divisionId, homeTeam, awayTeam, onClose, onBooked }) {
  const { user } = useAuth()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const slots = getMockSlots(date)
  const today = new Date().toISOString().split('T')[0]

  async function handleBook() {
    if (!date || !time) {
      setError('Please select a date and time')
      return
    }
    setLoading(true)
    setError('')
    try {
      const requiredPlayers = [
        homeTeam.player1_id,
        homeTeam.player2_id,
        awayTeam.player1_id,
        awayTeam.player2_id,
      ].filter(Boolean)

      const { data: match, error: matchErr } = await supabase
        .from('matches')
        .insert({
          division_id: divisionId,
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
          date,
          time,
          status: 'pending',
          booked_by: user.uid,
          confirmed_by: [user.uid],
          required_players: requiredPlayers,
        })
        .select()
        .single()

      if (matchErr) throw matchErr

      const dateFormatted = date.split('-').reverse().join('.')
      const message = `New game: ${homeTeam.name} vs ${awayTeam.name} — ${dateFormatted} at ${time}. Please confirm your participation.`

      const otherPlayers = requiredPlayers.filter((uid) => uid !== user.uid)
      if (otherPlayers.length > 0) {
        await supabase.from('notifications').insert(
          otherPlayers.map((uid) => ({
            user_id: uid,
            match_id: match.id,
            division_id: divisionId,
            message,
            read: false,
          }))
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
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Book Game</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {homeTeam.name} <span className="text-gray-300 mx-1">vs</span> {awayTeam.name}
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => { setDate(e.target.value); setTime('') }}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {date && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available time{' '}
                <span className="text-gray-400 font-normal text-xs">(Playtomic)</span>
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
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-200 text-gray-600 rounded text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleBook}
            disabled={loading || !date || !time}
            className="flex-1 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Booking...' : 'Book Game'}
          </button>
        </div>
      </div>
    </div>
  )
}
