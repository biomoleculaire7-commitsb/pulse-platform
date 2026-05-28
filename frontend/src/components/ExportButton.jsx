/**
 * ExportButton — تصدير PDF و Excel
 * يستخدم jsPDF للـ PDF وSheetJS للـ Excel
 */
export default function ExportButton({ infections, stats }) {

  const exportExcel = () => {
    if (!infections?.length) return alert('No data to export')

    const rows = infections.map(r => ({
      'Disease / المرض':        r.disease,
      'Status / الحالة':        r.status,
      'Severity / الخطورة':     r.severity,
      'Region / المنطقة':       r.region || '-',
      'Date / التاريخ':         r.infection_date,
      'Latitude':               r.latitude,
      'Longitude':              r.longitude,
      'Source':                 r.source,
    }))

    // Build CSV
    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `PULSE_Report_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    if (!stats) return alert('No data to export')

    const content = `
PULSE — Real-time Health Monitoring Report
Generated: ${new Date().toLocaleString()}
==========================================

SUMMARY
-------
Today's Cases:   ${stats.today_cases}
Active Cases:    ${stats.active_cases}
Recovered:       ${stats.recovered_cases}
Total Cases:     ${stats.total_cases}

DISEASE BREAKDOWN
-----------------
${stats.by_disease?.map(d => `${d.disease}: ${d.count} cases (${d.active} active)`).join('\n') || 'No data'}

7-DAY TREND
-----------
${stats.trend_7d?.map(d => `${d.date}: ${d.count} cases`).join('\n') || 'No data'}

==========================================
PULSE Platform — pulse-platform-1.onrender.com
    `

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `PULSE_Report_${new Date().toISOString().slice(0,10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', gap: 6, padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
      <button onClick={exportExcel} style={{
        flex: 1, padding: '6px 0', background: 'var(--bg-elevated)',
        border: '1px solid var(--border)', color: 'var(--accent)',
        borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600,
      }}>
        📊 Export CSV / Excel
      </button>
      <button onClick={exportPDF} style={{
        flex: 1, padding: '6px 0', background: 'var(--bg-elevated)',
        border: '1px solid var(--border)', color: 'var(--warning)',
        borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600,
      }}>
        📄 Export Report
      </button>
    </div>
  )
}
