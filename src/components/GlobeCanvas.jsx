import { useEffect, useRef } from 'react'
import { Globe } from '../three/globe'
import { useLiveFlights } from '../hooks/useLiveFlights'

export default function GlobeCanvas({
  theme,
  view,
  globeRef,
  onPointerLatLng,
  onFlightStatus,
  dataMode,
  trialRoutes,
  selectedRouteId,
  selectedCity,
}) {
  const containerRef = useRef(null)

  useEffect(() => {
    const globe = new Globe(containerRef.current, { onPointerLatLng })
    globeRef.current = globe
    return () => {
      globe.dispose()
      if (globeRef.current === globe) globeRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    globeRef.current?.setTheme(theme)
  }, [theme, globeRef])

  useEffect(() => {
    globeRef.current?.setView(view)
  }, [view, globeRef])

  useEffect(() => {
    globeRef.current?.setDataMode(dataMode)
  }, [dataMode, globeRef])

  useEffect(() => {
    globeRef.current?.setRoutes(trialRoutes)
  }, [trialRoutes, globeRef])

  useEffect(() => {
    globeRef.current?.setSelection({ routeId: selectedRouteId, city: selectedCity })
  }, [selectedRouteId, selectedCity, globeRef])

  const flightStatus = useLiveFlights((flights) => globeRef.current?.updateFlights(flights))

  useEffect(() => {
    onFlightStatus?.(flightStatus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightStatus.count, flightStatus.updatedAt, flightStatus.error])

  return <div ref={containerRef} className="absolute inset-0" />
}
