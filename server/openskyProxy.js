import { createOpenskyClient } from './openskyCore.js'

// Dev-only Vite middleware: serves /api/opensky/states locally, mirroring the
// Vercel serverless function at api/opensky/states.js. Shared logic lives in
// openskyCore.js — change it there so dev and prod stay in sync.
export function openskyProxyPlugin(env) {
  const client = createOpenskyClient({
    clientId: env.OPENSKY_CLIENT_ID,
    clientSecret: env.OPENSKY_CLIENT_SECRET,
  })

  return {
    name: 'opensky-proxy',
    configureServer(server) {
      server.middlewares.use('/api/opensky/states', async (req, res) => {
        if (!client.hasCredentials) {
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
          const data = await client.fetchStates()
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
              ...(client.creditsRemaining != null ? { creditsRemaining: client.creditsRemaining } : {}),
            }),
          )
        }
      })
    },
  }
}
