import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL: BASE })

// Attach stored token
api.interceptors.request.use(cfg => {
  const key = localStorage.getItem('res_api_key') || import.meta.env.VITE_API_KEY || 'change-me-api-key'
  cfg.headers['X-API-Key'] = key
  return cfg
})

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const fetchStats = () =>
  api.get('/dashboard/stats').then(r => r.data)

export const fetchTimeseries = (days = 30, disease = null) =>
  api.get('/dashboard/timeseries', { params: { days, disease } }).then(r => r.data)

export const fetchHeatmap = (params = {}) =>
  api.get('/dashboard/heatmap', { params }).then(r => r.data)

// ─── Infections ───────────────────────────────────────────────────────────────
export const fetchInfections = (params = {}) =>
  api.get('/infections', { params }).then(r => r.data)

export const createInfection = (data) =>
  api.post('/infections', data).then(r => r.data)

export const importCsv = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/import/csv', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
}
