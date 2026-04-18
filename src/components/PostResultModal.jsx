import { useState, useEffect, useRef } from 'react'

export default function PostResultModal({ match, homeTeam, awayTeam, profiles, onClose }) {
  const [sets, setSets] = useState([
    { home: '', away: '' },
    { home: '', away: '' },
    { home: '', away: '' },
  ])
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function pName(uid) {
    if (!uid) return ''
    const p = profiles[uid]
    return p ? `${p.name[0]}.${p.surname}` : ''
  }

  function setScore(i, side, val) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, [side]: val } : s)))
  }

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function buildMessage() {
    const hp = [homeTeam?.player1_id, homeTeam?.player2_id].filter(Boolean).map(pName).join(' / ')
    const ap = [awayTeam?.player1_id, awayTeam?.player2_id].filter(Boolean).map(pName).join(' / ')
    const scores = sets
      .filter((s) => s.home !== '' && s.away !== '')
      .map((s) => `${s.home}:${s.away}`)
      .join('  ')
    const dateStr = match.date ? match.date.split('-').reverse().join('.') : ''
    return `${hp} vs ${ap}\n${scores}\n${dateStr} ${match.time}`
  }

  async function handlePost() {
    const message = buildMessage()
    if (photo && navigator.canShare?.({ files: [photo] })) {
      try {
        await navigator.share({ text: message, files: [photo] })
        onClose()
        return
      } catch {}
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
    onClose()
  }

  const filledSets = sets.filter((s) => s.home !== '' && s.away !== '').length

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Post Result</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {[homeTeam?.player1_id, homeTeam?.player2_id].filter(Boolean).map(pName).join(' / ')}
            {' vs '}
            {[awayTeam?.player1_id, awayTeam?.player2_id].filter(Boolean).map(pName).join(' / ')}
          </p>
        </div>

        <div className="px-5 py-4 space-y-3">
          {sets.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-9">Set {i + 1}</span>
              <input
                type="number" min="0" max="7" value={s.home}
                onChange={(e) => setScore(i, 'home', e.target.value)}
                placeholder="0"
                className="w-14 border border-gray-200 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-gray-300 text-sm">:</span>
              <input
                type="number" min="0" max="7" value={s.away}
                onChange={(e) => setScore(i, 'away', e.target.value)}
                placeholder="0"
                className="w-14 border border-gray-200 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {i === 2 && <span className="text-xs text-gray-300">optional</span>}
            </div>
          ))}

          <input type="file" accept="image/*" ref={fileRef} onChange={handlePhoto} className="hidden" />
          {photoPreview ? (
            <div className="relative mt-1">
              <img src={photoPreview} alt="" className="w-full h-36 object-cover rounded" />
              <button
                onClick={() => { setPhoto(null); setPhotoPreview(null) }}
                className="absolute top-1.5 right-1.5 bg-white/90 rounded-full w-6 h-6 flex items-center justify-center text-xs text-gray-600 shadow"
              >✕</button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current.click()}
              className="w-full border border-dashed border-gray-300 rounded py-2.5 text-sm text-gray-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
            >
              + Add Photo
            </button>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={filledSets < 2}
            className="flex-1 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Post to WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
