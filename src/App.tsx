import { useCallback, useMemo, useState } from 'react'
import { ComparisonPanel } from './components/ComparisonPanel'
import { DropZone } from './components/DropZone'
import { RunPanel } from './components/RunPanel'
import { ThresholdsBar } from './components/ThresholdsBar'
import { parseGpx, type ParsedGpx } from './lib/gpx'
import { analyze, type Analysis } from './lib/pace'
import { useThresholds } from './lib/thresholds'

type Slot = 'primary' | 'compare'

export default function App() {
  const [primaryGpx, setPrimaryGpx] = useState<ParsedGpx | null>(null)
  const [compareGpx, setCompareGpx] = useState<ParsedGpx | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingFor, setPendingFor] = useState<Slot | null>(null)
  const [thresholds, setThresholds, resetThresholds] = useThresholds()

  const primary = useMemo<Analysis | null>(
    () => (primaryGpx ? analyze(primaryGpx, thresholds) : null),
    [primaryGpx, thresholds],
  )
  const compare = useMemo<Analysis | null>(
    () => (compareGpx ? analyze(compareGpx, thresholds) : null),
    [compareGpx, thresholds],
  )

  const handleFile = useCallback(async (slot: Slot, file: File) => {
    setPendingFor(slot)
    setError(null)
    try {
      const text = await file.text()
      const parsed = parseGpx(text)
      if (slot === 'primary') setPrimaryGpx(parsed)
      else setCompareGpx(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GPX')
    } finally {
      setPendingFor(null)
    }
  }, [])

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex flex-col gap-3 border-b border-white/5 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Broad Street Run Analyzer</h1>
          <p className="text-xs text-neutral-400">
            Drop a Strava GPX to break your run down by pace · 10-mile straight shot down Broad
          </p>
          <p className="mt-1 text-xs text-emerald-400/80">
            Your GPX is analyzed in your browser — nothing is uploaded to any server.
          </p>
        </div>
        <ThresholdsBar
          thresholds={thresholds}
          onChange={setThresholds}
          onReset={resetThresholds}
        />
      </header>

      {error && (
        <div className="mx-6 mt-3 rounded-md border border-rose-700/50 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      )}

      <main className="flex flex-1 gap-4 overflow-hidden p-4">
        {!primary ? (
          <DropZone
            label="Drop your Broad Street Run GPX"
            hint="Strava export, .gpx file"
            onFile={(f) => handleFile('primary', f)}
            className="flex-1"
          />
        ) : (
          <>
            {(() => {
              const primarySlot = {
                analysis: primary,
                clear: () => setPrimaryGpx(null),
                loading: pendingFor === 'primary',
              }
              const compareSlot = compare
                ? {
                    analysis: compare,
                    clear: () => setCompareGpx(null),
                    loading: pendingFor === 'compare',
                  }
                : null
              const [left, right] =
                compareSlot && compareSlot.analysis.gpx.startTime < primary.gpx.startTime
                  ? [compareSlot, primarySlot]
                  : [primarySlot, compareSlot]
              return (
                <>
                  <div className="flex-1 min-w-0">
                    <RunPanel
                      analysis={left.analysis}
                      onClear={left.clear}
                      badge={left.loading ? 'Loading…' : labelYear(left.analysis.gpx.startTime)}
                      thresholds={thresholds}
                    />
                  </div>
                  {right ? (
                    <>
                      <ComparisonPanel a={left.analysis} b={right.analysis} />
                      <div className="flex-1 min-w-0">
                        <RunPanel
                          analysis={right.analysis}
                          onClear={right.clear}
                          badge={right.loading ? 'Loading…' : labelYear(right.analysis.gpx.startTime)}
                          thresholds={thresholds}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <DropZone
                        label="Compare against another run"
                        hint="Drop a second GPX (e.g., last year's)"
                        onFile={(f) => handleFile('compare', f)}
                        className="h-full"
                      />
                    </div>
                  )}
                </>
              )
            })()}
          </>
        )}
      </main>
    </div>
  )
}

function labelYear(ts: number): string {
  return new Date(ts).getFullYear().toString()
}
