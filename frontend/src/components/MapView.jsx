import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const DISEASE_COLORS = {
  'COVID-19': '#ff4757',
  'Influenza': '#ffa502',
  'Dengue': '#ff6b81',
  'Malaria': '#eccc68',
  'Cholera': '#1e90ff',
  'Ebola': '#8c00ff',
  'Ascaris lumbricoides': '#ff6348',
  'Ascaris': '#ff6348',
  'Parasites': '#ff6348',
  'default': '#00ffaa',
}

function diseaseColor(disease) {
  if (!disease) return DISEASE_COLORS.default
  for (const [key, color] of Object.entries(DISEASE_COLORS)) {
    if (disease.toLowerCase().includes(key.toLowerCase())) return color
  }
  return DISEASE_COLORS.default
}

function makeCircleIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.3);box-shadow:0 0 6px ${color};"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })
}

export default function MapView({ infections, heatmapData, mapMode, setMapMode, loading }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersLayer = useRef(null)
  const heatLayer = useRef(null)

  useEffect(() => {
    if (mapInstance.current) return
    mapInstance.current = L.map(mapRef.current, { center: [24, 45], zoom: 5 })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 19,
    }).addTo(mapInstance.current)
    markersLayer.current = L.layerGroup().addTo(mapInstance.current)
    return () => { mapInstance.current?.remove(); mapInstance.current = null }
  }, [])

  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current) return
    markersLayer.current.clearLayers()
    if (mapMode !== 'markers') return
    infections.forEach(rec => {
      const color = diseaseColor(rec.disease)
      const marker = L.marker([rec.latitude, rec.longitude], { icon: makeCircleIcon(color) })
      marker.bindPopup(`
        <div style="font-family:sans-serif;min-width:160px">
          <div style="font-weight:600;margin-bottom:4px;color:${color}">${rec.disease}</div>
          <div style="font-size:12px">Status: <b>${rec.status}</b></div>
          <div style="font-size:12px">Severity: <b>${rec.severity}</b></div>
          <div style="font-size:12px">Date: <b>${rec.infection_date}</b></div>
          ${rec.region ? `<div style="font-size:12px">Region: <b>${rec.region}</b></div>` : ''}
        </div>`)
      markersLayer.current.addLayer(marker)
    })
  }, [infections, mapMode])

  useEffect(() => {
    if (!mapInstance.current) return
    if (heatLayer.current) { mapInstance.current.removeLayer(heatLayer.current); heatLayer.current = null }
    if (mapMode !== 'heatmap' || !heatmapData.length) return
    import('leaflet.heat').then(() => {
      heatLayer.current = L.heatLayer(heatmapData, { radius: 25, blur: 20, maxZoom: 10 }).addTo(mapInstance.current)
    })
  }, [heatmapData, mapMode])

  const legendItems = [
    { name: 'COVID-19', color: '#ff4757' },
    { name: 'Influenza', color: '#ffa502' },
    { name: 'Dengue', color: '#ff6b81' },
    { name: 'Malaria', color: '#eccc68' },
    { name: 'Cholera', color: '#1e90ff' },
    { name: 'Ebola', color: '#8c00ff' },
    { name: 'Ascaris / Parasites', color: '#ff6348' },
    { name: 'Other / أخرى', color: '#00ffaa' },
  ]

  return (
    <div className="map-panel">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      <div className="map-overlay">
        <div className="map-badge">
          <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>View / عرض:</span>
          <button className={mapMode === 'markers' ? 'active' : ''} onClick={() => setMapMode('markers')}>📍 Markers / نقاط</button>
          <span className="sep">|</span>
          <button className={mapMode === 'heatmap' ? 'active' : ''} onClick={() => setMapMode('heatmap')}>🌡 Heatmap / حرارة</button>
        </div>
        {loading && <div className="map-badge" style={{ color: 'var(--accent)' }}><span className="spinner">⟳</span><span style={{ fontSize: 10 }}>Updating...</span></div>}
        <div className="map-badge" style={{ flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Legend / دليل الألوان</span>
          {legendItems.map(({ name, color }) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
