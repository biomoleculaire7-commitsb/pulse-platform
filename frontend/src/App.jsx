import { useState, useMemo } from 'react'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import MapView from './components/MapView.jsx'
import { usePolling } from './hooks/usePolling.js'
import { fetchStats, fetchInfections, fetchHeatmap } from './api.js'
import { format } from 'date-fns'

const POLL_INTERVAL = 120_000 // 30 seconds

export default function App() {
  const [filters, setFilters] = useState({
    disease: '',
    date_from: '',
    date_to: '',
    status: '',
  })
  const [mapMode, setMapMode] = useState('markers') // 'markers' | 'heatmap'
  const [selectedDisease, setSelectedDisease] = useState(null)

  // Active filter params (cleaned)
  const activeFilters = useMemo(() => {
    const p = {}
    if (filters.disease)   p.disease   = filters.disease
    if (filters.date_from) p.date_from = filters.date_from
    if (filters.date_to)   p.date_to   = filters.date_to
    if (filters.status)    p.status    = filters.status
    if (selectedDisease)   p.disease   = selectedDisease
    return p
  }, [filters, selectedDisease])

  const stats      = usePolling(() => fetchStats(), POLL_INTERVAL)
  const infections = usePolling(() => fetchInfections({ ...activeFilters, size: 2000 }), POLL_INTERVAL, [activeFilters])
  const heatmap    = usePolling(() => fetchHeatmap(activeFilters), POLL_INTERVAL, [activeFilters])

  return (
    <div className="layout">
      <Header lastUpdated={stats.lastUpdated} loading={stats.loading} />
      <div className="main-content">
        <Sidebar
          stats={stats.data}
          filters={filters}
          setFilters={setFilters}
          selectedDisease={selectedDisease}
          setSelectedDisease={setSelectedDisease}
        />
        <MapView
          infections={infections.data?.items || []}
          heatmapData={heatmap.data || []}
          mapMode={mapMode}
          setMapMode={setMapMode}
          loading={infections.loading}
        />
      </div>
    </div>
  )
}
