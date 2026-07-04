import { useEffect, useRef, useState } from 'react'

// Global (no bounding box) /states/all calls cost 4 OpenSky credits each. At a
// 4,000/day Standard-tier budget, 180s keeps worst-case (tab open 24h) usage
// under 50% of the daily quota, leaving headroom for manual testing/restarts.
const BASE_POLL_MS = 180000
const CAUTION_POLL_MS = 900000
const CAUTION_THRESHOLD = 40 // ~10 more global calls left at 4 credits each

export function useLiveFlights(onUpdate) {
  const [status, setStatus] = useState({ count: 0, updatedAt: null, error: null, creditsRemaining: null })
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    let cancelled = false
    let timer

    async function poll() {
      let nextDelay = BASE_POLL_MS
      try {
        const res = await fetch('/api/opensky/states')
        const data = await res.json()
        if (cancelled) return

        if (!res.ok) {
          // Trust OpenSky's own Retry-After over any guess of ours.
          if (res.status === 429 && data.retryAfterSeconds) {
            nextDelay = data.retryAfterSeconds * 1000
          }
          setStatus((s) => ({ ...s, error: data.error || `HTTP ${res.status}`, creditsRemaining: data.creditsRemaining ?? s.creditsRemaining }))
          return
        }

        onUpdateRef.current?.(data.flights)
        setStatus({ count: data.flights.length, updatedAt: Date.now(), error: null, creditsRemaining: data.creditsRemaining ?? null })

        if (data.creditsRemaining != null && data.creditsRemaining < CAUTION_THRESHOLD) {
          nextDelay = CAUTION_POLL_MS
        }
      } catch (err) {
        if (!cancelled) setStatus((s) => ({ ...s, error: err.message }))
      } finally {
        if (!cancelled) timer = setTimeout(poll, nextDelay)
      }
    }
    poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  return status
}
