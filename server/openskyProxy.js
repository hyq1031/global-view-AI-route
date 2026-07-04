const TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token'
const STATES_URL = 'https://opensky-network.org/api/states/all'
const MAX_AIRCRAFT = 800
const CACHE_MS = 8000

// Dev-only Vite middleware: mints an OpenSky OAuth2 token server-side and proxies
// live state vectors, so client_id/client_secret never reach the browser bundle.
export function openskyProxyPlugin(env) {
  const clientId = env.OPENSKY_CLIENT_ID
  const clientSecret = env.OPENSKY_CLIENT_SECRET

  let token = null
  let tokenExpiresAt = 0
  let cache = null
  let cacheAt = 0
  let inFlight = null
  let creditsRemaining = null
  let backoffUntil = 0

  async function getToken() {
    if (token && Date.now() < tokenExpiresAt - 5000) return token
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })
    if (!res.ok) throw new Error(`OpenSky token request failed: ${res.status} ${await res.text()}`)
    const data = await res.json()
    token = data.access_token
    tokenExpiresAt = Date.now() + data.expires_in * 1000
    return token
  }

  // Deterministic hash-based sample so the visible subset is geographically
  // spread out rather than biased toward whatever region the API lists first.
  function seededSample(items, max) {
    if (items.length <= max) return items
    const hash = (s) => {
      let h = 0
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
      return h
    }
    return [...items].sort((a, b) => hash(a.icao24) - hash(b.icao24)).slice(0, max)
  }

  async function fetchStates() {
    if (cache && Date.now() - cacheAt < CACHE_MS) return cache

    // Known cooldown from a previous 429 — don't spend a request confirming
    // what OpenSky already told us. Serve stale cache if we have it.
    if (Date.now() < backoffUntil) {
      if (cache) return cache
      const err = new Error('Backing off until OpenSky rate-limit window clears')
      err.status = 429
      err.retryAfterSeconds = Math.ceil((backoffUntil - Date.now()) / 1000)
      throw err
    }

    if (inFlight) return inFlight
    inFlight = (async () => {
      const bearer = await getToken()
      const res = await fetch(STATES_URL, { headers: { Authorization: `Bearer ${bearer}` } })

      const remainingHeader = res.headers.get('X-Rate-Limit-Remaining')
      if (remainingHeader != null && !Number.isNaN(Number(remainingHeader))) {
        creditsRemaining = Number(remainingHeader)
      }

      if (res.status === 429) {
        const retryHeader = res.headers.get('X-Rate-Limit-Retry-After-Seconds')
        const retryAfterSeconds = retryHeader != null && !Number.isNaN(Number(retryHeader)) ? Number(retryHeader) : 300
        backoffUntil = Date.now() + retryAfterSeconds * 1000
        const err = new Error('OpenSky rate limit reached')
        err.status = 429
        err.retryAfterSeconds = retryAfterSeconds
        throw err
      }
      if (!res.ok) throw new Error(`OpenSky states request failed: ${res.status} ${await res.text()}`)

      const json = await res.json()
      const flights = (json.states || [])
        .filter((s) => s[5] != null && s[6] != null && !s[8])
        .map((s) => ({
          icao24: s[0],
          callsign: (s[1] || '').trim(),
          lon: s[5],
          lat: s[6],
          heading: s[10] ?? 0,
          velocity: s[9] ?? 0,
          altitude: s[7] ?? s[13] ?? 0,
        }))
      const sampled = seededSample(flights, MAX_AIRCRAFT)
      cache = { time: json.time, count: sampled.length, flights: sampled, creditsRemaining }
      cacheAt = Date.now()
      return cache
    })()
    try {
      return await inFlight
    } finally {
      inFlight = null
    }
  }

  return {
    name: 'opensky-proxy',
    configureServer(server) {
      server.middlewares.use('/api/opensky/states', async (req, res) => {
        if (!clientId || !clientSecret) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: 'Missing OPENSKY_CLIENT_ID / OPENSKY_CLIENT_SECRET in .env.local',
            }),
          )
          return
        }
        try {
          const data = await fetchStates()
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify(data))
        } catch (err) {
          console.error('[opensky-proxy]', err.message)
          res.statusCode = err.status === 429 ? 429 : 502
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: err.message,
              ...(err.retryAfterSeconds != null ? { retryAfterSeconds: err.retryAfterSeconds } : {}),
              ...(creditsRemaining != null ? { creditsRemaining } : {}),
            }),
          )
        }
      })
    },
  }
}
