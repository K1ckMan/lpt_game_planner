import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled' }
const STATUS_CLASS = {
  pending:   'text-amber-700 bg-amber-50',
  confirmed: 'text-emerald-700 bg-emerald-50',
  cancelled: 'text-red-600 bg-red-50',
}

function getUpcomingSlots(weeks = 5) {
  const slots = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let w = 0; w < weeks; w++) {
    const d = new Date(today)
    const daysUntilTuesday = (2 - d.getDay() + 7) % 7 || 7
    d.setDate(d.getDate() + daysUntilTuesday + w * 7)
    const dateStr = d.toISOString().split('T')[0]
    const seed = parseInt(dateStr.replace(/-/g, ''))
    const allTimes = ['17:00', '18:00', '19:00', '20:00', '21:00']
    const times = allTimes.filter((_, i) => (seed + i * 3) % 5 !== 0)
    slots.push({ date: dateStr, times })
  }
  return slots
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
}

function addHalfHours(time, count) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + count * 30
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export default function Home() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)   // { date, time }
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(null)

  const upcomingSlots = getUpcomingSlots(5)

  useEffect(() => { loadBookings() }, [])

  async function loadBookings() {
    const { data } = await supabase
      .from('simple_bookings')
      .select('*')
      .eq('user_id', user.uid)
      .order('date', { ascending: false })
    setBookings(data || [])
    setLoading(false)
  }

  async function confirmBook() {
    if (!selected) return
    setSubmitting(true)
    const { error } = await supabase.from('simple_bookings').insert({
      user_id: user.uid,
      date: selected.date,
      time: selected.time,
      status: 'pending',
    })
    if (!error) await loadBookings()
    setSelected(null)
    setSubmitting(false)
  }

  async function cancelBooking(id) {
    setCancelling(id)
    await supabase.from('simple_bookings').update({ status: 'cancelled' }).eq('id', id)
    await loadBookings()
    setCancelling(null)
  }

  function isBooked(date, time) {
    return bookings.some((b) => b.date === date && b.time === time && b.status !== 'cancelled')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="max-w-lg w-full mx-auto px-4 py-6 grow">

        <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Available</h2>

        <div className="space-y-3 mb-8">
          {upcomingSlots.map(({ date, times }) => {
            const isSelectedDate = selected?.date === date
            return (
              <div key={date} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">{formatDate(date)}</p>
                </div>

                <div className="px-4 py-3 flex flex-wrap gap-2">
                  {times.map((time) => {
                    const booked = isBooked(date, time)
                    const isActive = selected?.date === date && selected?.time === time
                    return (
                      <button
                        key={time}
                        onClick={() => {
                          if (booked) return
                          setSelected(isActive ? null : { date, time })
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                          booked
                            ? 'border-gray-100 text-gray-300 bg-gray-50 cursor-default'
                            : isActive
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'border-gray-200 text-gray-700 hover:border-emerald-400'
                        }`}
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>

                {isSelectedDate && (
                  <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-emerald-800">
                        {selected.time} – {addHalfHours(selected.time, 3)}
                      </p>
                      <p className="text-xs text-emerald-600">1.5h · Pending confirmation</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setSelected(null)}
                        className="px-3 py-1.5 text-xs border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmBook}
                        disabled={submitting}
                        className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {submitting ? '...' : 'Book'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {!loading && bookings.length > 0 && (
          <>
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">History</h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {bookings.map((b) => {
                const dateStr = b.date ? b.date.split('-').reverse().join('.') : ''
                const canCancel = b.status !== 'cancelled'
                return (
                  <div key={b.id} className="px-4 py-3 flex items-center justify-between gap-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm text-gray-800">{dateStr} · {b.time} – {addHalfHours(b.time, 3)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded ${STATUS_CLASS[b.status] || ''}`}>
                        {STATUS_LABEL[b.status] || b.status}
                      </span>
                      {canCancel && (
                        <button
                          onClick={() => cancelBooking(b.id)}
                          disabled={cancelling === b.id}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                        >
                          {cancelling === b.id ? '...' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

      </div>
      <Footer />
    </div>
  )
}
