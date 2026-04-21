import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ConfirmResultModal from '../components/ConfirmResultModal'

const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled' }
const STATUS_CLASS = {
  pending:   'text-amber-700 bg-amber-50',
  confirmed: 'text-emerald-700 bg-emerald-50',
  cancelled: 'text-red-600 bg-red-50',
}
const RESULT_STORAGE_KEY = 'lpt-game-results-v1'
const MAX_RESULTS_STORAGE_SIZE = 1500000

function slimResult(result) {
  if (!result) return null
  return {
    division: result.division || '',
    homeTeam: result.homeTeam || null,
    awayTeam: result.awayTeam || null,
    sets: Array.isArray(result.sets) ? result.sets : [],
    confirmed_at: result.confirmed_at || null,
  }
}

function readStoredResults() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(RESULT_STORAGE_KEY)
    if (!raw) return {}
    if (raw.length > MAX_RESULTS_STORAGE_SIZE) {
      window.localStorage.removeItem(RESULT_STORAGE_KEY)
      return {}
    }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([bookingId, result]) => [bookingId, slimResult(result)])
        .filter(([, result]) => Boolean(result))
    )
  } catch {
    return {}
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
}

function addMinutes(time, mins) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function resultMessage(result, booking) {
  if (!result) return ''
  const score = (result.sets || []).map((set) => `${set.home}:${set.away}`).join('  ')
  const dateStr = booking?.date ? booking.date.split('-').reverse().join('.') : ''
  const timeStr = booking?.time || ''
  return [
    `🎾 ${result.division || 'Division'}`,
    `${result.homeTeam?.player1 || ''} / ${result.homeTeam?.player2 || ''}`,
    'vs',
    `${result.awayTeam?.player1 || ''} / ${result.awayTeam?.player2 || ''}`,
    `Score: ${score}`,
    `${dateStr} ${timeStr}`.trim(),
  ].filter(Boolean).join('\n')
}

function fileFromDataUrl(dataUrl, fileName) {
  if (!dataUrl || typeof dataUrl !== 'string') return null
  const parts = dataUrl.split(',')
  if (parts.length !== 2) return null
  const match = parts[0].match(/data:(.*?);base64/)
  if (!match) return null
  const mime = match[1] || 'image/png'
  const binary = atob(parts[1])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new File([bytes], fileName, { type: mime })
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = dataUrl
  })
}

