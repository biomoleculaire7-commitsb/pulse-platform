/**
 * AiForecast — التنبؤ الذكي بالأوبئة
 * يحلل المنحنى الزمني ويتنبأ بالأيام القادمة
 * باستخدام Linear Regression بسيط
 */
import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

function linearRegression(data) {
  const n = data.length
  if (n < 3) return null
  const x = data.map((_, i) => i)
  const y = data.map(d => d.count)
  const sumX  = x.reduce((a, b) => a + b, 0)
  const sumY  = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((a, i) => a + i * y[i], 0)
  const sumX2 = x.reduce((a, i) => a + i * i, 0)
  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

export default function AiForecast({ trendData }) {
  const forecastData = useMemo(() => {
    if (!trendData?.length) return []

    const reg = linearRegression(trendData)
    if (!reg) return trendData

    // Add 7 days forecast
    const lastDate = new Date(trendData[trendData.length - 1]?.date || new Date())
    const forecast = []

    // Historical data
    trendData.forEach((d, i) => {
      forecast.push({
        date:      d.date.slice(5),
        actual:    d.count,
        predicted: null,
      })
    })

    // Predicted future
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date(lastDate)
      futureDate.setDate(futureDate.getDate() + i)
      const dateStr = futureDate.toISOString().slice(5, 10)
      const predicted = Math.max(0, Math.round(
        reg.slope * (trendData.length + i - 1) + reg.intercept
      ))
      forecast.push({ date: dateStr, actual: null, predicted })
    }

    return forecast
  }, [trendData])

  const trend = useMemo(() => {
    if (!trendData?.length) return null
    const reg = linearRegression(trendData)
    if (!reg) return null
    if (reg.slope > 0.5)  return { label: '📈 Increasing / تصاعدي', color: '#ff4757' }
    if (reg.slope < -0.5) return { label: '📉 Decreasing / تراجعي', color: '#00ffaa' }
    return { label: '➡️ Stable / مستقر', color: '#ffa502' }
  }, [trendData])

  if (!forecastData.length) return null

  return (
    <div style={{ padding: '8px 8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
          🤖 AI Forecast / التنبؤ الذكي
        </span>
        {trend && (
          <span style={{ fontSize: 10, color: trend.color, fontWeight: 600 }}>
            {trend.label}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={forecastData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#3d5a73' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 8, fill: '#3d5a73' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: 11 }}
            formatter={(v, name) => [v, name === 'actual' ? 'Actual' : '🤖 Forecast']}
          />
          <ReferenceLine x={forecastData.find(d => d.predicted !== null)?.date}
            stroke="var(--border-bright)" strokeDasharray="3 3" label={{ value: 'Today', fontSize: 8, fill: 'var(--text-muted)' }} />
          <Line type="monotone" dataKey="actual"    stroke="#00ffaa" strokeWidth={1.5} dot={false} connectNulls={false} />
          <Line type="monotone" dataKey="predicted" stroke="#ff4757" strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 2 }}>
        <span style={{ fontSize: 9, color: '#00ffaa' }}>— Actual</span>
        <span style={{ fontSize: 9, color: '#ff4757' }}>-- AI Forecast (7 days)</span>
      </div>
    </div>
  )
}
