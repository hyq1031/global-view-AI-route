import * as THREE from 'three'

const RADIUS = 1
const DEG = Math.PI / 180
const HOME = { lat: 14, lng: 14 } // Africa / Europe framing from the reference
const DIST_DEFAULT = 5.15
const DIST_MIN = 3.2
const DIST_MAX = 7.4
const MAX_FLIGHTS = 800
// Must match the base poll interval in src/hooks/useLiveFlights.js — drives how
// long the marker interpolation glide runs between two known positions.
const FLIGHT_POLL_MS = 180000
const MAX_TRAIL_POINTS = 8
const HIGHLIGHT_COLOR = new THREE.Color('#ef4444') // stays vivid in both day/night themes
const DIM_OPACITY = 0.28
const ROUTE_OPACITY = 0.8

export function latLngToVec3(lat, lng, r = RADIUS) {
  const phi = (90 - lat) * DEG
  const theta = (lng + 180) * DEG
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  )
}

export function vec3ToLatLng(v) {
  const lat = 90 - Math.acos(Math.min(1, Math.max(-1, v.y))) / DEG
  let lng = Math.atan2(v.z, -v.x) / DEG - 180
  if (lng <= -180) lng += 360
  return { lat, lng }
}

const GLOBE_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const GLOBE_FRAG = /* glsl */ `
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform float uNightMix;
  uniform float uFlat;
  uniform vec3 uLightDir;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vViewDir);
    vec3 dayTex = texture2D(uDayMap, vUv).rgb;
    vec3 nightTex = texture2D(uNightMap, vUv).rgb;

    float diff = dot(n, normalize(uLightDir)) * 0.5 + 0.5;
    float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.2);

    float dayLight = mix(0.5 + 0.62 * diff, 1.08, uFlat);
    vec3 day = dayTex * dayLight * vec3(1.06, 1.1, 1.16);
    day += vec3(0.62, 0.78, 1.0) * fres * 0.55;

    float fresSharp = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 5.0);
    vec3 night = pow(nightTex, vec3(1.2)) * vec3(2.6, 2.15, 1.6) + vec3(0.008, 0.014, 0.035);
    night += vec3(0.1, 0.5, 1.0) * fresSharp * 0.6;

    vec3 color = mix(day, night, uNightMix);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const ATMO_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const ATMO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPow;
  uniform float uStrength;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float rim = max(0.0, 0.74 - dot(normalize(vNormal), normalize(vViewDir)));
    float intensity = pow(rim, uPow) * uStrength;
    gl_FragColor = vec4(uColor * intensity, 1.0);
  }
`

const TRAIL_VERT = /* glsl */ `
  attribute float aAlpha;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const TRAIL_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(uColor, vAlpha);
  }
`

const THEMES = {
  day: {
    nightMix: 0,
    atmoColor: new THREE.Color(0.5, 0.72, 1.0),
    atmoStrength: 0.75,
    atmoPow: 3.6,
    atmoScale: 1.14,
    flight: new THREE.Color('#1d5cff'),
  },
  night: {
    nightMix: 1,
    atmoColor: new THREE.Color(0.1, 0.52, 1.0),
    atmoStrength: 2.8,
    atmoPow: 4.0,
    atmoScale: 1.075,
    flight: new THREE.Color('#59d2ff'),
  },
}