async function buildOverlayImageDataUrl(photoDataUrl, result) {
  if (!photoDataUrl || !result) return null

  try {
    const image = await loadImage(photoDataUrl)
    const canvas = document.createElement('canvas')
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    if (!width || !height) return null

    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(image, 0, 0, width, height)

    const barHeight = Math.max(48, Math.round(height * 0.1))
    const y = height - barHeight
    const scoreText = (result.sets || []).map((set) => `${set.home ?? '-'}:${set.away ?? '-'}`).join('  ')
    const matchText = `${result.homeTeam?.player1 || ''} / ${result.homeTeam?.player2 || ''} vs ${result.awayTeam?.player1 || ''} / ${result.awayTeam?.player2 || ''}`

    const gradient = ctx.createLinearGradient(0, y, width, y)
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.92)')
    gradient.addColorStop(1, 'rgba(20, 20, 20, 0.88)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, y, width, barHeight)

    const padding = Math.round(width * 0.02)
    const divisionFont = Math.max(12, Math.round(width * 0.018))
    const lineFont = Math.max(11, Math.round(width * 0.016))
    const scoreFont = Math.max(12, Math.round(width * 0.02))

    ctx.textBaseline = 'top'
    ctx.font = `700 ${divisionFont}px Arial`
    ctx.fillStyle = '#b9f56b'
    ctx.fillText(result.division || 'Division', padding, y + Math.max(4, Math.round(barHeight * 0.08)))

    ctx.font = `600 ${lineFont}px Arial`
    ctx.fillStyle = '#ffffff'
    const textY = y + Math.max(18, Math.round(barHeight * 0.45))
    const textWidthLimit = Math.max(120, Math.round(width * 0.67))
    let trimmedMatchText = matchText
    while (ctx.measureText(trimmedMatchText).width > textWidthLimit && trimmedMatchText.length > 10) {
      trimmedMatchText = `${trimmedMatchText.slice(0, -2)}…`
    }
    ctx.fillText(trimmedMatchText, padding, textY)

    ctx.font = `700 ${scoreFont}px Arial`
    const scoreWidth = ctx.measureText(scoreText).width
    ctx.fillStyle = '#ffffff'
    ctx.fillText(scoreText, width - padding - scoreWidth, y + Math.max(12, Math.round(barHeight * 0.35)))

    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

function ShareModal({ booking, onClose }) {
  const [copied, setCopied] = useState(false)
  const dateStr = booking.date ? booking.date.split('-').reverse().join('.') : ''
  const endTime = addMinutes(booking.time, 90)

  async function handleShare() {
    const text = `🎾 Padel game\n${dateStr} · ${booking.time} – ${endTime}\n${booking.playtomic_link}`
    if (navigator.share) {
      try { await navigator.share({ text }) } catch {}
    } else {
      await navigator.clipboard.writeText(booking.playtomic_link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-lg">
        <div className="px-5 pt-5 pb-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Game confirmed</p>
          <p className="text-base font-semibold text-gray-900">{dateStr} · {booking.time} – {endTime}</p>
          <p className="text-xs text-gray-400 mt-0.5">1.5h · Playtomic</p>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-y border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Game link</p>
          <a href={booking.playtomic_link} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-700 font-medium break-all underline underline-offset-2">
            {booking.playtomic_link}
          </a>
        </div>

        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
            Close
          </button>
          <button
            onClick={handleShare}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [selectedCourt, setSelectedCourt] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(null)
  const [shareBooking, setShareBooking] = useState(null)
  const [confirmBooking, setConfirmBooking] = useState(null)
  const [repostingId, setRepostingId] = useState(null)
  const [resultsByBookingId, setResultsByBookingId] = useState(readStoredResults)
  const [resultPhotosByBookingId, setResultPhotosByBookingId] = useState({})

  useEffect(() => {
    loadBookings()
    loadSlots()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const payload = JSON.stringify(
        Object.fromEntries(
          Object.entries(resultsByBookingId)
            .map(([bookingId, result]) => [bookingId, slimResult(result)])
            .filter(([, result]) => Boolean(result))
        )
      )
      if (payload.length > MAX_RESULTS_STORAGE_SIZE) return
      window.localStorage.setItem(RESULT_STORAGE_KEY, payload)
    } catch {
      // Ignore storage failures on devices with low quota.
    }
  }, [resultsByBookingId])

  async function loadSlots() {
    setSlotsLoading(true)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      const resp = await fetch('/api/playtomic-slots', { signal: controller.signal })
      const json = await resp.json()
      setSlots(json.slots || [])
    } catch {
      setSlots([])
    } finally {
      clearTimeout(timeout)
      setSlotsLoading(false)
    }
  }

  async function loadBookings() {
    const { data } = await supabase
      .from('simple_bookings')
      .select('*')
      .order('date', { ascending: false })
      .order('time', { ascending: false })
    setBookings(data || [])
    setLoading(false)
  }

  async function confirmBook() {
    if (!selected || !selectedCourt) return
    if (isBooked(selected.date, selected.time, selected.courts)) return
    setSubmitting(true)
    const mockLink = `https://app.playtomic.io/booking/${Math.random().toString(36).slice(2, 10)}?court=${encodeURIComponent(selectedCourt.court_id)}`
    const { data } = await supabase
      .from('simple_bookings')
      .insert({
        user_id: user.uid,
        date: selected.date,
        time: selected.time,
        status: 'confirmed',
        playtomic_link: mockLink,
      })
      .select().single()
    await loadBookings()
    setSelected(null)
    setSelectedCourt(null)
    setSubmitting(false)
    if (data) setShareBooking(data)
  }

  async function cancelBooking(id) {
    setCancelling(id)
    const booking = bookings.find((b) => b.id === id)
    const bStart = toMinutes(booking.time)
    const bEnd = bStart + 90
    const bookedCourt = courtIdFromLink(booking.playtomic_link)
    const overlapping = bookings.filter((b) => {
      if (b.user_id !== user.uid || b.date !== booking.date || b.status === 'cancelled') return false
      const sameCourt = !bookedCourt || !courtIdFromLink(b.playtomic_link) || courtIdFromLink(b.playtomic_link) === bookedCourt
      return sameCourt && toMinutes(b.time) < bEnd && toMinutes(b.time) + 90 > bStart
    })
    await Promise.all(
      overlapping.map((b) =>
        supabase.from('simple_bookings').update({ status: 'cancelled' }).eq('id', b.id)
      )
    )
    await loadBookings()
    setCancelling(null)
  }

  function toMinutes(t) {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  function courtIdFromLink(link) {
    try { return new URL(link).searchParams.get('court') } catch { return null }
  }

  function isCourtBooked(date, time, courtId) {
    const slotStart = toMinutes(time)
    const slotEnd = slotStart + 90
    return bookings.some((b) => {
      if (b.date !== date || b.status === 'cancelled') return false
      const bookedCourtId = courtIdFromLink(b.playtomic_link)
      if (bookedCourtId && bookedCourtId !== courtId) return false
      const bStart = toMinutes(b.time)
      const bEnd = bStart + 90
      return slotStart < bEnd && slotEnd > bStart
    })
  }

  function getAvailableCourts(date, time, courts) {
    return courts.filter((c) => !isCourtBooked(date, time, c.court_id))
  }

  function isBooked(date, time, slotCourts) {
    if (!slotCourts?.length) return false
    return getAvailableCourts(date, time, slotCourts).length === 0
  }

  async function handleConfirmResult(bookingId, payload) {
    const { photoPreview, ...resultData } = payload
    setResultsByBookingId((prev) => ({
      ...prev,
      [bookingId]: {
        ...resultData,
        confirmed_at: new Date().toISOString(),
      },
    }))
    if (photoPreview) {
      setResultPhotosByBookingId((prev) => ({
        ...prev,
        [bookingId]: photoPreview,
      }))
    }
  }

  async function repostResultToWhatsApp(booking) {
    const result = resultsByBookingId[booking.id]
    if (!result) return

    const text = resultMessage(result, booking)
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    const photoPreview = resultPhotosByBookingId[booking.id] || result.photoPreview
    const overlayPhotoPreview = await buildOverlayImageDataUrl(photoPreview, result)
    const photoFile = fileFromDataUrl(overlayPhotoPreview || photoPreview, `match-result-${booking.id}.png`)

    setRepostingId(booking.id)
    try {
      if (
        photoFile &&
        typeof navigator !== 'undefined' &&
        navigator.share &&
        navigator.canShare?.({ files: [photoFile] })
      ) {
        try {
          await navigator.share({ text, files: [photoFile] })
          return
        } catch {
          // Fall back to direct WhatsApp link if user cancels or share fails.
        }
      }
      window.open(shareUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setRepostingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="max-w-lg w-full mx-auto px-4 py-6 grow">

        <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Available</h2>

        {slotsLoading ? (
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-6 text-center text-sm text-gray-400 mb-8">
            Checking Playtomic...
          </div>
        ) : slots.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-6 text-center text-sm text-gray-400 mb-8">
            No available slots found
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {slots.map(({ date, times }) => (
              <div key={date} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">{formatDate(date)}</p>
                </div>

                {times.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-gray-400">No slots this day</p>
                ) : (
                  <div className="px-4 py-3 flex flex-wrap gap-2">
                    {times.map(({ time, courts }) => {
                      const booked = isBooked(date, time, courts)
                      const isActive = selected?.date === date && selected?.time === time
                      return (
                        <button
                          key={time}
                          onClick={() => {
                            if (booked) return
                            if (isActive) { setSelected(null); setSelectedCourt(null) }
                            else { const avail = getAvailableCourts(date, time, courts); setSelected({ date, time, courts: avail }); setSelectedCourt(avail.length === 1 ? avail[0] : null) }
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
                )}

                {selected?.date === date && (
                  <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-emerald-800">
                          {selected.time} – {addMinutes(selected.time, 90)}
                        </p>
                        <p className="text-xs text-emerald-600">1.5h</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => { setSelected(null); setSelectedCourt(null) }} className="px-3 py-1.5 text-xs border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100">
                          Cancel
                        </button>
                        <button onClick={confirmBook} disabled={submitting || !selectedCourt} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                          {submitting ? '...' : 'Book'}
                        </button>
                      </div>
                    </div>

                    {selected.courts?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selected.courts.map((c, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedCourt(c)}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                              selectedCourt?.court_id === c.court_id
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {c.court_name} · {c.price}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && (() => {
          const today = new Date().toISOString().split('T')[0]
          const myUpcoming = bookings.filter((b) => b.user_id === user.uid && b.status !== 'cancelled' && b.date >= today)
          const history = bookings.filter((b) => b.date < today || b.status === 'cancelled')

          return (
            <>
              {myUpcoming.length > 0 && (
                <>
                  <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">My Games</h2>
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
                    {myUpcoming.map((b) => {
                      const endTime = addMinutes(b.time, 90)
                      const result = resultsByBookingId[b.id]
                      const scoreSummary = result?.sets?.map((set) => `${set.home}:${set.away}`).join('  ')
                      return (
                        <div key={b.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{formatDate(b.date)}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{b.time} – {endTime} · 1.5h</p>
                              {result && (
                                <p className="text-xs text-emerald-700 mt-1">Result: {scoreSummary}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <div className="flex items-center gap-2">
                                {result ? (
                                  <>
                                    <span className="text-xs text-emerald-700 font-medium">Confirmed</span>
                                    <button
                                      onClick={() => setConfirmBooking(b)}
                                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                      Edit
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => setConfirmBooking(b)}
                                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                  >
                                    Confirm
                                  </button>
                                )}
                                <button
                                  onClick={() => cancelBooking(b.id)}
                                  disabled={cancelling === b.id}
                                  className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                                >
                                  {cancelling === b.id ? '...' : 'Cancel'}
                                </button>
                              </div>

                              {(b.playtomic_link || result) && (
                                <div className="flex items-center gap-2">
                                  {b.playtomic_link && (
                                    <button
                                      onClick={() => setShareBooking(b)}
                                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                    >
                                      Share →
                                    </button>
                                  )}
                                  {result && (
                                    <button
                                      onClick={() => repostResultToWhatsApp(b)}
                                      disabled={repostingId === b.id}
                                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:text-gray-300 disabled:cursor-not-allowed"
                                    >
                                      {repostingId === b.id ? '...' : 'Repost WhatsApp'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {history.length > 0 && (
                <>
                  <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">History</h2>
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {history.map((b) => {
                      const dateStr = b.date ? b.date.split('-').reverse().join('.') : ''
                      const endTime = addMinutes(b.time, 90)
                      const isOwn = b.user_id === user.uid
                      return (
                        <div key={b.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-gray-800">{dateStr} · {b.time} – {endTime}</p>
                            <div className="flex items-center gap-2 shrink-0">
                              {isOwn && b.playtomic_link && b.status !== 'cancelled' && (
                                <button
                                  onClick={() => setShareBooking(b)}
                                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                >
                                  Share →
                                </button>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_CLASS[b.status] || ''}`}>
                                {STATUS_LABEL[b.status] || b.status}
                              </span>
                              {isOwn && b.status !== 'cancelled' && (
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
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          )
        })()}

      </div>
      <Footer />

      {shareBooking && (
        <ShareModal booking={shareBooking} onClose={() => setShareBooking(null)} />
      )}

      {confirmBooking && (
        <ConfirmResultModal
          booking={confirmBooking}
          initialResult={resultsByBookingId[confirmBooking.id] || null}
          initialPhotoPreview={resultPhotosByBookingId[confirmBooking.id] || ''}
          onClose={() => setConfirmBooking(null)}
          onConfirm={(payload) => handleConfirmResult(confirmBooking.id, payload)}
        />
      )}
    </div>
  )
}
