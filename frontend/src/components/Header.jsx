import { format } from 'date-fns'

export default function Header({ lastUpdated, loading }) {
  return (
    <header className="header">
      <div className="header-logo">
        <div className="pulse-dot" />
        <h1>
          <span>PULSE</span> — المراقبة الصحية الحينية
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 8, fontWeight: 400 }}>
            Real-time Health Monitoring
          </span>
        </h1>
        <div className="badge">LIVE</div>
      </div>

      <div className="header-right">
        {loading && (
          <span className="spinner" style={{ fontSize: 16, color: 'var(--accent)' }}>⟳</span>
        )}
        <span className="last-update">
          {lastUpdated
            ? `آخر تحديث / Last update: ${format(lastUpdated, 'HH:mm:ss')}`
            : 'جاري التحميل... Loading'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          تحديث كل 2 دقيقة / Every 2 min / Every 30s
        </span>
      </div>
    </header>
  )
}
