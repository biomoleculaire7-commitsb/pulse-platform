import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Polls an async fetcher every `interval` ms.
 * Returns { data, loading, error, lastUpdated, refetch }
 */
export function usePolling(fetcher, interval = 30_000, deps = []) {
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const timerRef = useRef(null)

  const fetch = useCallback(async () => {
    try {
      const result = await fetcher()
      setData(result)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError(e.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line

  useEffect(() => {
    fetch()
    timerRef.current = setInterval(fetch, interval)
    return () => clearInterval(timerRef.current)
  }, [fetch, interval])

  return { data, loading, error, lastUpdated, refetch: fetch }
}
