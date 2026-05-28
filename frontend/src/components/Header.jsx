import { format } from 'date-fns'

export default function Header({ lastUpdated, loading }) {
  return (
    <header className="header">
      <div className="header-logo">
        <div className="pulse-dot" />
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
            <span style={{ color: 'var(--accent)' }}>PULSE</span>
            {' '}—{' '}
            <span>المراقبة الصحية الحينية</span>
          </h1>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
            Real-time Health Monitoring Platform
          </div>
        </div>
        <div className="badge">LIVE</div>
      </div>

      <div className="header-right">
        {loading && <span className="spinner" style={{ fontSize: 16, color: 'var(--accent)' }}>⟳</span>}
        <div style={{ textAlign: 'right' }}>
          <div className="last-update" style={{ fontSize: 11 }}>
            {lastUpdated ? `Last update: ${format(lastUpdated, 'HH:mm:ss')}` : 'Loading...'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Auto-refresh every 2 min / تحديث كل دقيقتين
          </div>
        </div>
      </div>
    </header>
  )
}
