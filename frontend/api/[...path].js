const ALLOWED = [
  /^health$/,
  /^dashboard\/(stats|timeseries|heatmap)$/,
  /^infections$/,
]

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Read-only' })
  }

  const path = [].concat(req.query.path || []).join('/')
  if (!ALLOWED.some(rx => rx.test(path))) {
    return res.status(403).json({ error: 'Not allowed' })
  }

  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  const r = await fetch(`${process.env.BACKEND_URL}/api/${path}${qs}`, {
    headers: { 'X-API-Key': process.env.PULSE_API_KEY },
  })

  res.status(r.status)
  res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json')
  res.send(await r.text())
}
