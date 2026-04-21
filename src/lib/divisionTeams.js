import rawDivisionTeams from '../data/divisionTeams.txt?raw'

function normalizeDivisionName(raw) {
  const tier = String(raw || '').trim().split(/\s+/)[0]?.toUpperCase()
  if (!tier) return ''
  return `${tier} DIVISION`
}

function parseTeamLine(line, groupName, index) {
  const cleaned = String(line || '').trim()
  if (!cleaned) return null

  let player1 = cleaned
  let player2 = ''

  if (cleaned.includes('/')) {
    const [first, second] = cleaned.split('/').map((part) => part.trim()).filter(Boolean)
    player1 = first || cleaned
    player2 = second || ''
  } else {
    const tokens = cleaned.split(/\s+/).filter(Boolean)
    if (tokens.length === 2 && tokens[0].includes('.') && tokens[1].includes('.')) {
      player1 = tokens[0]
      player2 = tokens[1]
    }
  }

  const label = player2 ? `${player1} / ${player2}` : player1
  return {
    id: `${groupName}:${index + 1}`,
    label,
    player1,
    player2,
  }
}

export function parseDivisionTeams(sourceText) {
  const source = typeof sourceText === 'string' ? sourceText : ''
  const result = {}
  let currentDivision = ''
  let currentGroup = ''

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const divisionMatch = line.match(/^(GOLD|SILVER|BRONZE)\s+(DIVISION|DEVISION)$/i)
    if (divisionMatch) {
      currentDivision = normalizeDivisionName(divisionMatch[0])
      if (!result[currentDivision]) result[currentDivision] = {}
      currentGroup = ''
      continue
    }

    const groupMatch = line.match(/^(GOLD|SILVER|BRONZE)\s+\d+$/i)
    if (groupMatch && currentDivision) {
      currentGroup = line.toUpperCase()
      if (!result[currentDivision][currentGroup]) result[currentDivision][currentGroup] = []
      continue
    }

    if (!currentDivision || !currentGroup) continue

    const teams = result[currentDivision][currentGroup]
    const team = parseTeamLine(line, currentGroup, teams.length)
    if (team) teams.push(team)
  }

  return result
}

export const DIVISION_TEAMS = parseDivisionTeams(rawDivisionTeams)

function hashString(value) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function getMatchupForBooking(booking) {
  const divisions = Object.keys(DIVISION_TEAMS)
  if (!booking || divisions.length === 0) return null

  const seed = hashString(`${booking.id}-${booking.date}-${booking.time}`)
  const division = divisions[seed % divisions.length]
  const groups = Object.keys(DIVISION_TEAMS[division] || {})
  if (groups.length === 0) return null

  const group = groups[seed % groups.length]
  const teams = DIVISION_TEAMS[division][group] || []
  if (teams.length < 2) return null

  const homeIndex = seed % teams.length
  const awayIndex = (homeIndex + 1 + (seed % (teams.length - 1 || 1))) % teams.length

  return {
    division,
    group,
    homeTeam: teams[homeIndex],
    awayTeam: teams[awayIndex],
  }
}
