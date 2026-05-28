/**
 * AlertBanner — نظام التنبيهات الذكي
 * يظهر تنبيهاً عندما تتجاوز حالات اليوم حداً معيناً
 */
import { useState, useEffect } from 'react'

const ALERT_THRESHOLD = 5  // تنبيه عند تجاوز 5 حالات جديدة اليوم

export default function AlertBanner({ stats }) {
  const [dismissed, setDismissed] = useState(false)
  const [alerts, setAlerts]       = useState([])

  useEffect(() => {
    if (!stats) return
    const newAlerts = []

    if (stats.today_cases >= ALERT_THRESHOLD) {
      newAlerts.push({
        id: 'today',
        level: stats.today_cases >= 20 ? 'critical' : 'warning',
        message: `⚠️ ${stats.today_cases} new cases today`,
        messageAr: `${stats.today_cases} حالة جديدة اليوم — تنبيه صحي`,
      })
    }

    if (stats.by_disease) {
      stats.by_disease.forEach(d => {
        if (d.count >= 3) {
          newAlerts.push({
            id: d.disease,
            level: 'info',
            message: `🦠 ${d.disease}: ${d.count} active cases detected`,
            messageAr: `${d.disease}: ${d.count} حالة نشطة`,
          })
        }
      })
    }

    setAlerts(newAlerts)
    setDismissed(false)
  }, [stats?.today_cases])

  if (!alerts.length || dismissed) return null

  const colors = {
    critical: { bg: 'rgba(255,71,87,0.15)', border: '#ff4757', text: '#ff4757' },
    warning:  { bg: 'rgba(255,165,2,0.15)',  border: '#ffa502', text: '#ffa502' },
    info:     { bg: 'rgba(0,255,170,0.1)',   border: '#00ffaa', text: '#00ffaa' },
  }

  const topAlert = alerts[0]
  const c = colors[topAlert.level]

  return (
    <div style={{
      background: c.bg,
      borderBottom: `2px solid ${c.border}`,
      padding: '8px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: 12,
      color: c.text,
      animation: 'pulse-alert 2s infinite',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontWeight: 700 }}>🚨 ALERT</span>
        <span>{topAlert.message}</span>
        <span style={{ color: 'var(--text-secondary)' }}>|</span>
        <span style={{ direction: 'rtl' }}>{topAlert.messageAr}</span>
        {alerts.length > 1 && (
          <span style={{ background: c.border, color: '#000', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
            +{alerts.length - 1} more
          </span>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', color: c.text, cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
      >✕</button>
    </div>
  )
}
