import { useEffect, useMemo, useRef, useState } from 'react'
import { DIVISION_TEAMS, getMatchupForBooking } from '../lib/divisionTeams'

function emptySets() {
  return [
    { home: '', away: '' },
    { home: '', away: '' },
    { home: '', away: '' },
  ]
}

function normalizeSets(rawSets) {
  const defaults = emptySets()
  if (!Array.isArray(rawSets)) return defaults
  return defaults.map((set, index) => {
    const source = rawSets[index] || {}
    return {
      ...set,
      home: source.home === 0 || source.home ? String(source.home) : '',
      away: source.away === 0 || source.away ? String(source.away) : '',
    }
  })
}

function isSetFilled(set) {
  return set?.home !== '' && set?.away !== ''
}

function hasAnySetValue(set) {
  return set?.home !== '' || set?.away !== ''
}

function teamLabel(team) {
  if (!team) return ''
  if (team.label) return team.label
  return [team.player1, team.player2].filter(Boolean).join(' / ')
}

function teamKey(team) {
  if (!team) return ''
  if (team.id) return team.id
  return team.label || `${team.player1 || ''}|${team.player2 || ''}`
}

function findMatchingTeam(list, candidate) {
  if (!candidate || !Array.isArray(list)) return null
  return list.find((item) => teamKey(item) === teamKey(candidate)) || null
}

export default function ConfirmResultModal({
  booking,
  onClose,
  onConfirm,
  initialResult = null,
  initialPhotoPreview = '',
}) {
  const defaultMatchup = getMatchupForBooking(booking)
  const divisions = Object.keys(DIVISION_TEAMS)

  const initialDivision = initialResult?.division || defaultMatchup?.division || divisions[0] || ''
  const initialGroups = Object.keys(DIVISION_TEAMS[initialDivision] || {})
  const initialGroup = initialResult?.group || defaultMatchup?.group || initialGroups[0] || ''
  const initialTeams = DIVISION_TEAMS[initialDivision]?.[initialGroup] || []
  const initialHomeTeam =
    findMatchingTeam(initialTeams, initialResult?.homeTeam) ||
    findMatchingTeam(initialTeams, defaultMatchup?.homeTeam) ||
    initialTeams[0] ||
    null
  const initialAwayTeam =
    findMatchingTeam(initialTeams, initialResult?.awayTeam) ||
    findMatchingTeam(initialTeams, defaultMatchup?.awayTeam) ||
    initialTeams.find((team) => teamKey(team) !== teamKey(initialHomeTeam)) ||
    null

  const isEditing = Boolean(initialResult)
  const [selectedDivision, setSelectedDivision] = useState(initialDivision)
  const [selectedGroup, setSelectedGroup] = useState(initialGroup)
  const [homeTeam, setHomeTeam] = useState(initialHomeTeam)
  const [awayTeam, setAwayTeam] = useState(initialAwayTeam)
  const [sets, setSets] = useState(() => normalizeSets(initialResult?.sets))
  const [photoPreview, setPhotoPreview] = useState(initialPhotoPreview || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const groupOptions = useMemo(() => Object.keys(DIVISION_TEAMS[selectedDivision] || {}), [selectedDivision])
  const teamOptions = useMemo(() => DIVISION_TEAMS[selectedDivision]?.[selectedGroup] || [], [selectedDivision, selectedGroup])
  const awayOptions = useMemo(
    () => teamOptions.filter((team) => teamKey(team) !== teamKey(homeTeam)),
    [teamOptions, homeTeam]
  )

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    if (!selectedDivision) return
    if (!groupOptions.includes(selectedGroup)) {
      setSelectedGroup(groupOptions[0] || '')
    }
  }, [selectedDivision, groupOptions, selectedGroup])

  useEffect(() => {
    const matchedHome = findMatchingTeam(teamOptions, homeTeam) || teamOptions[0] || null
    setHomeTeam(matchedHome)

    const filteredAway = teamOptions.filter((team) => teamKey(team) !== teamKey(matchedHome))
    const matchedAway = findMatchingTeam(filteredAway, awayTeam) || filteredAway[0] || null
    setAwayTeam(matchedAway)
  }, [selectedDivision, selectedGroup, teamOptions])

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

    if (!selectedDivision || !selectedGroup || !homeTeam || !awayTeam) {
      setError('Please select division, group, your team and opponent team.')
      return
    }

    if (teamKey(homeTeam) === teamKey(awayTeam)) {
      setError('Your team and opponent team must be different.')
      return
    }

    const firstTwoFilled = isSetFilled(sets[0]) && isSetFilled(sets[1])
    if (!firstTwoFilled) {
      setError('Please fill scores for Set 1 and Set 2.')
      return
    }

    const thirdSetPartial = hasAnySetValue(sets[2]) && !isSetFilled(sets[2])
    if (thirdSetPartial) {
      setError('If Set 3 is used, fill both scores.')
      return
    }

    if (!photoPreview && !isEditing) {
      setError('Please upload a photo.')
      return
    }

    setSaving(true)
    try {
      await onConfirm({
        division: selectedDivision,
        group: selectedGroup,
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

  const scoreLine = sets
    .filter((set, index) => index < 2 || isSetFilled(set))
    .map((set) => `${set.home || '-'}:${set.away || '-'}`)
    .join('  ')

  return (
    <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wide">My Games</p>
          <h2 className="text-lg font-semibold text-gray-900">{isEditing ? 'Edit Result' : 'Confirm Result'}</h2>
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Division</p>
            <select
              value={selectedDivision}
              onChange={(event) => setSelectedDivision(event.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            >
              {divisions.map((division) => (
                <option key={division} value={division}>{division}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Group</p>
            <select
              value={selectedGroup}
              onChange={(event) => setSelectedGroup(event.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            >
              {groupOptions.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Your Team</p>
            <select
              value={teamKey(homeTeam)}
              onChange={(event) => setHomeTeam(teamOptions.find((team) => teamKey(team) === event.target.value) || null)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            >
              {teamOptions.map((team) => (
                <option key={teamKey(team)} value={teamKey(team)}>{teamLabel(team)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Opponent Team</p>
            <select
              value={teamKey(awayTeam)}
              onChange={(event) => setAwayTeam(awayOptions.find((team) => teamKey(team) === event.target.value) || null)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            >
              {awayOptions.map((team) => (
                <option key={teamKey(team)} value={teamKey(team)}>{teamLabel(team)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Set Scores</p>
            <div className="flex items-center gap-2">
              <span className="w-12" />
              <span className="w-16 text-[10px] text-gray-400 uppercase tracking-wide text-center">Your Team</span>
              <span className="text-gray-200"> </span>
              <span className="w-16 text-[10px] text-gray-400 uppercase tracking-wide text-center">Opponent Team</span>
            </div>
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
                    <p className="text-[10px] text-lime-300 font-semibold uppercase leading-none">{selectedGroup}</p>
                    <p className="text-[10px] text-white/90 truncate leading-none mt-1">
                      {teamLabel(homeTeam)} vs {teamLabel(awayTeam)}
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
            {saving ? 'Saving...' : isEditing ? 'Save' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
