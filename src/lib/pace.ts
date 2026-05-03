import { haversineMeters, type ParsedGpx, type TrackPoint } from './gpx'

export type PaceCategory = 'cruising' | 'jogging' | 'walking' | 'stopped'

export const PACE_ORDER: PaceCategory[] = ['cruising', 'jogging', 'walking', 'stopped']

export const PACE_LABELS: Record<PaceCategory, string> = {
  cruising: 'Cruising',
  jogging: 'Jogging',
  walking: 'Walking',
  stopped: 'Stopped',
}

export const PACE_COLORS: Record<PaceCategory, string> = {
  cruising: '#22c55e',
  jogging: '#eab308',
  walking: '#f97316',
  stopped: '#ef4444',
}

const METERS_PER_MILE = 1609.344

export type PaceThresholds = {
  // Pace boundaries in min/mile. Higher number = slower pace.
  cruisingMaxPaceMinPerMile: number
  joggingMaxPaceMinPerMile: number
  // Below this smoothed speed, classified as stopped regardless of pace.
  stoppedSpeedMps: number
  // Speed-smoothing window (seconds) and minimum segment duration before merging.
  smoothWindowSec: number
  minSegmentSec: number
}

export const DEFAULT_THRESHOLDS: PaceThresholds = {
  // Tuned for a decent recreational runner: race pace ~8:00/mi, easy run ~9:30/mi.
  cruisingMaxPaceMinPerMile: 9,
  joggingMaxPaceMinPerMile: 11.5,
  stoppedSpeedMps: 0.5,
  smoothWindowSec: 10,
  minSegmentSec: 5,
}

export function describeThresholds(t: PaceThresholds): Record<PaceCategory, string> {
  return {
    cruising: `< ${formatPace(t.cruisingMaxPaceMinPerMile)} / mi`,
    jogging: `${formatPace(t.cruisingMaxPaceMinPerMile)} – ${formatPace(t.joggingMaxPaceMinPerMile)} / mi`,
    walking: `slower than ${formatPace(t.joggingMaxPaceMinPerMile)} / mi`,
    stopped: `< ${t.stoppedSpeedMps.toFixed(2)} m/s`,
  }
}

function paceMinPerMile(metersPerSec: number): number {
  if (metersPerSec <= 0) return Infinity
  return METERS_PER_MILE / metersPerSec / 60
}

export type DisplayView = {
  durationSec: number
  distanceM: number
  paceMinPerMile: number
}

export function viewFor(analysis: Analysis, excludeStopped: boolean): DisplayView {
  if (excludeStopped) {
    const stopped = analysis.totalsByCategory.stopped
    const durationSec = analysis.totalDurationSec - stopped.durationSec
    const distanceM = analysis.totalDistanceM - stopped.distanceM
    return {
      durationSec,
      distanceM,
      paceMinPerMile: durationSec > 0 ? paceMinPerMile(distanceM / durationSec) : Infinity,
    }
  }
  return {
    durationSec: analysis.totalDurationSec,
    distanceM: analysis.totalDistanceM,
    paceMinPerMile: analysis.avgPaceMinPerMile,
  }
}

function categoryFromSpeed(metersPerSec: number, t: PaceThresholds): PaceCategory {
  if (metersPerSec < t.stoppedSpeedMps) return 'stopped'
  const pace = paceMinPerMile(metersPerSec)
  if (pace < t.cruisingMaxPaceMinPerMile) return 'cruising'
  if (pace < t.joggingMaxPaceMinPerMile) return 'jogging'
  return 'walking'
}

export type EnrichedPoint = TrackPoint & {
  cumDistanceM: number
  smoothedSpeedMps: number
  category: PaceCategory
}

export type PaceSegment = {
  category: PaceCategory
  startIndex: number
  endIndex: number
  startTime: number
  endTime: number
  durationSec: number
  distanceM: number
  avgSpeedMps: number
  avgPaceMinPerMile: number
}

export type Analysis = {
  gpx: ParsedGpx
  points: EnrichedPoint[]
  segments: PaceSegment[]
  totalDistanceM: number
  totalDurationSec: number
  movingDurationSec: number
  totalsByCategory: Record<PaceCategory, { distanceM: number; durationSec: number }>
  avgPaceMinPerMile: number
  avgHr: number | null
  maxHr: number | null
}

