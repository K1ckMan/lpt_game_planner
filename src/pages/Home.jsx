import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled' }
const STATUS_CLASS = {
  pending: 'text-amber-700 bg-amber-50',
  confirmed: 'text-emerald-700 bg-emerald-50',
  cancelled: 'text-red-600 bg-red-50',
}

// Mock: next N Tuesdays with Playtomic-style slots
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

export default function Home() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(null) // { date, time }

  const upcomingSlots = getUpcomingSlots(5)

  useEffect(() => {
    loadBookings()
  }, [])

  async function loadBookings() {
    const { data } = await supabase
      .from('simple_bookings')
      .select('*')
      .eq('user_id', user.uid)
      .order('date', { ascending: false })
    setBookings(data || [])
    setLoading(false)
  }

  async function handleBook(date, time) {
    setBooking({ date, time })
    const { error } = await supabase.from('simple_bookings').insert({
      user_id: user.uid,
      date,
      time,
      status: 'pending',
    })
    if (!error) await loadBookings()
    setBooking(null)
  }

  function isBooked(date, time) {
    return bookings.some((b) => b.date === date && b.time === time && b.status !== 'cancelled')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="max-w-lg w-full mx-auto px-4 py-6 grow">

        {/* Available slots */}
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Available</h2>
        <div className="space-y-3 mb-8">
          {upcomingSlots.map(({ date, times }) => (
            <div key={date} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">{formatDate(date)}</p>
              </div>
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {times.map((time) => {
                  const booked = isBooked(date, time)
                  const busy = booking?.date === date && booking?.time === time
                  return (
                    <button
                      key={time}
                      onClick={() => !booked && handleBook(date, time)}
                      disabled={booked || !!booking}
                      className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                        booked
                          ? 'border-gray-100 text-gray-300 bg-gray-50 cursor-default'
                          : busy
                          ? 'border-emerald-200 text-emerald-400 bg-emerald-50'
                          : 'border-gray-200 text-gray-700 hover:border-emerald-500 hover:text-emerald-600'
                      }`}
                    >
                      {time}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* History */}
        {!loading && bookings.length > 0 && (
          <>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">History</h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {bookings.map((b) => {
                const dateStr = b.date ? b.date.split('-').reverse().join('.') : ''
                return (
                  <div key={b.id} className="px-4 py-3 flex items-center justify-between border-b border-gray-50 last:border-0">
                    <p className="text-sm text-gray-800">{dateStr} · {b.time}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_CLASS[b.status] || ''}`}>
                      {STATUS_LABEL[b.status] || b.status}
                    </span>
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
