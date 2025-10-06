import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { type Map as MapLibreMap, type LngLatLike, type GeoJSONSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { format } from 'date-fns'

// EONET API base
const EONET_BASE = 'https://eonet.gsfc.nasa.gov/api/v3'

// Categories mapping to colors (approximate visual palette)
const CATEGORY_COLORS: Record<string, string> = {
  'wildfires': '#ff7b7b',
  'severeStorms': '#ffd166',
  'volcanoes': '#f94144',
  'seaLakeIce': '#90e0ef',
  'snow': '#a8dadc',
  'dustHaze': '#e9c46a',
  'earthquakes': '#f3722c',
  'floods': '#43aa8b',
  'manmade': '#bdb2ff',
  'waterColor': '#48cae4',
  'landslides': '#8ecae6',
}

// Nice default style
const DEFAULT_STYLE = 'https://demotiles.maplibre.org/style.json'

// Utility: clamp date range to last N days
function getDefaultDateRange(days: number = 30) {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - days)
  return { start, end }
}

// Fetch helper with abort
async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

// Types (subset of EONET)
interface EonetCategory {
  id: number
  title: string
  description?: string
  layers?: { service: string; name: string }[]
}

interface EonetGeometry {
  magnitudeValue?: number
  magnitudeUnit?: string
  date: string
  type: 'Point' | 'Polygon'
  coordinates: number[] | number[][][]
}

interface EonetEvent {
  id: string
  title: string
  closed?: string
  categories: { id: number; title: string }[]
  geometry: EonetGeometry[]
}

interface EventsResponse {
  events: EonetEvent[]
}

