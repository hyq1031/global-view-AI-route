# CLAUDE.md — Global View Dashboard

AI route-planning dashboard: Vite + React + three.js globe + Tailwind v4. See README.md for
full architecture; this file is for gotchas that aren't obvious from reading the code.

## Dev workflow
- `npm run dev` starts Vite **and** the OpenSky proxy middleware together (same process).
- **Restart the dev server** (don't rely on HMR) after editing `.env.local` or
  `vite.config.js` — env vars are only read at process startup.
- Git repository with remote `origin` → github.com/hyq1031/global-view-AI-route (branch
  `main`). Root-level `*.jpg`/`*.png` are gitignored (verification screenshots);
  `public/**` textures are exempted.
- Windows/PowerShell environment — use the PowerShell tool for npm/build commands, not
  POSIX-only syntax.

## OpenSky API — don't guess, check openskynetwork.github.io/opensky-api/rest.html
- Credits are per-endpoint-bucket; `/states/all` costs 1-4 credits depending on bounding-box
  area — **global queries (no bbox) cost 4 credits, the max tier**. Standard tier budget is
  4,000/day. Poll interval is deliberately 180s (`useLiveFlights.js` / `globe.js`
  `FLIGHT_POLL_MS`) to stay under budget — don't lower it without redoing that math.
- The proxy (`server/openskyProxy.js`) reads `X-Rate-Limit-Remaining` /
  `X-Rate-Limit-Retry-After-Seconds` from real responses and backs off adaptively. If you're
  debugging "why isn't live data showing," check for a 429/backoff state before assuming a
  code bug — it's very easy to burn the daily quota during manual testing/curl-ing the
  endpoint.
- OpenSky's ToS require a separate written license for "operational" (live product) use —
  this app is scoped to local/dev use only, intentionally.

## Architecture patterns to follow
- `src/three/globe.js` is one framework-free `Globe` class — all scene/shader/animation
  logic lives there, React only calls its public methods (`setTheme`, `setRoutes`,
  `setSelectedRoute`, etc.) from `useEffect`s in `GlobeCanvas.jsx`. Keep it that way rather
  than reaching into three.js internals from React components.
- Trial-route arcs use **per-route materials** (one `MeshBasicMaterial` per tube/dot), not
  one shared material — required for the red-highlight/dim-others selection feature. If
  adding more route-level visual state, follow that pattern rather than reverting to shared
  materials.
- The two mobile bottom sheets (`OptionsSheet`, `ActivitiesPanel`) are **fully controlled**
  components with no internal `open` state — a single `activeSheet` state in `App.jsx`
  (`'options' | 'activities' | null`) is the source of truth. This was a deliberate fix for
  real bugs (local state + signal-counting caused click-blocking and z-index fights between
  the two sheets). Don't give either one local open state again.

## Testing approach that worked
- Playwright MCP directly (not a test file) — navigate, resize viewport (1440x960 desktop /
  390x844 mobile), screenshot, read the image back, check console errors via
  `browser_console_messages`. Screenshots were written to the project root and deleted after
  verification — don't leave them committed.
- For OpenSky-dependent behavior, the live 429/backoff state was verified for real (not
  mocked) — e.g. confirming `retryAfterSeconds` from an actual rate-limited response.
