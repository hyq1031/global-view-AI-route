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
    const causeCode = err.cause?.code || err.cause?.message
    const cause = causeCode ? ` (${causeCode})` : ''
    // OpenSky's host is unreachable from Vercel egress (verified from iad1 and
    // fra1) — likely datacenter-IP filtering, consistent with their ToS scoping
    // live data to non-operational use. Surface that honestly instead of a
    // cryptic timeout; the frontend auto-falls back to trial routes.
    const message =
      causeCode === 'UND_ERR_CONNECT_TIMEOUT'
        ? 'OpenSky is unreachable from this hosted demo — live mode works when running locally'
        : err.message + cause
    console.error('[opensky-api]', err.message + cause)
    res.status(err.status === 429 ? 429 : 502).json({
      error: message,
      region: process.env.VERCEL_REGION ?? null,
      ...(err.retryAfterSeconds != null ? { retryAfterSeconds: err.retryAfterSeconds } : {}),
      ...(client.creditsRemaining != null ? { creditsRemaining: client.creditsRemaining } : {}),
    })
  }
}
