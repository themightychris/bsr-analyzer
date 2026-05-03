# Broad Street Run Analyzer

Drop a Strava GPX export of your Broad Street Run, see your race broken down by pace zone (cruising / jogging / walking / stopped), and stack last year's run next to this year's for a side-by-side comparison.

**→ [themightychris.github.io/bsr-analyzer](https://themightychris.github.io/bsr-analyzer/)**

Everything runs in the browser. Your GPX never leaves your machine.

## What it does

- **Drag-and-drop a `.gpx` file** to load a run. Drop a second one to compare.
- **Pace segmentation** with sensible defaults for a decent recreational runner:
  - Cruising — under 9:00 / mi
  - Jogging — 9:00 to 11:30 / mi
  - Walking — slower than 11:30 / mi
  - Stopped — under 0.5 m/s (water stations, congestion, etc.)
- **Editable thresholds** at the top of the page, persisted to localStorage.
- **Tall narrow MapLibre map** that matches the shape of the route — Broad Street is a 10-mile straight shot south through Philadelphia.
- **Smoothed speeds** with a guard for Strava's smart-recording sample gaps so brief telemetry hiccups don't get classified as stops.
- **Comparison panel** in the middle when two runs are loaded: total time, distance, pace, moving time, HR, and per-category time deltas. Older run goes on the left, newer on the right, regardless of upload order.

## Run it locally

```sh
bun install
bun run dev
```

## Deploy

Pushes to `main` build with Bun and publish to GitHub Pages via `.github/workflows/pages.yml`. Repo settings → Pages must be set to "GitHub Actions" as the source.
