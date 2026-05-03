import type { Analysis, PaceThresholds } from '../lib/pace'
import {
  PACE_COLORS,
  PACE_LABELS,
  PACE_ORDER,
  describeThresholds,
  formatDuration,
  formatMiles,
  formatPace,
} from '../lib/pace'

type Props = {
  analysis: Analysis
  thresholds: PaceThresholds
}

export function StatsPanel({ analysis, thresholds }: Props) {
  const totalSec = analysis.totalDurationSec
  const descriptions = describeThresholds(thresholds)
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white truncate" title={analysis.gpx.name}>
          {analysis.gpx.name}
        </h2>
        <p className="text-xs text-neutral-400">
          {new Date(analysis.gpx.startTime).toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Distance" value={`${formatMiles(analysis.totalDistanceM)} mi`} />
        <Stat label="Total time" value={formatDuration(analysis.totalDurationSec)} />
        <Stat label="Avg pace" value={`${formatPace(analysis.avgPaceMinPerMile)} / mi`} />
        <Stat label="Moving time" value={formatDuration(analysis.movingDurationSec)} />
        {analysis.avgHr != null && (
          <Stat label="Avg HR" value={`${Math.round(analysis.avgHr)} bpm`} />
        )}
        {analysis.maxHr != null && (
          <Stat label="Max HR" value={`${analysis.maxHr} bpm`} />
        )}
      </div>

      <div>
        <div className="mb-2 text-xs uppercase tracking-wider text-neutral-400">Time by pace</div>
        <div className="flex h-2 w-full overflow-hidden rounded bg-neutral-800">
          {PACE_ORDER.map((cat) => {
            const pct =
              totalSec > 0 ? (analysis.totalsByCategory[cat].durationSec / totalSec) * 100 : 0
            return (
              <div
                key={cat}
                style={{ width: `${pct}%`, background: PACE_COLORS[cat] }}
                title={`${PACE_LABELS[cat]}: ${pct.toFixed(1)}%`}
              />
            )
          })}
        </div>
        <div className="mt-3 space-y-2">
          {PACE_ORDER.map((cat) => {
            const t = analysis.totalsByCategory[cat]
            const pct = totalSec > 0 ? (t.durationSec / totalSec) * 100 : 0
            return (
              <div key={cat} className="flex items-baseline gap-3">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-sm"
                  style={{ background: PACE_COLORS[cat] }}
                />
                <div className="flex-1">
                  <div className="flex justify-between text-sm text-white">
                    <span>{PACE_LABELS[cat]}</span>
                    <span className="tabular-nums">
                      {formatDuration(t.durationSec)}{' '}
                      <span className="text-neutral-400">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>{descriptions[cat]}</span>
                    <span className="tabular-nums">{formatMiles(t.distanceM)} mi</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-900/60 px-3 py-2 ring-1 ring-white/5">
      <div className="text-xs uppercase tracking-wider text-neutral-400">{label}</div>
      <div className="text-base font-semibold text-white tabular-nums">{value}</div>
    </div>
  )
}
