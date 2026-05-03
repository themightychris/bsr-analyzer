import { useEffect, useState } from 'react'
import { DEFAULT_THRESHOLDS, type PaceThresholds } from './pace'

const STORAGE_KEY = 'bsr-analyzer.thresholds.v1'

function load(): PaceThresholds {
  if (typeof localStorage === 'undefined') return DEFAULT_THRESHOLDS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_THRESHOLDS
    const parsed = JSON.parse(raw) as Partial<PaceThresholds>
    return { ...DEFAULT_THRESHOLDS, ...parsed }
  } catch {
    return DEFAULT_THRESHOLDS
  }
}

export function useThresholds(): [PaceThresholds, (next: PaceThresholds) => void, () => void] {
  const [thresholds, setThresholds] = useState<PaceThresholds>(() => load())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds))
    } catch {
      // ignore quota / private mode failures
    }
  }, [thresholds])

  const reset = () => setThresholds(DEFAULT_THRESHOLDS)
  return [thresholds, setThresholds, reset]
}
