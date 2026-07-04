import { useEffect, useMemo, useRef, useState } from 'react'
import GlobeCanvas from './GlobeCanvas'
import ThemeToggle from './ThemeToggle'
import TitleBlock from './TitleBlock'
import StatsPanel from './StatsPanel'
import ViewToggle from './ViewToggle'
import ZoomControls from './ZoomControls'
import CoordsReadout from './CoordsReadout'
import LiveFlightsBadge from './LiveFlightsBadge'
import DataModeSwitch from './DataModeSwitch'
import RouteBuilder from './RouteBuilder'
import CitySelect from './CitySelect'
import OptionsSheet from './OptionsSheet'
import { useTrialRoutes } from '../hooks/useTrialRoutes'

const LOW_CREDITS_THRESHOLD = 40

export default function DashboardCard({
  theme,
  setTheme,
  view,
  setView,
  globeRef,
  coordsRef,
  onPointerLatLng,
  sheetOpen,
  onOpenSheet,
  onCloseSheet,
  sheetHidden,
}) {
  const [flightStatus, setFlightStatus] = useState(null)
  const [dataMode, setDataMode] = useState('live') // user intent: 'live' | 'trial'
  const [selectedRouteId, setSelectedRouteId] = useState(null)
  const [selectedCity, setSelectedCity] = useState(null)
  const { routes, addRoute, removeRoute, resetToDefaults } = useTrialRoutes()

  const routeCities = useMemo(
    () => Array.from(new Set(routes.flatMap((r) => [r.from.name, r.to.name]))).sort(),
    [routes],
  )

  const hasLiveData = !!flightStatus && !flightStatus.error && flightStatus.count > 0
  // "live" intent auto-falls-back to trial data when live is unavailable, and
  // auto-recovers the moment real data shows up. "trial" intent is a manual
  // override that stays trial regardless of live availability.
  const effectiveMode = dataMode === 'trial' ? 'trial' : hasLiveData ? 'live' : 'trial'
  // useLiveFlights' initial status ({count:0, updatedAt:null, error:null}) is
  // non-null but isn't a real result — gate on updatedAt/error so this stays
  // false until the first poll actually resolves, otherwise it's true for a
  // moment on every load and auto-opens the mobile sheet over the globe.
  const hasPolledOnce = flightStatus?.updatedAt != null || flightStatus?.error != null
  const isAutoFallback = hasPolledOnce && dataMode === 'live' && effectiveMode === 'trial'
  const lowCredits = flightStatus?.creditsRemaining != null && flightStatus.creditsRemaining < LOW_CREDITS_THRESHOLD

  // Auto-open the mobile options sheet the moment something worth noticing
  // happens, but only on that transition — not on every render while it holds.
  const wasNotableRef = useRef(false)
  useEffect(() => {
    const notable = isAutoFallback || !!flightStatus?.error || lowCredits
    if (notable && !wasNotableRef.current) onOpenSheet?.()
    wasNotableRef.current = notable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoFallback, flightStatus?.error, lowCredits])

  const handleSelectRoute = (id) => {
    setSelectedRouteId((prev) => (prev === id ? null : id))
    setSelectedCity(null)
  }

  const handleSelectCity = (name) => {
    setSelectedCity((prev) => (prev === name ? null : name))
    setSelectedRouteId(null)
  }

  return (
    <div
      className="theme-fade relative min-h-0 flex-1 overflow-hidden rounded-[20px] sm:rounded-[28px]"
      style={{ background: 'var(--card-bg)', boxShadow: 'var(--card-shadow)' }}
    >
      <div className="theme-fade absolute bottom-0 left-[31%] top-0 hidden w-px sm:block" style={{ background: 'var(--divider)' }} />

      <div
        className="theme-fade pointer-events-none absolute left-1/2 top-1/2 aspect-square h-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--globe-glow) 0%, transparent 68%)' }}
      />
      <GlobeCanvas
        theme={theme}
        view={view}
        globeRef={globeRef}
        onPointerLatLng={onPointerLatLng}
        onFlightStatus={setFlightStatus}
        dataMode={effectiveMode}
        trialRoutes={routes}
        selectedRouteId={selectedRouteId}
        selectedCity={selectedCity}
      />

      {/* Universal controls — visible at any viewport width */}
      <ThemeToggle theme={theme} setTheme={setTheme} className="absolute left-3 top-3 sm:left-7 sm:top-7" />
      <ViewToggle view={view} setView={setView} className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:bottom-8" />
      <ZoomControls globeRef={globeRef} className="absolute bottom-4 right-3 sm:bottom-8 sm:right-8" />

      {/* Desktop overlay set — unchanged from before, just gated behind sm: */}
      <div className="hidden sm:contents">
        <TitleBlock className="absolute left-8 top-[23%] w-[24%] min-w-[250px] sm:left-11" />
        <CoordsReadout ref={coordsRef} className="absolute bottom-9 left-8 sm:left-11" />
        <LiveFlightsBadge status={flightStatus} className="absolute bottom-24 left-8 sm:left-11" />
        <div className="absolute bottom-40 left-8 flex items-center gap-2 sm:left-11">
          <DataModeSwitch mode={dataMode} setMode={setDataMode} isAutoFallback={isAutoFallback} />
          <RouteBuilder
            routes={routes}
            addRoute={addRoute}
            removeRoute={removeRoute}
            resetToDefaults={resetToDefaults}
            selectedRouteId={selectedRouteId}
            onSelectRoute={handleSelectRoute}
          />
          <CitySelect cities={routeCities} selectedCity={selectedCity} onSelectCity={handleSelectCity} />
        </div>
        <StatsPanel className="absolute right-8 top-9 sm:right-12" />
      </div>

      {/* Mobile collapsible sheet */}
      <OptionsSheet
        flightStatus={flightStatus}
        dataMode={dataMode}
        setDataMode={setDataMode}
        isAutoFallback={isAutoFallback}
        routes={routes}
        addRoute={addRoute}
        removeRoute={removeRoute}
        resetToDefaults={resetToDefaults}
        selectedRouteId={selectedRouteId}
        onSelectRoute={handleSelectRoute}
        routeCities={routeCities}
        selectedCity={selectedCity}
        onSelectCity={handleSelectCity}
        open={sheetOpen}
        onOpen={onOpenSheet}
        onClose={onCloseSheet}
        hidden={sheetHidden}
      />
    </div>
  )
}
