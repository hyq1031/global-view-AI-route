import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_ROUTES } from '../data/routes'

const STORAGE_KEY = 'globeview.trialRoutes'
const MAX_ROUTES = 30

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_ROUTES
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_ROUTES
  } catch {
    return DEFAULT_ROUTES
  }
}

export function useTrialRoutes() {
  const [routes, setRoutes] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(routes))
    } catch {
      // localStorage unavailable (private browsing, quota) — routes just won't persist.
    }
  }, [routes])

  const addRoute = useCallback((from, to) => {
    if (!from || !to || from.name === to.name) return
    setRoutes((prev) => {
      if (prev.length >= MAX_ROUTES) return prev
      return [...prev, { id: `${from.name}-${to.name}-${Date.now()}`, from, to }]
    })
  }, [])

  const removeRoute = useCallback((id) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const resetToDefaults = useCallback(() => setRoutes(DEFAULT_ROUTES), [])

  return { routes, addRoute, removeRoute, resetToDefaults }
}
