import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CircleMarker, MapContainer, Popup, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import { MAP_CENTER, STATUS, CATEGORIES } from '../lib/constants'
import { useTheme } from '../context/ThemeContext'

const TILES = {
  light: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
}
const ATTRIBUTION = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'

function FitBounds({ points }) {
  const map = useMap()
  const key = points.map((p) => p.join(',')).join('|')
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [60, 60], maxZoom: 15 })
    else if (points.length === 1) map.setView(points[0], 16)
    // refit only when the set of visible points changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])
  return null
}

// Keeps the selected pin on screen and clears the selection on a background click
function SelectionEvents({ selected, onSelect }) {
  const map = useMap()
  useMapEvents({ click: () => onSelect(null) })
  useEffect(() => {
    if (!selected) return
    // Leave room for the floating filter (left) and detail (right) panels on wide screens
    const wide = map.getSize().x >= 900
    map.panInside([selected.location.lat, selected.location.lng], wide
      ? { paddingTopLeft: [340, 80], paddingBottomRight: [360, 80] }
      : { paddingTopLeft: [40, 80], paddingBottomRight: [40, 260] })
  }, [map, selected])
  return null
}

export const IMPACT_RING = '#f5a524'
export const HEALTH_LEGEND = [['Good (70+)', '#34d399'], ['Fair (40–69)', '#f5c542'], ['Poor (<40)', '#ff6b6b'], ['Not scored', '#8a8a93']]
const HEALTH_PIN = (h) => (h == null ? HEALTH_LEGEND[3][1] : h >= 70 ? HEALTH_LEGEND[0][1] : h >= 40 ? HEALTH_LEGEND[1][1] : HEALTH_LEGEND[2][1])
export const pinColor = (a, mode) => (mode === 'health' ? HEALTH_PIN(a.healthScore) : STATUS[a.status]?.pin)

// Canvas-rendered pins can't read CSS variables, so theme colours are resolved here
const RING = { dark: '#1a1a1c', light: '#ffffff' }
const SELECTED = { dark: '#c9b3ff', light: '#7552e6' }

/**
 * Pass `onSelect` to drive an external detail panel (pins become click targets, no popups);
 * without it pins open a small Leaflet popup.
 */
export default function AssetMap({ assets, mode = 'status', height = '100%', interactive = true, fit = true, onSelect, selectedId }) {
  const { theme } = useTheme()
  const points = assets.map((a) => [a.location.lat, a.location.lng])
  const selected = selectedId ? assets.find((a) => a._id === selectedId) : null
  return (
    <MapContainer
      center={points[0] ?? MAP_CENTER} zoom={interactive ? 13 : 15} maxZoom={17} preferCanvas scrollWheelZoom={interactive}
      dragging={interactive} zoomControl={false} style={{ height, width: '100%' }}
    >
      <TileLayer key={theme} url={TILES[theme]} attribution={ATTRIBUTION} />
      {interactive && <ZoomControl position="bottomright" />}
      {fit && <FitBounds points={points} />}
      {onSelect && <SelectionEvents selected={selected} onSelect={onSelect} />}
      {assets.map((a) => {
        const big = ['BRIDGE', 'WATER_PUMP', 'PUBLIC_BUILDING', 'FEEDER_PILLAR'].includes(a.category)
        const isSel = a._id === selectedId
        const base = big ? 9 : a.impactedBy ? 7 : 6
        // Assets knocked out by an upstream failure get a dashed amber ring
        const style = isSel
          ? { color: SELECTED[theme], weight: 4, fillColor: pinColor(a, mode), fillOpacity: 1 }
          : a.impactedBy
            ? { color: IMPACT_RING, weight: 3, dashArray: '3 3', fillColor: pinColor(a, mode), fillOpacity: 0.95 }
            : { color: RING[theme], weight: 1.5, fillColor: pinColor(a, mode), fillOpacity: 0.95 }
        return (
          <CircleMarker
            key={a._id} center={[a.location.lat, a.location.lng]} radius={isSel ? base + 4 : base} pathOptions={style}
            eventHandlers={onSelect ? { click: (e) => { e.originalEvent.stopPropagation(); onSelect(a) } } : undefined}
            bubblingMouseEvents={!onSelect}
          >
            {interactive && !onSelect && (
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-mono text-xs text-ink-3">{a.assetCode} · {CATEGORIES[a.category]?.label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink">{a.name}</p>
                  <p className="mt-1.5 text-xs text-ink-2">
                    <span style={{ color: STATUS[a.status]?.pin }}>●</span> {STATUS[a.status]?.label} · Health {a.healthScore ?? '—'}
                  </p>
                  <Link to={`/assets/${a._id}`} className="mt-2 inline-block text-xs font-semibold text-brand-700">Open asset →</Link>
                </div>
              </Popup>
            )}
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
