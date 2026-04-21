import { useEffect, useMemo, useRef, useState } from 'react'
import { DIVISION_TEAMS, getMatchupForBooking } from '../lib/divisionTeams'

function emptySets() {
  return [
    { home: '', away: '' },
    { home: '', away: '' },
    { home: '', away: '' },
  ]
}

function teamLabel(team) {
  if (!team) return ''
  return `${team.player1} / ${team.player2}`
}

function teamKey(team) {
  if (!team) return ''
  return `${team.player1}|${team.player2}`
}

function matchesTeam(team, query) {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  return teamLabel(team).toLowerCase().includes(q)
}

function findTeamIndex(teams, team) {
  if (!team || !Array.isArray(teams)) return -1
  return teams.findIndex((item) => teamKey(item) === teamKey(team))
}

export default function ConfirmResultModal({ booking, onClose, onConfirm }) {
  const defaultMatchup = getMatchupForBooking(booking)
  const divisions = Object.keys(DIVISION_TEAMS)

  const [selectedDivision, setSelectedDivision] = useState(defaultMatchup?.division || divisions[0] || '')
  const [homeQuery, setHomeQuery] = useState('')
  const [awayQuery, setAwayQuery] = useState('')
  const [homeTeam, setHomeTeam] = useState(defaultMatchup?.homeTeam || null)
  const [awayTeam, setAwayTeam] = useState(defaultMatchup?.awayTeam || null)
  const [sets, setSets] = useState(emptySets())
  const [photoPreview, setPhotoPreview] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const divisionTeams = useMemo(() => DIVISION_TEAMS[selectedDivision] || [], [selectedDivision])

  const homeOptions = useMemo(
    () => divisionTeams.filter((team) => matchesTeam(team, homeQuery)).slice(0, 8),
    [divisionTeams, homeQuery]
  )

  const awayOptions = useMemo(
    () => divisionTeams
      .filter((team) => teamKey(team) !== teamKey(homeTeam))
      .filter((team) => matchesTeam(team, awayQuery))
      .slice(0, 8),
    [divisionTeams, homeTeam, awayQuery]
  )

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    if (!selectedDivision) return

    const teams = DIVISION_TEAMS[selectedDivision] || []

    setHomeTeam((prev) => {
      const currentIndex = findTeamIndex(teams, prev)
      return currentIndex >= 0 ? teams[currentIndex] : teams[0] || null
    })

    setAwayTeam((prev) => {
      const currentIndex = findTeamIndex(teams, prev)
      if (currentIndex >= 0) return teams[currentIndex]
      const fallback = teams.find((team) => teamKey(team) !== teamKey(teams[0]))
      return fallback || null
    })
  }, [selectedDivision])

  useEffect(() => {
    if (!homeTeam || !awayTeam) return
    if (teamKey(homeTeam) !== teamKey(awayTeam)) return

    const fallback = divisionTeams.find((team) => teamKey(team) !== teamKey(homeTeam))
    setAwayTeam(fallback || null)
  }, [homeTeam, awayTeam, divisionTeams])

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

    if (!selectedDivision || !homeTeam || !awayTeam) {
      setError('Please select division, your team and opponent team.')
      return
    }

    if (teamKey(homeTeam) === teamKey(awayTeam)) {
      setError('Your team and opponent team must be different.')
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
        division: selectedDivision,
        homeTeam,
        awayTeam,
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
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Division</p>
            <select
              value={selectedDivision}
              onChange={(event) => {
                setSelectedDivision(event.target.value)
                setHomeQuery('')
                setAwayQuery('')
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            >
              {divisions.map((division) => (
                <option key={division} value={division}>{division}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Your Team Search</p>
            <input
              value={homeQuery}
              onChange={(event) => setHomeQuery(event.target.value)}
              placeholder="Search your team"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="max-h-32 overflow-y-auto border border-gray-100 rounded-lg">
              {homeOptions.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-400">No teams found</p>
              ) : (
                homeOptions.map((team) => {
                  const active = teamKey(team) === teamKey(homeTeam)
                  return (
                    <button
                      key={teamKey(team)}
                      onClick={() => setHomeTeam(team)}
                      className={`w-full text-left px-3 py-2 text-sm border-b border-gray-50 last:border-0 ${active ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      {teamLabel(team)}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Opponent Team Search</p>
            <input
              value={awayQuery}
              onChange={(event) => setAwayQuery(event.target.value)}
              placeholder="Search opponent team"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="max-h-32 overflow-y-auto border border-gray-100 rounded-lg">
              {awayOptions.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-400">No teams found</p>
              ) : (
                awayOptions.map((team) => {
                  const active = teamKey(team) === teamKey(awayTeam)
                  return (
                    <button
                      key={teamKey(team)}
                      onClick={() => setAwayTeam(team)}
                      className={`w-full text-left px-3 py-2 text-sm border-b border-gray-50 last:border-0 ${active ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      {teamLabel(team)}
                    </button>
                  )
                })
              )}
            </div>
          </div>

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

          {photoPreview && homeTeam && awayTeam && (
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <div className="relative">
                <img src={photoPreview} alt="Match" className="w-full h-80 object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-[10%] bg-gradient-to-r from-black/90 via-black/80 to-black/85 px-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] text-lime-300 font-semibold uppercase leading-none">{selectedDivision}</p>
                    <p className="text-[10px] text-white/90 truncate leading-none mt-1">
                      {homeTeam.player1} / {homeTeam.player2} vs {awayTeam.player1} / {awayTeam.player2}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {sets.map((set, index) => (
                      <span key={index} className="px-1.5 py-0.5 rounded border border-white/70 text-[10px] font-semibold text-white leading-none">
                        {set.home || '-'}:{set.away || '-'}
                      </span>
                    ))}
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
