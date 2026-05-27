import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { usePolling } from '../hooks/usePolling.js'
import { fetchTimeseries } from '../api.js'

const fmt = (n) => n?.toLocaleString('ar-EG') ?? '—'

function KpiCard({ label, labelEn, value, variant = 'accent' }) {
  return (
    <div className={`kpi-card ${variant}`}>
      <div className="kpi-label">
        {label}
        <span style={{ display: 'block', fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
          {labelEn}
        </span>
      </div>
      <div className="kpi-value">{fmt(value)}</div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      padding: '8px 12px', borderRadius: 6, fontSize: 12,
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</div>
      <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
        {payload[0].value} حالة / Cases
      </div>
    </div>
  )
}

export default function Sidebar({ stats, filters, setFilters, selectedDisease, setSelectedDisease }) {
  const ts = usePolling(() => fetchTimeseries(30), 60_000)

  const maxDisease = useMemo(() => {
    if (!stats?.by_disease?.length) return 1
    return Math.max(...stats.by_disease.map(d => d.count))
  }, [stats?.by_disease])

  const handleFilter = (key) => (e) =>
    setFilters(f => ({ ...f, [key]: e.target.value }))

  return (
    <aside className="sidebar">
      {/* KPI grid */}
      <div className="kpi-grid">
        <KpiCard label="حالات اليوم"    labelEn="Today's Cases"    value={stats?.today_cases}     variant="danger" />
        <KpiCard label="حالات نشطة"     labelEn="Active Cases"     value={stats?.active_cases}    variant="warning" />
        <KpiCard label="متعافون"         labelEn="Recovered"        value={stats?.recovered_cases} variant="accent" />
        <KpiCard label="إجمالي الحالات" labelEn="Total Cases"      value={stats?.total_cases}     variant="info" />
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="section-head" style={{ padding: '8px 0 6px', border: 'none' }}>
          الفلاتر / Filters
        </div>
        <div className="filter-row">
          <span className="filter-label">المرض / Disease</span>
          <input type="text" placeholder="All diseases" value={filters.disease} onChange={handleFilter('disease')} />
        </div>
        <div className="filter-row">
          <span className="filter-label">من / From</span>
          <input type="date" value={filters.date_from} onChange={handleFilter('date_from')} />
        </div>
        <div className="filter-row">
          <span className="filter-label">إلى / To</span>
          <input type="date" value={filters.date_to} onChange={handleFilter('date_to')} />
        </div>
        <div className="filter-row">
          <span className="filter-label">الحالة / Status</span>
          <select value={filters.status} onChange={handleFilter('status')}>
            <option value="">All / الكل</option>
            <option value="active">Active / نشط</option>
            <option value="recovered">Recovered / متعافٍ</option>
            <option value="deceased">Deceased / وفاة</option>
          </select>
        </div>
      </div>

      {/* Time series chart */}
      <div className="section-head">المنحنى الزمني / Timeline (30 days)</div>
      <div className="chart-wrap">
        {ts.data ? (
          <ResponsiveContainer width="100%" height={90}>
            <AreaChart data={ts.data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00ffaa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ffaa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#3d5a73' }} tickLine={false} axisLine={false}
                tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 9, fill: '#3d5a73' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#00ffaa" strokeWidth={1.5}
                fill="url(#cg)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            Loading...
          </div>
        )}
      </div>

      {/* Disease breakdown */}
      <div className="section-head">توزيع الأمراض / Disease Breakdown</div>
      <div className="disease-list">
        {stats?.by_disease?.length ? (
          <>
            <div
              className={`disease-row ${!selectedDisease ? 'active' : ''}`}
              onClick={() => setSelectedDisease(null)}
            >
              <span className="disease-name">All / جميع الأمراض</span>
              <span className="disease-count">{fmt(stats.total_cases)}</span>
            </div>
            {stats.by_disease.map(d => (
              <div
                key={d.disease}
                className={`disease-row ${selectedDisease === d.disease ? 'active' : ''}`}
                onClick={() => setSelectedDisease(selectedDisease === d.disease ? null : d.disease)}
              >
                <span className="disease-name">{d.disease}</span>
                <div className="disease-bar-wrap">
                  <div className="disease-bar" style={{ width: `${(d.count / maxDisease) * 100}%` }} />
                </div>
                <span className="disease-count">{d.count}</span>
              </div>
            ))}
          </>
        ) : (
          <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
            No data / لا توجد بيانات
          </div>
        )}
      </div>
    </aside>
  )
}
