import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { Analysis } from '../lib/pace'
import { PACE_COLORS, PACE_ORDER } from '../lib/pace'

type Props = {
  analysis: Analysis
}

const RASTER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      paint: { 'raster-saturation': -0.6, 'raster-brightness-min': 0.05, 'raster-brightness-max': 0.7 },
    },
  ],
}

export function RunMap({ analysis }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: RASTER_STYLE,
      center: [analysis.points[0].lon, analysis.points[0].lat],
      zoom: 12,
      attributionControl: { compact: true },
    })
    mapRef.current = map

    map.on('load', () => renderRun(map, analysis))

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.isStyleLoaded()) renderRun(map, analysis)
    else map.once('load', () => renderRun(map, analysis))
  }, [analysis])

  return <div ref={containerRef} className="h-full w-full" />
}

function renderRun(map: maplibregl.Map, analysis: Analysis) {
  // Clear prior layers/sources.
  for (const cat of PACE_ORDER) {
    const layerId = `pace-${cat}`
    if (map.getLayer(layerId)) map.removeLayer(layerId)
    if (map.getSource(layerId)) map.removeSource(layerId)
  }

  const featuresByCategory: Record<string, GeoJSON.Feature<GeoJSON.LineString>[]> = {
    cruising: [],
    jogging: [],
    walking: [],
    stopped: [],
  }

  for (const seg of analysis.segments) {
    const coords: [number, number][] = []
    for (let i = seg.startIndex; i <= seg.endIndex; i++) {
      const p = analysis.points[i]
      coords.push([p.lon, p.lat])
    }
    if (coords.length < 2) continue
    featuresByCategory[seg.category].push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: { category: seg.category },
    })
  }

  for (const cat of PACE_ORDER) {
    const id = `pace-${cat}`
    map.addSource(id, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: featuresByCategory[cat] },
    })
    map.addLayer({
      id,
      type: 'line',
      source: id,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': PACE_COLORS[cat],
        'line-width': cat === 'stopped' ? 6 : 4,
      },
    })
  }

  // Fit to bounds.
  const bounds = new maplibregl.LngLatBounds()
  for (const p of analysis.points) bounds.extend([p.lon, p.lat])
  map.fitBounds(bounds, { padding: 24, duration: 0 })
}
