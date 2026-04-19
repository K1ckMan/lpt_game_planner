const TENANT_ID = 'e5f2bf97-805f-4c5d-a696-6933a548abc2'
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
    // Load court names once
    const tenantResp = await fetch(
      `https://api.playtomic.io/v1/tenants/${TENANT_ID}`,
      { headers: HEADERS }
    )
    const tenantJson = await tenantResp.json()
    const courtNames = {}
    for (const r of tenantJson.resources || []) {
      // Extract short name: "#1", "#2", "Outdoor 1" etc.
      const match = r.name.match(/#\d+/) || r.name.match(/Outdoor \d+/)
      courtNames[r.resource_id] = match ? match[0] : r.name
    }

    const dates = getUpcomingTuesdays(5)
    const result = []

    for (const date of dates) {
      const localStartMin = `${date}T17:00:00`
      const localStartMax = `${date}T22:00:00`

      const availResp = await fetch(
        `https://api.playtomic.io/v1/availability?user_id=me&tenant_id=${TENANT_ID}&sport_id=${SPORT_ID}&local_start_min=${localStartMin}&local_start_max=${localStartMax}&duration=90`,
        { headers: HEADERS }
      )
      if (!availResp.ok) {
        result.push({ date, times: [] })
        continue
      }

      // Response: [{ resource_id, start_date, slots: [{ start_time, duration, price }] }]
      const resources = await availResp.json()
      if (!Array.isArray(resources)) {
        result.push({ date, times: [] })
        continue
      }

      const slotsByTime = {}
      for (const resource of resources) {
        const courtId = resource.resource_id
        const courtName = courtNames[courtId] || courtId.substring(0, 6)

        for (const slot of resource.slots || []) {
          if (slot.duration !== 90) continue
          const time = slot.start_time?.substring(0, 5)
          if (!time || time < '17:00' || time >= '22:00') continue

          if (!slotsByTime[time]) slotsByTime[time] = []
          slotsByTime[time].push({
            court_id: courtId,
            court_name: courtName,
            price: slot.price,
          })
        }
      }

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
