const COORDINATES = '57.0,24.13'
const SPORT_ID = 'PADEL'
const HEADERS = {
  'Origin': 'https://playtomic.io',
  'User-Agent': 'Mozilla/5.0',
}

function getUpcomingTuesdays(count = 5) {
  const dates = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let w = 0; w < count; w++) {
    const d = new Date(today)
    const daysUntil = (2 - d.getDay() + 7) % 7 || 7
    d.setDate(d.getDate() + daysUntil + w * 7)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const tenantResp = await fetch(
      `https://api.playtomic.io/v1/tenants?coordinate=${COORDINATES}&radius=50000&sport_id=${SPORT_ID}&playtomic_status=ACTIVE&size=100`,
      { headers: HEADERS }
    )
    if (!tenantResp.ok) {
      return res.status(500).json({ error: 'Failed to fetch tenants' })
    }

    const tenantJson = await tenantResp.json()
    const allTenants = Array.isArray(tenantJson) ? tenantJson : (tenantJson.tenants || [])
    const tenants = allTenants.filter((t) =>
      (t.tenant_name || '').toLowerCase().includes('padel club riga')
    )

    const dates = getUpcomingTuesdays(5)
    const result = []

    for (const date of dates) {
      const localStartMin = `${date}T17:00:00`
      const localStartMax = `${date}T22:00:00`

      const slotsByTime = {}

      await Promise.all(
        tenants.map(async (t) => {
          const tid = t.tenant_id
          const name = t.tenant_name || 'Unknown'
          if (!tid) return

          try {
            const availResp = await fetch(
              `https://api.playtomic.io/v1/availability?user_id=me&tenant_id=${tid}&sport_id=${SPORT_ID}&local_start_min=${localStartMin}&local_start_max=${localStartMax}&duration=90`,
              { headers: HEADERS }
            )
            if (!availResp.ok) return

            const slots = await availResp.json()
            if (!Array.isArray(slots)) return

            for (const slot of slots) {
              const time = slot.start_time?.substring(0, 5)
              if (!time) continue
              if (!slotsByTime[time]) slotsByTime[time] = []
              slotsByTime[time].push({
                club_id: tid,
                club_name: name,
                court_id: slot.resource_id,
                court_name: slot.resource_name || 'Court',
              })
            }
          } catch {}
        })
      )

      const times = Object.entries(slotsByTime)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, courts]) => ({ time, courts }))

      result.push({ date, times })
    }

    return res.status(200).json({ slots: result })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
