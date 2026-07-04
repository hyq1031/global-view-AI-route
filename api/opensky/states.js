import { createOpenskyClient } from '../../server/openskyCore.js'

// Vercel serverless function serving /api/opensky/states in production,
// mirroring the dev Vite middleware in server/openskyProxy.js. Requires
// OPENSKY_CLIENT_ID / OPENSKY_CLIENT_SECRET set in the Vercel project env.
// Module-level client: cache and 429 backoff persist per warm instance.
const client = createOpenskyClient({
  clientId: process.env.OPENSKY_CLIENT_ID,
  clientSecret: process.env.OPENSKY_CLIENT_SECRET,
})

export default async function handler(req, res) {
  if (!client.hasCredentials) {
    res.status(500).json({
      error: 'Missing OPENSKY_CLIENT_ID / OPENSKY_CLIENT_SECRET in Vercel environment variables',
    })
    return
  }
  try {
    const data = await client.fetchStates()
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json(data)
  } catch (err) {
    // undici wraps network errors as bare "fetch failed" — the actionable
    // detail (DNS, TLS, timeout, ECONNREFUSED) lives in err.cause.
    const cause = err.cause ? ` (${err.cause.code || err.cause.message || err.cause})` : ''
    console.error('[opensky-api]', err.message + cause)
    res.status(err.status === 429 ? 429 : 502).json({
      error: err.message + cause,
      region: process.env.VERCEL_REGION ?? null,
      ...(err.retryAfterSeconds != null ? { retryAfterSeconds: err.retryAfterSeconds } : {}),
      ...(client.creditsRemaining != null ? { creditsRemaining: client.creditsRemaining } : {}),
    })
  }
}
