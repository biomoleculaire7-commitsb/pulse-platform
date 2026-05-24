import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { usePolling } from '../hooks/usePolling.js'
import { fetchTimeseries } from '../api.js'

const fmt = (n) => n?.toLocaleString('ar-EG') ?? '—'

function KpiCard({ label, value, variant = 'accent', delta }) {
  return (
    <div className={`kpi-card ${variant}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{fmt(value)}</div>
      {delta != null && <div className="kpi-delta">{delta}</div>}
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
        {payload[0].value} حالة
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
        <KpiCard label="حالات اليوم"     value={stats?.today_cases}     variant="danger" />
        <KpiCard label="حالات نشطة"      value={stats?.active_cases}    variant="warning" />
        <KpiCard label="متعافون"          value={stats?.recovered_cases} variant="accent" />
        <KpiCard label="إجمالي الحالات"  value={stats?.total_cases}     variant="info" />
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="section-head" style={{ padding: '8px 0 6px', border: 'none' }}>الفلاتر</div>
        <div className="filter-row">
          <span className="filter-label">المرض</span>
          <input type="text" placeholder="جميع الأمراض" value={filters.disease} onChange={handleFilter('disease')} />
        </div>
        <div className="filter-row">
          <span className="filter-label">من</span>
          <input type="date" value={filters.date_from} onChange={handleFilter('date_from')} />
        </div>
        <div className="filter-row">
          <span className="filter-label">إلى</span>
          <input type="date" value={filters.date_to} onChange={handleFilter('date_to')} />
        </div>
        <div className="filter-row">
          <span className="filter-label">الحالة</span>
          <select value={filters.status} onChange={handleFilter('status')}>
            <option value="">الكل</option>
            <option value="active">نشط</option>
            <option value="recovered">متعافٍ</option>
            <option value="deceased">وفاة</option>
          </select>
        </div>
      </div>

      {/* Time series chart */}
      <div className="section-head">المنحنى الزمني (30 يوم)</div>
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
            جاري التحميل...
          </div>
        )}
      </div>

      {/* Disease breakdown */}
      <div className="section-head">توزيع الأمراض</div>
      <div className="disease-list">
        {stats?.by_disease?.length ? (
          <>
            <div
              className={`disease-row ${!selectedDisease ? 'active' : ''}`}
              onClick={() => setSelectedDisease(null)}
            >
              <span className="disease-name">جميع الأمراض</span>
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
            لا توجد بيانات
          </div>
        )}
      </div>
    </aside>
  )
}
