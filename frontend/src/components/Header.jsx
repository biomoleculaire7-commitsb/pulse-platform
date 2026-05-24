import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

export default function Header({ lastUpdated, loading }) {
  return (
    <header className="header">
      <div className="header-logo">
        <div className="pulse-dot" />
        <h1>
          <span>PULSE</span> — المراقبة الصحية الحينية
        </h1>
        <div className="badge">LIVE</div>
      </div>

      <div className="header-right">
        {loading && (
          <span className="spinner" style={{ fontSize: 16, color: 'var(--accent)' }}>⟳</span>
        )}
        <span className="last-update">
          {lastUpdated
            ? `آخر تحديث: ${format(lastUpdated, 'HH:mm:ss')}`
            : 'جاري التحميل...'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          تحديث كل 30 ث
        </span>
      </div>
    </header>
  )
}
