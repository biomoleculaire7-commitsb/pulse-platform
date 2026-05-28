export default function ExportButton({ infections, stats }) {

  const exportCSV = () => {
    if (!infections?.length) {
      alert('No data to export / لا توجد بيانات للتصدير')
      return
    }

    const rows = infections.map(r => ({
      'Disease / المرض':    r.disease,
      'Status / الحالة':   r.status,
      'Severity / الخطورة': r.severity,
      'Region / المنطقة':  r.region || '-',
      'Date / التاريخ':    r.infection_date,
      'Latitude':           r.latitude,
      'Longitude':          r.longitude,
      'Source':             r.source,
    }))

    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(','),
      ...rows.map(r =>
        headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `PULSE_Export_${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
      <button onClick={exportCSV} style={{
        width: '100%',
        padding: '8px 0',
        background: 'var(--accent-dim)',
        border: '1px solid var(--accent)',
        color: 'var(--accent)',
        borderRadius: 4,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}>
        📊 Export CSV / تصدير البيانات ({infections?.length || 0} records)
      </button>
    </div>
  )
}
