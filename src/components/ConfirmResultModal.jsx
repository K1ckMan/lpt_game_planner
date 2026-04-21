import { useEffect, useRef, useState } from 'react'
import { getMatchupForBooking } from '../lib/divisionTeams'

function emptySets() {
  return [
    { home: '', away: '' },
    { home: '', away: '' },
    { home: '', away: '' },
  ]
}

export default function ConfirmResultModal({ booking, onClose, onConfirm }) {
  const matchup = getMatchupForBooking(booking)
  const [sets, setSets] = useState(emptySets())
  const [photoPreview, setPhotoPreview] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  function updateSet(index, side, value) {
    setSets((prev) => prev.map((set, i) => (i === index ? { ...set, [side]: value } : set)))
  }

  function handleUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setPhotoPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  async function handleConfirm() {
    setError('')

    if (!matchup) {
      setError('Could not load teams from the divisions file.')
      return
    }

    const allSetsFilled = sets.every((set) => set.home !== '' && set.away !== '')
    if (!allSetsFilled) {
      setError('Please fill all 3 sets for both teams.')
      return
    }

    if (!photoPreview) {
      setError('Please upload a photo.')
      return
    }

    setSaving(true)
    try {
      await onConfirm({
        division: matchup.division,
        homeTeam: matchup.homeTeam,
        awayTeam: matchup.awayTeam,
        sets,
        photoPreview,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const scoreLine = sets.map((set) => `${set.home || '-'}:${set.away || '-'}`).join('  ')

  return (
    <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wide">My Games</p>
          <h2 className="text-lg font-semibold text-gray-900">Confirm Result</h2>
          {matchup ? (
            <p className="text-xs text-gray-500 mt-1">
              {matchup.division} · {matchup.homeTeam.player1} / {matchup.homeTeam.player2} vs {matchup.awayTeam.player1} / {matchup.awayTeam.player2}
            </p>
          ) : (
            <p className="text-xs text-red-600 mt-1">No teams loaded from file.</p>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Set Scores</p>
            {sets.map((set, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-12 text-xs text-gray-500">Set {index + 1}</span>
                <input
                  type="number"
                  min="0"
                  max="7"
                  value={set.home}
                  onChange={(event) => updateSet(index, 'home', event.target.value)}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="0"
                />
                <span className="text-gray-300">:</span>
                <input
                  type="number"
                  min="0"
                  max="7"
                  value={set.away}
                  onChange={(event) => updateSet(index, 'away', event.target.value)}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Photo</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
            {!photoPreview ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600"
              >
                Upload match photo
              </button>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Change photo
              </button>
            )}
          </div>

          {photoPreview && matchup && (
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <div className="relative">
                <img src={photoPreview} alt="Match" className="w-full h-64 object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-r from-black/90 via-[#450d22]/85 to-[#8f2a40]/85 p-4">
                  <div className="inline-flex items-center rounded bg-lime-400/90 text-[10px] font-semibold uppercase tracking-wide text-gray-900 px-2 py-1">
                    {matchup.division}
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div className="text-white">
                      <p className="text-sm font-semibold leading-tight">{matchup.homeTeam.player1}</p>
                      <p className="text-sm font-semibold leading-tight">{matchup.homeTeam.player2}</p>
                      <p className="text-xs text-white/70 mt-1 mb-1">vs</p>
                      <p className="text-sm font-semibold leading-tight">{matchup.awayTeam.player1}</p>
                      <p className="text-sm font-semibold leading-tight">{matchup.awayTeam.player2}</p>
                    </div>
                    <div className="space-y-1.5 shrink-0">
                      {sets.map((set, index) => (
                        <div key={index} className="flex gap-1.5 justify-end">
                          <span className="w-8 h-8 rounded-xl bg-amber-500 text-white text-sm font-bold flex items-center justify-center border border-white/70">
                            {set.home || '-'}
                          </span>
                          <span className="w-8 h-8 rounded-xl bg-transparent text-white text-sm font-bold flex items-center justify-center border border-white/80">
                            {set.away || '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-500">Score: {scoreLine}</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-1 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