function fallbackTexture(r, g, b) {
  const tex = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

function lerpAngle(a, b, t) {
  const diff = ((b - a + 540) % 360) - 180
  return a + diff * t
}

function interpFlight(entry, now) {
  const alpha = clamp((now - entry.t0) / Math.max(1, entry.t1 - entry.t0), 0, 1)
  return {
    lat: entry.prevLat + (entry.lat - entry.prevLat) * alpha,
    lon: entry.prevLon + (entry.lon - entry.prevLon) * alpha,
    heading: lerpAngle(entry.prevHeading, entry.heading, alpha),
  }
}

export class Globe {
  constructor(container, { onPointerLatLng } = {}) {
    this.container = container
    this.onPointerLatLng = onPointerLatLng
    this.theme = 'day'
    this.view = '3d'
    this.flights = new Map() // icao24 -> { prevLat, prevLon, prevHeading, lat, lon, heading, t0, t1 }
    this.flightSlots = [] // instance index -> icao24 | null
    this.dataMode = 'live' // 'live' | 'trial' — which layer is visible
    this.routeMovers = []
    this.routePulses = []
    this.routeVisuals = new Map() // route.id -> { tubeMat, dotMat, midLat, midLng, fromName, toName }
    this.cityIndex = new Map() // city name -> { lat, lng }, built from route endpoints
    this.selectedRouteId = null
    this.selectedCity = null
    this.recenterTarget = { lat: HOME.lat, lng: HOME.lng }

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    this.dist = DIST_DEFAULT
    this.targetDist = DIST_DEFAULT
    this.fitScale = 1 // recomputed in _resize for narrow/portrait containers
    this.camera.position.set(0, 0, this.dist)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    const el = this.renderer.domElement
    el.style.cssText = 'position:absolute;inset:0;display:block;touch-action:none;cursor:grab;'
    container.appendChild(el)

    this.group = new THREE.Group()
    this.scene.add(this.group)

    this.flightGroup = new THREE.Group()
    this.routeGroup = new THREE.Group()
    this.routeGroup.visible = false
    this.group.add(this.flightGroup)
    this.group.add(this.routeGroup)

    // rotation state (screen-aligned tilt on X, spin on Y)
    this.rotX = HOME.lat * DEG
    this.rotY = (-90 - HOME.lng) * DEG
    this.velX = 0
    this.velY = 0
    this.dragging = false
    this.recentering = false
    this.lastInteract = 0
    this.raycaster = new THREE.Raycaster()
    this.pointerNdc = new THREE.Vector2()

    this._buildGlobe()
    this._buildAtmosphere()
    this._buildFlightLayer()
    this._bindEvents()

    this.resizeObserver = new ResizeObserver(() => this._resize())
    this.resizeObserver.observe(container)
    this._resize()

    this.clock = new THREE.Clock()
    this.running = true
    this._frame = this._frame.bind(this)
    requestAnimationFrame(this._frame)
  }

  _buildGlobe() {
    this.uniforms = {
      uDayMap: { value: fallbackTexture(40, 78, 122) },
      uNightMap: { value: fallbackTexture(5, 9, 22) },
      uNightMix: { value: 0 },
      uFlat: { value: 0 },
      uLightDir: { value: new THREE.Vector3(-0.45, 0.35, 0.85).normalize() },
    }
    const loader = new THREE.TextureLoader()
    const load = (url, key) =>
      loader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy())
        this.uniforms[key].value = tex
      })
    load('/textures/earth-blue-marble.jpg', 'uDayMap')
    load('/textures/earth-night.jpg', 'uNightMap')

    this.globeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS, 96, 96),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: GLOBE_VERT,
        fragmentShader: GLOBE_FRAG,
      }),
    )
    this.group.add(this.globeMesh)
  }

  _buildAtmosphere() {
    const t = THEMES.day
    this.atmoUniforms = {
      uColor: { value: t.atmoColor.clone() },
      uPow: { value: t.atmoPow },
      uStrength: { value: t.atmoStrength },
    }
    this.atmoMesh = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS, 64, 64),
      new THREE.ShaderMaterial({
        uniforms: this.atmoUniforms,
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    )
    this.atmoMesh.scale.setScalar(t.atmoScale)
    this.scene.add(this.atmoMesh)
  }

  _buildFlightLayer() {
    const t = THEMES.day
    this.flightMat = new THREE.MeshBasicMaterial({ color: t.flight.clone() })
    // Small 3-sided cone reads as a directional "arrow" marker at this scale.
    const geo = new THREE.ConeGeometry(0.0075, 0.022, 3)
    this.flightMesh = new THREE.InstancedMesh(geo, this.flightMat, MAX_FLIGHTS)
    this.flightMesh.count = 0
    this.flightMesh.frustumCulled = false
    this.flightGroup.add(this.flightMesh)

    this.flightSlots = []
    this._dummy = new THREE.Object3D()
    this._tmpNormal = new THREE.Vector3()
    this._tmpEast = new THREE.Vector3()
    this._tmpNorth = new THREE.Vector3()
    this._tmpForward = new THREE.Vector3()
    this._tmpRight = new THREE.Vector3()
    this._tmpMat = new THREE.Matrix4()
    this._worldUp = new THREE.Vector3(0, 1, 0)

    this._buildTrailLayer()
  }

  _buildTrailLayer() {
    const t = THEMES.day
    const segsPerFlight = MAX_TRAIL_POINTS - 1
    const vertsPerFlight = segsPerFlight * 2
    const totalVerts = MAX_FLIGHTS * vertsPerFlight

    const positions = new Float32Array(totalVerts * 3)
    const alphas = new Float32Array(totalVerts)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))

    this.trailMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: t.flight.clone() } },
      vertexShader: TRAIL_VERT,
      fragmentShader: TRAIL_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })
    this.trailMesh = new THREE.LineSegments(geo, this.trailMat)
    this.trailMesh.frustumCulled = false
    this.flightGroup.add(this.trailMesh)
    this._trailSegsPerFlight = segsPerFlight
    this._trailVertsPerFlight = vertsPerFlight
    this._trailPos = new THREE.Vector3()
  }

  // Called with the latest polled state vectors: [{ icao24, lat, lon, heading }, ...]
  updateFlights(list) {
    const now = performance.now()
    const seen = new Set()
    for (const f of list) {
      if (f.lat == null || f.lon == null) continue
      seen.add(f.icao24)
      const existing = this.flights.get(f.icao24)
      if (existing) {
        const disp = interpFlight(existing, now)
        // Record the just-reached position (not the new target) so the trail's
        // head lines up with where the marker currently sits, not where it's headed.
        existing.trail.push({ lat: existing.lat, lon: existing.lon })
        if (existing.trail.length > MAX_TRAIL_POINTS) existing.trail.shift()
        existing.prevLat = disp.lat
        existing.prevLon = disp.lon
        existing.prevHeading = disp.heading
        existing.lat = f.lat
        existing.lon = f.lon
        existing.heading = f.heading
        existing.t0 = now
        existing.t1 = now + FLIGHT_POLL_MS
      } else {
        this.flights.set(f.icao24, {
          prevLat: f.lat,
          prevLon: f.lon,
          prevHeading: f.heading,
          lat: f.lat,
          lon: f.lon,
          heading: f.heading,
          t0: now,
          t1: now + FLIGHT_POLL_MS,
          trail: [],
        })
      }
    }
    for (const icao24 of this.flights.keys()) {
      if (!seen.has(icao24)) this.flights.delete(icao24)
    }
    this.flightSlots = [...this.flights.keys()].slice(0, MAX_FLIGHTS)
    this.flightMesh.count = this.flightSlots.length
    this._rebuildTrailBuffer()
  }

  _rebuildTrailBuffer() {
    const posAttr = this.trailMesh.geometry.attributes.position
    const alphaAttr = this.trailMesh.geometry.attributes.aAlpha
    alphaAttr.array.fill(0)

    for (let i = 0; i < this.flightSlots.length; i++) {
      const entry = this.flights.get(this.flightSlots[i])
      if (!entry || entry.trail.length < 2) continue
      const base = i * this._trailVertsPerFlight
      const points = entry.trail
      const segCount = points.length - 1
      for (let s = 0; s < segCount; s++) {
        // Fade older segments out; the newest segment (closest to the marker) is brightest.
        const alpha = 0.05 + 0.55 * (s / Math.max(1, segCount - 1))
        const a = latLngToVec3(points[s].lat, points[s].lon, RADIUS * 1.006)
        const b = latLngToVec3(points[s + 1].lat, points[s + 1].lon, RADIUS * 1.006)
        const vi = base + s * 2
        posAttr.array[vi * 3] = a.x
        posAttr.array[vi * 3 + 1] = a.y
        posAttr.array[vi * 3 + 2] = a.z
        posAttr.array[(vi + 1) * 3] = b.x
        posAttr.array[(vi + 1) * 3 + 1] = b.y
        posAttr.array[(vi + 1) * 3 + 2] = b.z
        alphaAttr.array[vi] = alpha
        alphaAttr.array[vi + 1] = alpha
      }
    }
    posAttr.needsUpdate = true
    alphaAttr.needsUpdate = true
  }

  _updateFlightInstances(now) {
    if (!this.flightMesh.count) return
    for (let i = 0; i < this.flightSlots.length; i++) {
      const entry = this.flights.get(this.flightSlots[i])
      if (!entry) continue
      const disp = interpFlight(entry, now)
      const pos = latLngToVec3(disp.lat, disp.lon, RADIUS * 1.012)
      this._tmpNormal.copy(pos).normalize()
      this._tmpEast.crossVectors(this._worldUp, this._tmpNormal).normalize()
      this._tmpNorth.crossVectors(this._tmpNormal, this._tmpEast).normalize()
      const rad = disp.heading * DEG
      this._tmpForward
        .copy(this._tmpNorth)
        .multiplyScalar(Math.cos(rad))
        .addScaledVector(this._tmpEast, Math.sin(rad))
        .normalize()
      this._tmpRight.crossVectors(this._tmpForward, this._tmpNormal).normalize()
      this._tmpMat.makeBasis(this._tmpRight, this._tmpForward, this._tmpNormal)
      this._dummy.position.copy(pos)
      this._dummy.quaternion.setFromRotationMatrix(this._tmpMat)
      this._dummy.updateMatrix()
      this.flightMesh.setMatrixAt(i, this._dummy.matrix)
    }
    this.flightMesh.instanceMatrix.needsUpdate = true
  }

  // Rebuilds the trial-route arc layer from scratch. Called whenever the
  // route list changes (small, infrequent — a full rebuild is simplest and cheap).
  setRoutes(routes = []) {
    while (this.routeGroup.children.length) {
      const obj = this.routeGroup.children.pop()
      obj.geometry?.dispose?.()
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m) => m.dispose?.())
      }
    }
    this.routeMovers = []
    this.routePulses = []
    this.routeVisuals = new Map()
    this.cityIndex = new Map()

    const t = THEMES[this.theme]
    const markerMat = new THREE.MeshBasicMaterial({ color: t.flight.clone() })
    this._routeMarkerMat = markerMat

    const markerGeo = new THREE.SphereGeometry(0.014, 16, 16)
    const dotGeo = new THREE.SphereGeometry(0.011, 12, 12)
    const ringGeo = new THREE.RingGeometry(0.02, 0.027, 32)
    const seen = new Set()

    const addMarker = (place) => {
      this.cityIndex.set(place.name, { lat: place.lat, lng: place.lng })
      const key = `${place.lat},${place.lng}`
      if (seen.has(key)) return
      seen.add(key)
      const pos = latLngToVec3(place.lat, place.lng, RADIUS * 1.002)
      const marker = new THREE.Mesh(markerGeo, markerMat)
      marker.position.copy(pos)
      this.routeGroup.add(marker)

      const ringMat = new THREE.MeshBasicMaterial({
        color: t.flight.clone(),
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.position.copy(pos.clone().multiplyScalar(1.004))
      ring.lookAt(pos.clone().multiplyScalar(2))
      this.routeGroup.add(ring)
      this.routePulses.push({ mesh: ring, mat: ringMat, phase: Math.random() })
    }

    routes.forEach((route, i) => {
      const p1 = latLngToVec3(route.from.lat, route.from.lng)
      const p2 = latLngToVec3(route.to.lat, route.to.lng)
      const angle = p1.angleTo(p2)
      const lift = RADIUS * (0.16 + 0.4 * (angle / Math.PI))
      const c1 = p1.clone().lerp(p2, 0.3).normalize().multiplyScalar(RADIUS + lift)
      const c2 = p1.clone().lerp(p2, 0.7).normalize().multiplyScalar(RADIUS + lift)
      const curve = new THREE.CubicBezierCurve3(p1, c1, c2, p2)

      const tubeMat = new THREE.MeshBasicMaterial({ color: t.flight.clone(), transparent: true, opacity: ROUTE_OPACITY })
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 72, 0.0042, 8), tubeMat)
      this.routeGroup.add(tube)

      const dotMat = new THREE.MeshBasicMaterial({ color: t.flight.clone() })
      const mover = new THREE.Mesh(dotGeo, dotMat)
      this.routeGroup.add(mover)
      this.routeMovers.push({ mesh: mover, curve, t: Math.random(), speed: 0.07 + (i % 3) * 0.02 })

      const midVec = p1.clone().add(p2).normalize()
      const mid = vec3ToLatLng(midVec)
      this.routeVisuals.set(route.id, {
        tubeMat,
        dotMat,
        midLat: mid.lat,
        midLng: mid.lng,
        fromName: route.from.name,
        toName: route.to.name,
      })

      addMarker(route.from)
      addMarker(route.to)
    })

    if (this.selectedRouteId != null && !this.routeVisuals.has(this.selectedRouteId)) {
      this.selectedRouteId = null
    }
    if (this.selectedCity != null && !this.cityIndex.has(this.selectedCity)) {
      this.selectedCity = null
    }
  }

  // Unified selection: either a single route (by id) or a city (highlights
  // every route touching it). The two are mutually exclusive — setting one
  // clears the other — since both drive the same highlight/dim/focus visuals.
  setSelection({ routeId = null, city = null } = {}) {
    this.selectedRouteId = routeId ?? null
    this.selectedCity = city ?? null

    if (this.selectedRouteId != null && this.routeVisuals.has(this.selectedRouteId)) {
      const v = this.routeVisuals.get(this.selectedRouteId)
      this.focusOn(v.midLat, v.midLng)
    } else if (this.selectedCity != null && this.cityIndex.has(this.selectedCity)) {
      const c = this.cityIndex.get(this.selectedCity)
      this.focusOn(c.lat, c.lng)
    } else {
      this.recenter()
    }
  }

  setDataMode(mode) {
    this.dataMode = mode === 'trial' ? 'trial' : 'live'
    this.flightGroup.visible = this.dataMode === 'live'
    this.routeGroup.visible = this.dataMode === 'trial'
  }

  _bindEvents() {
    const el = this.renderer.domElement
    this._last = { x: 0, y: 0 }

    this._onDown = (e) => {
      this.dragging = true
      this.recentering = false
      this.velX = 0
      this.velY = 0
      this._last = { x: e.clientX, y: e.clientY }
      el.setPointerCapture(e.pointerId)
      el.style.cursor = 'grabbing'
      this.lastInteract = performance.now()
    }
    this._onMove = (e) => {
      if (this.dragging) {
        const dx = e.clientX - this._last.x
        const dy = e.clientY - this._last.y
        this._last = { x: e.clientX, y: e.clientY }
        const k = 0.0052 * (this.dist / DIST_DEFAULT)
        this.rotY += dx * k
        this.velY = dx * k
        if (this.view === '3d') {
          this.rotX += dy * k * 0.85
          this.velX = dy * k * 0.85
        }
        this.lastInteract = performance.now()
      }
      this._updatePointerLatLng(e)
    }
    this._onUp = (e) => {
      this.dragging = false
      el.style.cursor = 'grab'
      this.lastInteract = performance.now()
      if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId)
    }
    this._onWheel = (e) => {
      e.preventDefault()
      this.targetDist = clamp(this.targetDist + e.deltaY * 0.0016, DIST_MIN * this.fitScale, DIST_MAX * this.fitScale)
      this.lastInteract = performance.now()
    }

    el.addEventListener('pointerdown', this._onDown)
    el.addEventListener('pointermove', this._onMove)
    el.addEventListener('pointerup', this._onUp)
    el.addEventListener('pointercancel', this._onUp)
    el.addEventListener('wheel', this._onWheel, { passive: false })
  }

  _updatePointerLatLng(e) {
    if (!this.onPointerLatLng) return
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointerNdc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(this.pointerNdc, this.camera)
    const hit = this.raycaster.intersectObject(this.globeMesh, false)[0]
    if (!hit) return
    const p = this.globeMesh.worldToLocal(hit.point.clone()).normalize()
    const { lat, lng } = vec3ToLatLng(p)
    this.onPointerLatLng(lat, lng)
  }

  _resize() {
    const w = this.container.clientWidth || 1
    const h = this.container.clientHeight || 1
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()

    // PerspectiveCamera fov is vertical-only: on narrow/portrait containers the
    // horizontal FOV shrinks below the globe's angular size and crops it at the
    // sides. Scale all camera distances so the sphere keeps the same apparent
    // size relative to the narrower axis instead.
    const vHalf = (this.camera.fov / 2) * DEG
    const hHalf = Math.atan(Math.tan(vHalf) * this.camera.aspect)
    const fit = Math.max(1, Math.sin(vHalf) / Math.sin(Math.min(vHalf, hHalf)))
    const prev = this.fitScale
    if (fit !== prev) {
      this.fitScale = fit
      this.targetDist *= fit / prev
      this.dist *= fit / prev
    }
  }

  _frame() {
    if (!this.running) return
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const now = performance.now()

    if (!this.dragging) {
      this.rotY += this.velY
      this.rotX += this.velX
      this.velY *= 0.94
      this.velX *= 0.94
      if (!this.recentering && this.view === '3d' && now - this.lastInteract > 2500) {
        this.rotY += 0.03 * dt
      }
    }
    if (this.recentering) {
      const tx = this.recenterTarget.lat * DEG
      const ty = (-90 - this.recenterTarget.lng) * DEG
      this.rotX += (tx - this.rotX) * 0.07
      this.rotY += (ty - this.rotY) * 0.07
      if (Math.abs(tx - this.rotX) < 0.002 && Math.abs(ty - this.rotY) < 0.002) this.recentering = false
    }
    if (this.view === '2d') this.rotX += (0 - this.rotX) * 0.08
    this.rotX = clamp(this.rotX, -1.0, 1.0)
    this.group.rotation.set(this.rotX, this.rotY, 0)

    this.dist += (this.targetDist - this.dist) * 0.08
    this.camera.position.z = this.dist

    // theme + view crossfades
    const t = THEMES[this.theme]
    const u = this.uniforms
    u.uNightMix.value += (t.nightMix - u.uNightMix.value) * 0.055
    u.uFlat.value += ((this.view === '2d' ? 1 : 0) - u.uFlat.value) * 0.06
    const a = this.atmoUniforms
    a.uColor.value.lerp(t.atmoColor, 0.055)
    a.uPow.value += (t.atmoPow - a.uPow.value) * 0.055
    a.uStrength.value += (t.atmoStrength - a.uStrength.value) * 0.055
    const atmoScale = this.atmoMesh.scale.x + (t.atmoScale - this.atmoMesh.scale.x) * 0.055
    this.atmoMesh.scale.setScalar(atmoScale)
    this.flightMat.color.lerp(t.flight, 0.055)
    this.trailMat.uniforms.uColor.value.lerp(t.flight, 0.055)
    if (this._routeMarkerMat) this._routeMarkerMat.color.lerp(t.flight, 0.055)
    const anySelection = this.selectedRouteId != null || this.selectedCity != null
    for (const [id, v] of this.routeVisuals) {
      const isSelected =
        this.selectedCity != null
          ? v.fromName === this.selectedCity || v.toName === this.selectedCity
          : id === this.selectedRouteId
      const targetColor = isSelected ? HIGHLIGHT_COLOR : t.flight
      v.tubeMat.color.lerp(targetColor, 0.08)
      v.dotMat.color.lerp(targetColor, 0.08)
      const targetOpacity = anySelection && !isSelected ? DIM_OPACITY : ROUTE_OPACITY
      v.tubeMat.opacity += (targetOpacity - v.tubeMat.opacity) * 0.08
    }

    this._updateFlightInstances(now)

    if (this.routeGroup.visible) {
      for (const m of this.routeMovers) {
        m.t = (m.t + dt * m.speed) % 1
        m.mesh.position.copy(m.curve.getPoint(m.t))
      }
      const cycleLen = 2.2
      for (const p of this.routePulses) {
        const cycle = (now / 1000 / cycleLen + p.phase) % 1
        p.mesh.scale.setScalar(1 + cycle * 1.9)
        p.mat.opacity = (1 - cycle) * 0.45
        p.mat.color.copy(this._routeMarkerMat.color)
      }
    }

    this.renderer.render(this.scene, this.camera)
    requestAnimationFrame(this._frame)
  }

  setTheme(theme) {
    this.theme = theme === 'night' ? 'night' : 'day'
  }

  setView(view) {
    this.view = view === '2d' ? '2d' : '3d'
    this.lastInteract = performance.now()
  }

  zoomIn() {
    this.targetDist = clamp(this.targetDist - 0.75 * this.fitScale, DIST_MIN * this.fitScale, DIST_MAX * this.fitScale)
  }

  zoomOut() {
    this.targetDist = clamp(this.targetDist + 0.75 * this.fitScale, DIST_MIN * this.fitScale, DIST_MAX * this.fitScale)
  }

  recenter() {
    this.recenterTarget = { lat: HOME.lat, lng: HOME.lng }
    this._startRecenter()
  }

  focusOn(lat, lng) {
    this.recenterTarget = { lat, lng }
    this._startRecenter()
  }

  _startRecenter() {
    // unwrap rotY so the tween takes the short way around
    const twoPi = Math.PI * 2
    const ty = (-90 - this.recenterTarget.lng) * DEG
    let delta = (this.rotY - ty) % twoPi
    if (delta > Math.PI) delta -= twoPi
    if (delta < -Math.PI) delta += twoPi
    this.rotY = ty + delta
    this.velX = 0
    this.velY = 0
    this.targetDist = DIST_DEFAULT * this.fitScale
    this.recentering = true
    this.lastInteract = performance.now()
  }

  dispose() {
    this.running = false
    const el = this.renderer.domElement
    el.removeEventListener('pointerdown', this._onDown)
    el.removeEventListener('pointermove', this._onMove)
    el.removeEventListener('pointerup', this._onUp)
    el.removeEventListener('pointercancel', this._onUp)
    el.removeEventListener('wheel', this._onWheel)
    this.resizeObserver.disconnect()
    this.scene.traverse((obj) => {
      obj.geometry?.dispose?.()
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m) => m.dispose?.())
      }
    })
    Object.values(this.uniforms).forEach((u) => u.value?.dispose?.())
    this.renderer.dispose()
    el.remove()
  }
}
