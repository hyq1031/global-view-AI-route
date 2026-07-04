# Session Log

## 2026-07-02 — Initial build, live flights, quota fixes

**Built the dashboard from scratch**: Vite + React + Tailwind v4 + three.js, recreating a
reference screenshot (day/night themes, glassy dashboard card, floating pill controls) with
a real interactive WebGL globe (custom shaders for day/night crossfade, atmosphere glow,
drag-to-rotate with inertia, zoom, recenter). Collapsible Activities & Risk bottom sheet with
mock shipment/risk data.

**Integrated OpenSky live flight tracking**: dev-only Vite proxy (`server/openskyProxy.js`)
mints OpenSky's OAuth2 token server-side so credentials never reach the browser. Live
aircraft rendered as instanced, heading-oriented cone markers with short trail wakes built
from real recorded positions (not interpolated guesses).

**Key bug/incident — OpenSky rate limit**: initial polling was every 10s with an unbounded
(global) `/states/all` query. Researched OpenSky's actual credit model directly from their
docs (don't guess at external API pricing/limits) and found global queries cost 4 credits/call
against a 4,000/day budget — the 10s interval was ~9x over budget and exhausted the quota in
about 2-3 hours. Fixed by: raising the interval to 180s, and having the proxy read OpenSky's
own `X-Rate-Limit-Remaining`/`X-Rate-Limit-Retry-After-Seconds` response headers to adapt
automatically instead of trusting a fixed guessed number. Verified working end-to-end: a
real ~10.4 hour cooldown was read from a live 429 response and honored automatically (proxy
stopped calling OpenSky until that window cleared, serving stale cache instead).

**Added trial/mock route data with a LIVE/TRIAL switch**: since OpenSky has no live
origin/destination data (only current position), reintroduced the original arc-based route
visualization as a separate "Trial" layer, with a user-editable route builder (curated city
list, add/remove, persisted to localStorage). Live mode auto-falls-back to Trial when live
data is unavailable and auto-recovers when it returns.

**Added route selection (red highlight)**: clicking a route in the list turns its arc red,
dims the others, and smoothly rotates the globe to frame it. Required refactoring
`Globe.setRoutes()` from one shared material for all routes to per-route materials (a
real architectural change, not just a color prop).

**Mobile-responsive layout**: added a collapsible `OptionsSheet` for viewports below 640px,
consolidating the desktop's absolutely-positioned overlays into one bottom sheet, auto-opening
on notable state changes (auto-fallback engaging, low credits, errors).

### Bugs found and fixed this session

1. **OpenSky 429 from over-aggressive polling** — see above. Root-caused via reading the
   actual API docs rather than guessing; fixed with adaptive backoff.
2. **Two mobile bottom sheets blocking each other's clicks** — `OptionsSheet` and
   `ActivitiesPanel` each managed independent local `open` state; when one was expanded
   (`fixed`, high z-index) it geometrically covered the other's collapsed trigger button,
   making it unclickable. First attempt (bumping both handles to `z-50`) fixed clickability
   but caused a *different* bug: handles then visually poked through whichever panel was
   open, including their own. Final fix: converted both to fully controlled components with
   a single `activeSheet` state lifted to `App.jsx` (`'options' | 'activities' | null`), each
   handle hides only when *its own* panel is open (not the sibling's), and stays clickable
   above the other's panel via `z-50`. This is now the intended pattern — don't reintroduce
   local open-state to either sheet.
3. **Route-highlight camera focus overshoot** — initial `focusOn()` naively lat/lng-averaged
   route endpoints for the camera target; switched to averaging the normalized 3D vectors
   and converting back (great-circle-ish midpoint), reusing/factoring out a new
   `vec3ToLatLng()` helper from the existing raycast code.

### Open items / things to watch

- OpenSky quota resets on its own schedule (observed ~10.4h from one real 429 response) —
  not confirmed whether that's a fixed daily boundary or a rolling window from first use.
- Dev-only OpenSky proxy has no production equivalent; deploying live also requires securing
  OpenSky's separate operational-use license (see README).
- Trial route cities are a fixed curated list, not free-text/geocoded.
