import type { Analysis, PaceThresholds } from '../lib/pace'
import { RunMap } from './RunMap'
import { StatsPanel } from './StatsPanel'

type Props = {
  analysis: Analysis
  onClear: () => void
  badge?: string
  thresholds: PaceThresholds
  excludeStopped: boolean
}

export function RunPanel({ analysis, onClear, badge, thresholds, excludeStopped }: Props) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl bg-neutral-950/40 p-3 ring-1 ring-white/5">
      <div className="flex items-center justify-between gap-2">
        {badge && (
          <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs uppercase tracking-wider text-neutral-300">
            {badge}
          </span>
        )}
        <button
          type="button"
          onClick={onClear}
          className="ml-auto rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-white"
        >
          Replace
        </button>
      </div>
      <div className="flex flex-1 gap-3 overflow-hidden">
        <div className="w-[260px] shrink-0 overflow-y-auto rounded-xl bg-neutral-950/60 p-4 ring-1 ring-white/5">
          <StatsPanel
            analysis={analysis}
            thresholds={thresholds}
            excludeStopped={excludeStopped}
          />
        </div>
        <div className="relative w-[280px] shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10">
          <RunMap analysis={analysis} />
        </div>
      </div>
    </div>
  )
}
