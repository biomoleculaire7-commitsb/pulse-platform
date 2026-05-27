import { useEffect, useRef, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Disease → color mapping
const DISEASE_COLORS = {
  'COVID-19': '#ff4757',
  'Influenza': '#ffa502',
  'Dengue':   '#ff6b81',
  'Malaria':  '#eccc68',
  'Cholera':  '#1e90ff',
  'Ebola':    '#8c00ff',
  'default':  '#00ffaa',
}

function diseaseColor(disease) {
  for (const [key, color] of Object.entries(DISEASE_COLORS)) {
    if (disease?.toLowerCase().includes(key.toLowerCase())) return color
  }
  return DISEASE_COLORS.default
}

function makeCircleIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:10px;height:10px;
      border-radius:50%;
      background:${color};
      border:2px solid rgba(255,255,255,0.3);
      box-shadow:0 0 6px ${color};
    "></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })
}

export default function MapView({ infections, heatmapData, mapMode, setMapMode, loading }) {
  const mapRef       = useRef(null)
  const mapInstance  = useRef(null)
  const markersLayer = useRef(null)
  const heatLayer    = useRef(null)

  // Initialize map
  useEffect(() => {
    if (mapInstance.current) return
    mapInstance.current = L.map(mapRef.current, {
      center: [24, 45],
      zoom: 5,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapInstance.current)

    markersLayer.current = L.layerGroup().addTo(mapInstance.current)

    return () => {
      mapInstance.current?.remove()
      mapInstance.current = null
    }
  }, [])

  // Update markers
  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current) return
    markersLayer.current.clearLayers()

    if (mapMode !== 'markers') return

    infections.forEach(rec => {
      const color = diseaseColor(rec.disease)
      const marker = L.marker([rec.latitude, rec.longitude], {
        icon: makeCircleIcon(color),
      })
      marker.bindPopup(`
        <div style="font-family:IBM Plex Sans Arabic,sans-serif;direction:rtl;min-width:160px">
          <div style="font-weight:600;margin-bottom:4px;color:${color}">${rec.disease}</div>
          <div style="font-size:12px;color:#888">الحالة: <b style="color:#e8f0f8">${rec.status}</b></div>
          <div style="font-size:12px;color:#888">الخطورة: <b style="color:#e8f0f8">${rec.severity}</b></div>
          <div style="font-size:12px;color:#888">التاريخ: <b style="color:#e8f0f8">${rec.infection_date}</b></div>
          ${rec.region ? `<div style="font-size:12px;color:#888">المنطقة: <b style="color:#e8f0f8">${rec.region}</b></div>` : ''}
        </div>
      `, { className: 'dark-popup' })
      markersLayer.current.addLayer(marker)
    })
  }, [infections, mapMode])

  // Update heatmap
  useEffect(() => {
    if (!mapInstance.current) return

    // Remove existing heat layer
    if (heatLayer.current) {
      mapInstance.current.removeLayer(heatLayer.current)
      heatLayer.current = null
    }

    if (mapMode !== 'heatmap' || !heatmapData.length) return

    // Dynamically load leaflet.heat
    import('leaflet.heat').then(() => {
      heatLayer.current = L.heatLayer(heatmapData, {
        radius: 25,
        blur: 20,
        maxZoom: 10,
        gradient: { 0.2: '#1e90ff', 0.5: '#ffa502', 0.8: '#ff4757', 1.0: '#ffffff' },
      }).addTo(mapInstance.current)
    }).catch(() => {
      // fallback: show markers
      console.warn('leaflet.heat not available, falling back to markers')
    })
  }, [heatmapData, mapMode])

  return (
    <div className="map-panel">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Map controls overlay */}
      <div className="map-overlay">
        <div className="map-badge">
          <span style={{ color: 'var(--text-secondary)', fontSize: 10, marginLeft: 4 }}>عرض:</span>
          <button className={mapMode === 'markers'  ? 'active' : ''} onClick={() => setMapMode('markers')}>
            📍 نقاط
          </button>
          <span className="sep">|</span>
          <button className={mapMode === 'heatmap' ? 'active' : ''} onClick={() => setMapMode('heatmap')}>
            🌡 حرارة
          </button>
        </div>

        {loading && (
          <div className="map-badge" style={{ color: 'var(--accent)' }}>
            <span className="spinner">⟳</span>
            <span style={{ fontSize: 10 }}>جاري التحديث...</span>
          </div>
        )}

        <div className="map-badge" style={{ flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>دليل الألوان</span>
          {Object.entries(DISEASE_COLORS).filter(([k]) => k !== 'default').map(([name, color]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 4px ${color}` }} />
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{name}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: DISEASE_COLORS.default, boxShadow: `0 0 4px ${DISEASE_COLORS.default}` }} />
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>أخرى</span>
          </div>
        </div>
      </div>

      {/* Popup dark styles injected */}
      <style>{`
        .dark-popup .leaflet-popup-content-wrapper {
          background: #0d1117;
          border: 1px solid rgba(0,255,170,0.2);
          border-radius: 8px;
          color: #e8f0f8;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        }
        .dark-popup .leaflet-popup-tip { background: #0d1117; }
        .leaflet-popup-close-button { color: #7a9bb5 !important; }
      `}</style>
    </div>
  )
}
