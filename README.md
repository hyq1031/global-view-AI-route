# Global View — AI Route Planning Dashboard

A logistics/route-planning dashboard centered on an interactive Three.js Earth. Recreates a reference dashboard design (day/night themes, glassy stat cards, floating pill controls) with a real WebGL globe, live flight tracking via OpenSky, and a mobile-responsive layout.

## Stack

- **Vite + React 18** — no framework, plain SPA
- **three.js** (raw, not react-three-fiber) — custom shaders for the globe/atmosphere/trails
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **framer-motion** — bottom-sheet and popover animations
- A small **Vite dev-server middleware** (`server/openskyProxy.js`) that proxies OpenSky Network's live flight API — dev-only, not part of the production build

## Setup

```bash
npm install
```

Copy your OpenSky API credentials into `.env.local` (already gitignored):

```
OPENSKY_CLIENT_ID=your-client-id-api-client
OPENSKY_CLIENT_SECRET=your-client-secret
```

Get these from your [OpenSky Account page](https://opensky-network.org/my-opensky/account) → "API Client" card. Without credentials, the app still works — it just runs permanently in Trial mode (see below).

## Run

```bash
npm run dev       # dev server at http://localhost:5173, includes the OpenSky proxy
npm run build     # production build to dist/
npm run preview   # preview the production build locally
```

**Restart the dev server** (not just save-and-reload) whenever you change `.env.local` or `vite.config.js` — those are only read at process startup.

## How it's put together

```
server/openskyProxy.js       Dev-only middleware: mints OpenSky's OAuth2 token server-side,
                              proxies /api/opensky/states, caches responses, and implements
                              adaptive rate-limit backoff (see "OpenSky integration" below).
src/three/globe.js           All Three.js scene logic in one framework-free class (Globe).
                              Custom shaders for the day/night globe crossfade, atmosphere
                              glow, live-flight trail wakes, and trial-route arcs.
src/hooks/useLiveFlights.js  Polls the proxy on an adaptive interval; exposes live flight
                              status (count, error, credits remaining) to React.
src/hooks/useTrialRoutes.js  Manages the user-editable list of trial routes, persisted to
                              localStorage.
src/components/              React overlay UI: DashboardCard composes everything and owns
                              the live/trial mode logic; OptionsSheet is the mobile-only
                              collapsible control sheet; RouteBuilder/RouteBuilderForm are
                              the desktop popover and shared route-list form respectively.
src/data/                    Static data: curated city list (cities.js) for the route
                              builder, and mock shipment/risk data for the Activities panel.
```

### Live / Trial data modes

The globe has two mutually-exclusive data layers, toggled via the LIVE/TRIAL pill:

- **Live**: real aircraft positions from OpenSky, rendered as heading-oriented instanced
  markers with short fading trail wakes (built from actual recorded positions, not
  interpolation). Auto-falls-back to Trial if live data is unavailable (missing
  credentials, rate-limited, etc.) and auto-recovers the moment it's available again.
- **Trial**: user-editable origin→destination arcs (add/remove via the Routes popover,
  cities picked from `src/data/cities.js`). This is the *only* way to show routes at all —
  OpenSky's live feed has no origin/destination data, only current position, so Trial mode
  is not a "fallback stub," it's the sole source of route visualization.

Clicking a route in the list highlights its arc red, dims the others, and smoothly
rotates the globe to frame it (see `Globe.setSelectedRoute()` in `globe.js`).

### OpenSky integration — read this before touching polling intervals

OpenSky's REST API is credit-metered, and the cost model is easy to get badly wrong:

- Credits are tracked in **separate buckets per endpoint family** (`/states/*` is its own bucket).
- Standard-tier (OAuth2-authenticated, no special status) budget is **4,000 credits/day**.
- **`/states/all` costs 1–4 credits depending on query bounding-box area** — a global query
  (no bounding box, what this app uses) costs the maximum, **4 credits/call**.
- At the old 10s poll interval that's ~34,560 credits/day — 8-9x over budget. The app
  currently polls every **180s (3 min)**, keeping worst-case usage under 50% of the daily
  budget. Don't drop this back down without redoing that math.
- The proxy reads OpenSky's own `X-Rate-Limit-Remaining` / `X-Rate-Limit-Retry-After-Seconds`
  response headers and adapts: on a 429 it remembers the exact cooldown and skips calling
  OpenSky again until it clears (verified in practice: a real cooldown of ~10.4 hours was
  read and honored automatically). If credits run low it also stretches the poll interval
  out to 15 minutes.
- License note: OpenSky's Terms of Use require a **separate written license** for any
  "operational" use of the REST API in a live product/service, regardless of non-profit
  status. This project is set up for **local/dev use only** — do not deploy it publicly
  with live OpenSky data wired in without securing that license first.

### Mobile layout

Below Tailwind's `sm:` breakpoint (640px), the desktop's absolutely-positioned overlay set
(title, stats, live badge, mode switch, route builder) is hidden (`hidden sm:contents`
wrapper in `DashboardCard.jsx`) in favor of one collapsible bottom sheet (`OptionsSheet.jsx`)
that bundles all of it, reusing the same slide-up pattern as the existing Activities & Risk
panel. Theme toggle, 3D/2D, and zoom controls stay always-visible on any screen size.

The two bottom sheets (`OptionsSheet`, `ActivitiesPanel`) are mutually exclusive, coordinated
by a single `activeSheet` state owned by `App.jsx` — opening one closes the other. Both are
fully controlled components (no internal open state) for exactly this reason; see git/session
history if you're tempted to give either one local state again, that was tried and caused
real click-blocking and z-index bugs.

## Known limitations

- Trial-route cities are a curated list of ~60 major hubs (`src/data/cities.js`), not
  free-text — no geocoding API is wired up.
- The OpenSky proxy is dev-only (Vite middleware); there is no production/serverless
  equivalent. Deploying this live would need that built out, plus the licensing note above.