export function NasaMap() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [categories, setCategories] = useState<EonetCategory[]>([])
  const [{ start, end }, setRange] = useState(getDefaultDateRange(45))
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eventCount, setEventCount] = useState(0)

  // Load categories once
  useEffect(() => {
    const controller = new AbortController()
    fetchJson<{ categories: EonetCategory[] }>(`${EONET_BASE}/categories`, controller.signal)
      .then((data) => setCategories(data.categories))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DEFAULT_STYLE,
      center: [-40, -15] as LngLatLike,
      zoom: 2.2,
      attributionControl: false,
      pitch: 35,
      bearing: -5,
      hash: false,
    })

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    map.on('load', () => {
      // Add empty source and styled circle layer for events
      map.addSource('eonet-events', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'eonet-circles',
        type: 'circle',
        source: 'eonet-events',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            0, 2, 3, 3, 5, 5, 7, 7, 9, 10
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'categoryKey'], 'wildfires'], '#ff7b7b',
            ['==', ['get', 'categoryKey'], 'severeStorms'], '#ffd166',
            ['==', ['get', 'categoryKey'], 'volcanoes'], '#f94144',
            ['==', ['get', 'categoryKey'], 'seaLakeIce'], '#90e0ef',
            ['==', ['get', 'categoryKey'], 'snow'], '#a8dadc',
            ['==', ['get', 'categoryKey'], 'dustHaze'], '#e9c46a',
            ['==', ['get', 'categoryKey'], 'earthquakes'], '#f3722c',
            ['==', ['get', 'categoryKey'], 'floods'], '#43aa8b',
            ['==', ['get', 'categoryKey'], 'manmade'], '#bdb2ff',
            ['==', ['get', 'categoryKey'], 'waterColor'], '#48cae4',
            ['==', ['get', 'categoryKey'], 'landslides'], '#8ecae6',
            '#7aa2ff'
          ],
          'circle-opacity': 0.9,
          'circle-stroke-width': 1.2,
          'circle-stroke-color': 'rgba(0,0,0,0.5)'
        }
      })

      // Popup on click
      map.on('click', 'eonet-circles', (e) => {
        const feature = e.features?.[0]
        if (!feature) return
        const props = feature.properties as any
        const title = props.title as string
        const date = props.latestDate as string
        const cat = props.category as string
        const color = props.color as string

        const html = `
          <div style="min-width:220px;font-family:inherit">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${color}"></span>
              <strong>${title}</strong>
            </div>
            <div style="color:#c7d2fe;font-size:12px">${cat}</div>
            <div style="color:#9fb0ff;font-size:12px">${date}</div>
          </div>`

        new maplibregl.Popup({ closeButton: true })
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map)
      })

      mapRef.current = map
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Build EONET query params
  const queryUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set('status', 'open')
    if (start) params.set('start', format(start, 'yyyy-MM-dd'))
    if (end) params.set('end', format(end, 'yyyy-MM-dd'))
    if (selectedCategory) params.set('category', selectedCategory)
    params.set('limit', '250')
    return `${EONET_BASE}/events?${params.toString()}`
  }, [start, end, selectedCategory])

  // Load events according to filters and update source
  useEffect(() => {
    if (!mapRef.current) return

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetchJson<EventsResponse>(queryUrl, controller.signal)
      .then(({ events }) => {
        // Convert events to GeoJSON features
        const features = events.flatMap((ev) => {
          const lastPoint = [...ev.geometry].reverse().find(g => g.type === 'Point')
          if (!lastPoint || !Array.isArray(lastPoint.coordinates)) return []
          const coord = lastPoint.coordinates as number[]
          const cat = ev.categories[0]?.title || 'Unknown'
          const categoryKey = normalizeCategoryKey(cat)
          const color = CATEGORY_COLORS[categoryKey] || '#7aa2ff'
          return [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: coord },
            properties: {
              id: ev.id,
              title: ev.title,
              category: cat,
              categoryKey,
              color,
              latestDate: format(new Date(lastPoint.date), 'yyyy-MM-dd HH:mm')
            }
          }]
        })

        const collection = { type: 'FeatureCollection', features } as const
        const source = mapRef.current!.getSource('eonet-events') as GeoJSONSource
        source.setData(collection as any)
        setEventCount(features.length)

        // Fit to bounds if we have features
        if (features.length > 0) {
          const bounds = new maplibregl.LngLatBounds()
          for (const f of features) bounds.extend(f.geometry.coordinates as [number, number])
          mapRef.current!.fitBounds(bounds, { padding: 40, duration: 800 })
        }
      })
      .catch((err) => {
        setError(err.message || 'Falha ao carregar dados')
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [queryUrl])

  function normalizeCategoryKey(title: string): string {
    const key = title
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[()]/g, '')
      .replace(/\//g, '')
    return key
  }

  const legends = useMemo(() => [
    { key: 'wildfires', label: 'Incêndios', color: CATEGORY_COLORS['wildfires'] },
    { key: 'severeStorms', label: 'Tempestades', color: CATEGORY_COLORS['severeStorms'] },
    { key: 'volcanoes', label: 'Vulcões', color: CATEGORY_COLORS['volcanoes'] },
    { key: 'earthquakes', label: 'Terremotos', color: CATEGORY_COLORS['earthquakes'] },
    { key: 'floods', label: 'Inundações', color: CATEGORY_COLORS['floods'] },
  ], [])

  return (
    <div style={{ position: 'relative' }}>
      <div className="toolbar">
        <div className="panel">
          <div className="controls">
            <label>Categoria</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id.toString()}>{c.title}</option>
              ))}
            </select>

            <label>Início</label>
            <input
              type="date"
              value={format(start, 'yyyy-MM-dd')}
              onChange={(e) => setRange({ start: new Date(e.target.value), end })}
            />

            <label>Fim</label>
            <input
              type="date"
              value={format(end, 'yyyy-MM-dd')}
              onChange={(e) => setRange({ start, end: new Date(e.target.value) })}
            />

            <div className="full" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="pill">{loading ? 'Carregando…' : `${eventCount} eventos`}</span>
              {error ? <span style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</span> : null}
            </div>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="map-container" />

      <div className="legend">
        {legends.map((l) => (
          <div key={l.key} className="item">
            <span className="dot" style={{ background: l.color }} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      <div className="attribution">
        © OpenMapTiles · © OpenStreetMap contributors
      </div>
    </div>
  )
}
