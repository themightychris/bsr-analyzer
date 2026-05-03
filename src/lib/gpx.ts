export type TrackPoint = {
  lat: number
  lon: number
  ele: number | null
  time: number
  hr: number | null
  cad: number | null
}

export type ParsedGpx = {
  name: string
  startTime: number
  points: TrackPoint[]
}

export function parseGpx(xml: string): ParsedGpx {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new Error('Invalid GPX file')

  const name = doc.querySelector('trk > name')?.textContent?.trim() ?? 'Unnamed run'
  const trkpts = Array.from(doc.querySelectorAll('trkpt'))
  if (trkpts.length === 0) throw new Error('No track points found in GPX')

  const points: TrackPoint[] = trkpts.map((pt) => {
    const lat = Number(pt.getAttribute('lat'))
    const lon = Number(pt.getAttribute('lon'))
    const eleText = pt.querySelector('ele')?.textContent
    const timeText = pt.querySelector('time')?.textContent
    const hrText = pt.getElementsByTagName('gpxtpx:hr')[0]?.textContent
    const cadText = pt.getElementsByTagName('gpxtpx:cad')[0]?.textContent
    return {
      lat,
      lon,
      ele: eleText ? Number(eleText) : null,
      time: timeText ? Date.parse(timeText) : NaN,
      hr: hrText ? Number(hrText) : null,
      cad: cadText ? Number(cadText) : null,
    }
  })

  const startTime = points[0].time
  return { name, startTime, points }
}

const EARTH_RADIUS_M = 6371000

export function haversineMeters(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}
