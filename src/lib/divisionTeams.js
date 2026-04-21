import rawDivisionTeams from '../data/divisionTeams.txt?raw'

function parseTeamLine(line) {
  const names = line.trim().split(/\s+/).filter(Boolean)
  if (names.length < 2) return null
  return {
    player1: names[0],
    player2: names[1],
  }
}

export function parseDivisionTeams(sourceText) {
  const source = typeof sourceText === 'string' ? sourceText : ''
  const result = {}
  let currentDivision = null

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    if (/division$/i.test(line)) {
      currentDivision = line
      if (!result[currentDivision]) result[currentDivision] = []
      continue
    }

    if (!currentDivision) continue

    const team = parseTeamLine(line)
    if (team) result[currentDivision].push(team)
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
  const teams = DIVISION_TEAMS[division] || []

  if (teams.length < 2) return null

  const homeIndex = seed % teams.length
  const awayIndex = (homeIndex + 1 + (seed % (teams.length - 1 || 1))) % teams.length

  return {
    division,
    homeTeam: teams[homeIndex],
    awayTeam: teams[awayIndex],
  }
}
