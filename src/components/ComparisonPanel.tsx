import type { ReactNode } from 'react'
import type { Analysis } from '../lib/pace'
import {
  PACE_COLORS,
  PACE_LABELS,
  PACE_ORDER,
  formatDuration,
  formatMiles,
  formatPace,
} from '../lib/pace'

type Props = {
  a: Analysis
  b: Analysis
}

export function ComparisonPanel({ a, b }: Props) {
  // Older run is baseline, newer run is current. Deltas describe the change
  // from baseline to current, so the arrow direction matches the sign.
  const [baseline, current] = a.gpx.startTime <= b.gpx.startTime ? [a, b] : [b, a]
  return (
    <div className="flex h-full w-[200px] shrink-0 flex-col gap-3 rounded-2xl bg-neutral-950/40 p-3 ring-1 ring-white/5">
      <div className="text-center">
        <div className="text-xs uppercase tracking-wider text-neutral-400">change</div>
        <div className="text-sm text-white">
          {labelYear(baseline.gpx.startTime)} → {labelYear(current.gpx.startTime)}
        </div>
      </div>

      <DeltaRow
        label="Total time"
        primary={formatDuration(current.totalDurationSec)}
        delta={renderDuration(current.totalDurationSec - baseline.totalDurationSec, true)}
      />
      <DeltaRow
        label="Distance"
        primary={`${formatMiles(current.totalDistanceM)} mi`}
        delta={renderMilesDelta(current.totalDistanceM - baseline.totalDistanceM)}
      />
      <DeltaRow
        label="Avg pace"
        primary={`${formatPace(current.avgPaceMinPerMile)} / mi`}
        delta={renderPaceDelta(current.avgPaceMinPerMile - baseline.avgPaceMinPerMile)}
      />
      <DeltaRow
        label="Moving time"
        primary={formatDuration(current.movingDurationSec)}
        delta={renderDuration(current.movingDurationSec - baseline.movingDurationSec, true)}
      />
      {current.avgHr != null && baseline.avgHr != null && (
        <DeltaRow
          label="Avg HR"
          primary={`${Math.round(current.avgHr)} bpm`}
          delta={renderHrDelta(current.avgHr - baseline.avgHr)}
        />
      )}

      <div className="mt-1 border-t border-white/5 pt-3">
        <div className="mb-2 text-xs uppercase tracking-wider text-neutral-400">By pace</div>
        <div className="space-y-1.5">
          {PACE_ORDER.map((cat) => {
            const cur = current.totalsByCategory[cat]
            const base = baseline.totalsByCategory[cat]
            const lowerIsBetter = cat === 'stopped' || cat === 'walking'
            return (
              <div key={cat} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ background: PACE_COLORS[cat] }}
                  />
                  <span className="text-white">{PACE_LABELS[cat]}</span>
                </span>
                <span className="tabular-nums">
                  {renderDuration(cur.durationSec - base.durationSec, lowerIsBetter)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DeltaRow({ label, primary, delta }: { label: string; primary: string; delta: ReactNode }) {
  return (
    <div className="rounded-md bg-neutral-900/60 p-2 ring-1 ring-white/5">
      <div className="text-xs uppercase tracking-wider text-neutral-400">{label}</div>
      <div className="text-sm font-semibold text-white tabular-nums">{primary}</div>
      <div className="mt-0.5 text-sm tabular-nums">{delta}</div>
    </div>
  )
}

function deltaColor(diff: number, lowerIsBetter: boolean): string {
  if (Math.abs(diff) < 1e-9) return 'text-neutral-400'
  const better = lowerIsBetter ? diff < 0 : diff > 0
  return better ? 'text-emerald-400' : 'text-rose-400'
}

function renderDuration(diffSec: number, lowerIsBetter: boolean): ReactNode {
  const sign = diffSec > 0 ? '+' : '−'
  return (
    <span className={deltaColor(diffSec, lowerIsBetter)}>
      {sign}
      {formatDuration(Math.abs(diffSec))}
    </span>
  )
}

function renderMilesDelta(diffM: number): ReactNode {
  const diffMi = diffM / 1609.344
  const sign = diffMi > 0 ? '+' : ''
  return (
    <span className={deltaColor(diffMi, false)}>
      {sign}
      {diffMi.toFixed(2)} mi
    </span>
  )
}

function renderPaceDelta(diffMinMi: number): ReactNode {
  if (!isFinite(diffMinMi)) return null
  const diffSec = diffMinMi * 60
  const sign = diffSec > 0 ? '+' : '−'
  const absSec = Math.abs(diffSec)
  const m = Math.floor(absSec / 60)
  const s = Math.round(absSec % 60)
  const str = m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
  return (
    <span className={deltaColor(diffSec, true)}>
      {sign}
      {str} / mi
    </span>
  )
}

function renderHrDelta(diff: number): ReactNode {
  const sign = diff > 0 ? '+' : ''
  return (
    <span className="text-neutral-300">
      {sign}
      {diff.toFixed(0)} bpm
    </span>
  )
}

function labelYear(ts: number): string {
  return new Date(ts).getFullYear().toString()
}