export function analyze(gpx: ParsedGpx, thresholds: PaceThresholds = DEFAULT_THRESHOLDS): Analysis {
  const pts = gpx.points
  const cumDistance: number[] = new Array(pts.length).fill(0)
  for (let i = 1; i < pts.length; i++) {
    cumDistance[i] = cumDistance[i - 1] + haversineMeters(pts[i - 1], pts[i])
  }

  const windowMs = thresholds.smoothWindowSec * 1000
  const speeds = new Array<number>(pts.length).fill(0)
  let lo = 0
  let hi = 0
  for (let i = 0; i < pts.length; i++) {
    const t = pts[i].time
    const tLo = t - windowMs / 2
    const tHi = t + windowMs / 2
    while (lo < pts.length && pts[lo].time < tLo) lo++
    while (hi < pts.length && pts[hi].time <= tHi) hi++
    // Guarantee the window always spans at least one edge on each side, so that
    // smart-recorded GPX with sample gaps wider than the smoothing window doesn't
    // collapse to dt=0 (which would falsely classify normal motion as stopped).
    const a = Math.min(lo, Math.max(0, i - 1))
    const b = Math.max(hi - 1, Math.min(pts.length - 1, i + 1))
    const dt = (pts[b].time - pts[a].time) / 1000
    const dd = cumDistance[b] - cumDistance[a]
    speeds[i] = dt > 0 ? dd / dt : 0
  }

  const enriched: EnrichedPoint[] = pts.map((p, i) => ({
    ...p,
    cumDistanceM: cumDistance[i],
    smoothedSpeedMps: speeds[i],
    category: categoryFromSpeed(speeds[i], thresholds),
  }))

  // Compute totals by attributing each edge between consecutive points to the
  // category of the edge's later point. This is the source of truth — visual
  // segments below may merge brief same-category interludes for a cleaner map,
  // but the totals stay faithful to the original per-point classification.
  const totalsByCategory: Analysis['totalsByCategory'] = {
    cruising: { distanceM: 0, durationSec: 0 },
    jogging: { distanceM: 0, durationSec: 0 },
    walking: { distanceM: 0, durationSec: 0 },
    stopped: { distanceM: 0, durationSec: 0 },
  }
  for (let i = 1; i < enriched.length; i++) {
    const dt = (enriched[i].time - enriched[i - 1].time) / 1000
    const dd = cumDistance[i] - cumDistance[i - 1]
    const cat = enriched[i].category
    totalsByCategory[cat].durationSec += dt
    totalsByCategory[cat].distanceM += dd
  }

  let segments = buildSegments(enriched)
  segments = mergeShortSegments(segments, enriched, thresholds.minSegmentSec)

  const totalDistanceM = cumDistance[cumDistance.length - 1]
  const totalDurationSec = (pts[pts.length - 1].time - pts[0].time) / 1000
  const movingDurationSec = totalDurationSec - totalsByCategory.stopped.durationSec
  const avgPaceMinPerMile = paceMinPerMile(totalDistanceM / totalDurationSec)

  let hrSum = 0
  let hrCount = 0
  let maxHr: number | null = null
  for (const p of pts) {
    if (p.hr != null) {
      hrSum += p.hr
      hrCount++
      if (maxHr == null || p.hr > maxHr) maxHr = p.hr
    }
  }

  return {
    gpx,
    points: enriched,
    segments,
    totalDistanceM,
    totalDurationSec,
    movingDurationSec,
    totalsByCategory,
    avgPaceMinPerMile,
    avgHr: hrCount > 0 ? hrSum / hrCount : null,
    maxHr,
  }
}

function buildSegments(points: EnrichedPoint[]): PaceSegment[] {
  const segments: PaceSegment[] = []
  if (points.length < 2) return segments
  // Segments overlap at boundary points so the edge between them is fully accounted for
  // in distance/time totals and the rendered polyline is continuous.
  let startIdx = 0
  for (let i = 1; i < points.length; i++) {
    if (points[i].category !== points[startIdx].category) {
      segments.push(makeSegment(points, startIdx, i))
      startIdx = i
    }
  }
  segments.push(makeSegment(points, startIdx, points.length - 1))
  return segments
}

function makeSegment(points: EnrichedPoint[], startIndex: number, endIndex: number): PaceSegment {
  const a = points[startIndex]
  const b = points[endIndex]
  const distanceM = b.cumDistanceM - a.cumDistanceM
  const durationSec = Math.max(0, (b.time - a.time) / 1000)
  const avgSpeedMps = durationSec > 0 ? distanceM / durationSec : 0
  return {
    category: a.category,
    startIndex,
    endIndex,
    startTime: a.time,
    endTime: b.time,
    durationSec,
    distanceM,
    avgSpeedMps,
    avgPaceMinPerMile: paceMinPerMile(avgSpeedMps),
  }
}

function mergeShortSegments(
  segments: PaceSegment[],
  points: EnrichedPoint[],
  minSegmentSec: number,
): PaceSegment[] {
  if (segments.length <= 1) return segments
  const work = segments.slice()
  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < work.length; i++) {
      const seg = work[i]
      if (seg.durationSec >= minSegmentSec) continue
      // Merge into longer neighbor; if both neighbors have the same category, fold them all together.
      const prev = work[i - 1]
      const next = work[i + 1]
      let target: 'prev' | 'next' | null = null
      if (prev && next) {
        if (prev.category === next.category) target = 'prev'
        else target = prev.durationSec >= next.durationSec ? 'prev' : 'next'
      } else if (prev) target = 'prev'
      else if (next) target = 'next'
      if (!target) continue

      if (target === 'prev' && next && prev.category === next.category) {
        const merged = makeSegment(points, prev.startIndex, next.endIndex)
        work.splice(i - 1, 3, merged)
      } else if (target === 'prev') {
        const merged = makeSegment(points, prev.startIndex, seg.endIndex)
        merged.category = prev.category
        work.splice(i - 1, 2, merged)
      } else {
        const merged = makeSegment(points, seg.startIndex, next.endIndex)
        merged.category = next.category
        work.splice(i, 2, merged)
      }
      changed = true
      break
    }
  }
  return work
}

export function formatPace(minPerMile: number): string {
  if (!isFinite(minPerMile)) return '—'
  const min = Math.floor(minPerMile)
  const sec = Math.round((minPerMile - min) * 60)
  if (sec === 60) return `${min + 1}:00`
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function parsePace(str: string): number | null {
  const trimmed = str.trim()
  if (!trimmed) return null
  const m = trimmed.match(/^(\d+):(\d{1,2})$/)
  if (m) {
    const min = Number(m[1])
    const sec = Number(m[2])
    if (sec >= 60) return null
    return min + sec / 60
  }
  const num = Number(trimmed)
  return Number.isFinite(num) && num > 0 ? num : null
}

export function formatDuration(sec: number): string {
  const s = Math.round(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function formatMiles(meters: number): string {
  return (meters / METERS_PER_MILE).toFixed(2)
}

export { METERS_PER_MILE }
