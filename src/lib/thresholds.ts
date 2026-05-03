import { useEffect, useState } from 'react'
import { DEFAULT_THRESHOLDS, type PaceThresholds } from './pace'

const STORAGE_KEY = 'bsr-analyzer.thresholds.v1'
const OPTIONS_STORAGE_KEY = 'bsr-analyzer.options.v1'

export type DisplayOptions = {
  excludeStopped: boolean
}

export const DEFAULT_OPTIONS: DisplayOptions = {
  excludeStopped: false,
}

function loadThresholds(): PaceThresholds {
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
  const [thresholds, setThresholds] = useState<PaceThresholds>(() => loadThresholds())

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

function loadOptions(): DisplayOptions {
  if (typeof localStorage === 'undefined') return DEFAULT_OPTIONS
  try {
    const raw = localStorage.getItem(OPTIONS_STORAGE_KEY)
    if (!raw) return DEFAULT_OPTIONS
    const parsed = JSON.parse(raw) as Partial<DisplayOptions>
    return { ...DEFAULT_OPTIONS, ...parsed }
  } catch {
    return DEFAULT_OPTIONS
  }
}

export function useDisplayOptions(): [DisplayOptions, (next: DisplayOptions) => void] {
  const [options, setOptions] = useState<DisplayOptions>(() => loadOptions())

  useEffect(() => {
    try {
      localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(options))
    } catch {
      // ignore quota / private mode failures
    }
  }, [options])

  return [options, setOptions]
}
