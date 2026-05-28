import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { usePolling } from '../hooks/usePolling.js'
import { fetchTimeseries } from '../api.js'
import ExportButton from './ExportButton.jsx'
import AiForecast from './AiForecast.jsx'

const fmt = (n) => n?.toLocaleString() ?? '—'

const KPI_CONFIG = [
  { key: 'today_cases',     icon: '🦠', ar: 'حالات اليوم',    en: "Today's Cases",  variant: 'danger'  },
  { key: 'active_cases',    icon: '⚡', ar: 'حالات نشطة',     en: 'Active Cases',   variant: 'warning' },
  { key: 'recovered_cases', icon: '💚', ar: 'متعافون',         en: 'Recovered',      variant: 'accent'  },
  { key: 'total_cases',     icon: '📊', ar: 'إجمالي الحالات', en: 'Total Cases',    variant: 'info'    },
]

const COLORS = { danger: 'var(--danger)', warning: 'var(--warning)', accent: 'var(--accent)', info: 'var(--info)' }

function KpiCard({ icon, ar, en, value, variant }) {
  return (
    <div className={`kpi-card ${variant}`} style={{ gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: COLORS[variant] }}>{ar}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{en}</div>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color: COLORS[variant] }}>{fmt(value)}</div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
      <div style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ color: 'var(--accent)' }}>{payload[0].value} cases</div>
    </div>
  )
}

export default function Sidebar({ stats, filters, setFilters, selectedDisease, setSelectedDisease, infections }) {
  const ts = usePolling(() => fetchTimeseries(30), 120_000)

  const maxDisease = useMemo(() => {
    if (!stats?.by_disease?.length) return 1
    return Math.max(...stats.by_disease.map(d => d.count))
  }, [stats?.by_disease])

  const handleFilter = (key) => (e) => setFilters(f => ({ ...f, [key]: e.target.value }))

  return (
    <aside className="sidebar">
      {/* KPI */}
      <div className="kpi-grid">
        {KPI_CONFIG.map(cfg => <KpiCard key={cfg.key} {...cfg} value={stats?.[cfg.key]} />)}
      </div>

      {/* Export */}
      <ExportButton infections={infections} stats={stats} />

      {/* Filters */}
      <div className="filters">
        <div className="section-head" style={{ padding: '8px 0 6px', border: 'none' }}>
          🔍 Filters / الفلاتر
        </div>
        <div className="filter-row">
          <span className="filter-label">🦠 Disease</span>
          <input type="text" placeholder="All diseases" value={filters.disease} onChange={handleFilter('disease')} />
        </div>
        <div className="filter-row">
          <span className="filter-label">📅 From</span>
          <input type="date" value={filters.date_from} onChange={handleFilter('date_from')} />
        </div>
        <div className="filter-row">
          <span className="filter-label">📅 To</span>
          <input type="date" value={filters.date_to} onChange={handleFilter('date_to')} />
        </div>
        <div className="filter-row">
          <span className="filter-label">📋 Status</span>
          <select value={filters.status} onChange={handleFilter('status')}>
            <option value="">All / الكل</option>
            <option value="active">Active / نشط</option>
            <option value="recovered">Recovered / متعافٍ</option>
            <option value="deceased">Deceased / وفاة</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="section-head">📈 Timeline / المنحنى الزمني (30 days)</div>
      <div className="chart-wrap">
        {ts.data ? (
          <ResponsiveContainer width="100%" height={85}>
            <AreaChart data={ts.data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00ffaa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ffaa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#3d5a73' }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 8, fill: '#3d5a73' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#00ffaa" strokeWidth={1.5} fill="url(#cg)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 85, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Loading...</div>
        )}
      </div>

      {/* AI Forecast */}
      <div className="section-head">🤖 AI Forecast / التنبؤ الذكي</div>
      <AiForecast trendData={ts.data} />

      {/* Disease breakdown */}
      <div className="section-head">🏥 Disease Breakdown / توزيع الأمراض</div>
      <div className="disease-list">
        {stats?.by_disease?.length ? (
          <>
            <div className={`disease-row ${!selectedDisease ? 'active' : ''}`} onClick={() => setSelectedDisease(null)}>
              <span className="disease-name">🌍 All / الكل</span>
              <span className="disease-count">{fmt(stats.total_cases)}</span>
            </div>
            {stats.by_disease.map(d => (
              <div key={d.disease}
                className={`disease-row ${selectedDisease === d.disease ? 'active' : ''}`}
                onClick={() => setSelectedDisease(selectedDisease === d.disease ? null : d.disease)}>
                <span className="disease-name">{d.disease}</span>
                <div className="disease-bar-wrap">
                  <div className="disease-bar" style={{ width: `${(d.count / maxDisease) * 100}%` }} />
                </div>
                <span className="disease-count">{d.count}</span>
              </div>
            ))}
          </>
        ) : (
          <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>No data / لا توجد بيانات</div>
        )}
      </div>
    </aside>
  )
}
