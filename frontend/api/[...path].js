export default async function handler(req, res) {
  const path = [].concat(req.query.path || []).join('/')
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  const target = `${process.env.BACKEND_URL}/api/${path}${qs}`

  const r = await fetch(target, {
    method: req.method,
    headers: {
      'X-API-Key': process.env.PULSE_API_KEY,
      'Content-Type': 'application/json',
    },
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
  })

  res.status(r.status)
  res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json')
  res.send(await r.text())
}
