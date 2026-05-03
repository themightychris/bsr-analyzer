import { useEffect, useState } from 'react'
import {
  DEFAULT_THRESHOLDS,
  PACE_COLORS,
  PACE_LABELS,
  formatPace,
  parsePace,
  type PaceCategory,
  type PaceThresholds,
} from '../lib/pace'

type Props = {
  thresholds: PaceThresholds
  onChange: (next: PaceThresholds) => void
  onReset: () => void
}

type Field =
  | { kind: 'pace'; key: keyof PaceThresholds; label: string; cat: PaceCategory }
  | { kind: 'speed'; key: keyof PaceThresholds; label: string; cat: PaceCategory }

const FIELDS: Field[] = [
  { kind: 'pace', key: 'cruisingMaxPaceMinPerMile', label: 'under', cat: 'cruising' },
  { kind: 'pace', key: 'joggingMaxPaceMinPerMile', label: 'under', cat: 'jogging' },
  { kind: 'speed', key: 'stoppedSpeedMps', label: 'under', cat: 'stopped' },
]

export function ThresholdsBar({ thresholds, onChange, onReset }: Props) {
  const isDefault =
    JSON.stringify(thresholds) === JSON.stringify(DEFAULT_THRESHOLDS)

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-950/40 p-2 ring-1 ring-white/5">
      {FIELDS.map((f) => (
        <ThresholdField
          key={f.key}
          field={f}
          value={thresholds[f.key]}
          onCommit={(next) => onChange({ ...thresholds, [f.key]: next })}
        />
      ))}
      {!isDefault && (
        <button
          type="button"
          onClick={onReset}
          className="ml-auto rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-white"
        >
          Reset
        </button>
      )}
    </div>
  )
}

function ThresholdField({
  field,
  value,
  onCommit,
}: {
  field: Field
  value: number
  onCommit: (next: number) => void
}) {
  const formatValue = field.kind === 'pace' ? formatPace : (v: number) => v.toFixed(2)
  const suffix = field.kind === 'pace' ? '/ mi' : 'm/s'
  const [draft, setDraft] = useState(formatValue(value))
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    setDraft(formatValue(value))
    setInvalid(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function commit() {
    const parsed = field.kind === 'pace' ? parsePace(draft) : Number(draft)
    if (parsed == null || !Number.isFinite(parsed) || parsed <= 0) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    if (Math.abs(parsed - value) > 1e-9) onCommit(parsed)
    setDraft(formatValue(parsed))
  }

  return (
    <label className="flex items-center gap-1.5 rounded-md bg-neutral-900/60 px-2 py-1 text-xs ring-1 ring-white/5">
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
        style={{ background: PACE_COLORS[field.cat] }}
      />
      <span className="text-neutral-400">
        <span className="text-white">{PACE_LABELS[field.cat]}</span> {field.label}
      </span>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          else if (e.key === 'Escape') {
            setDraft(formatValue(value))
            setInvalid(false)
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        className={`w-14 rounded bg-neutral-800 px-1.5 py-0.5 text-right tabular-nums text-white outline-none ring-1 transition-colors ${
          invalid
            ? 'ring-rose-500'
            : 'ring-transparent focus:ring-emerald-400/60'
        }`}
      />
      <span className="text-neutral-500">{suffix}</span>
    </label>
  )
}
