import { useCallback, useRef, useState } from 'react'
import DashboardCard from './components/DashboardCard'
import ActivitiesPanel from './components/ActivitiesPanel'

export default function App() {
  const [theme, setTheme] = useState('day')
  const [view, setView] = useState('3d')
  const globeRef = useRef(null)
  const coordsRef = useRef(null)

  // Mobile has two full-width bottom sheets (Options, Activities & Risk).
  // Single source of truth so only one is ever open, and the other's collapsed
  // handle hides itself instead of floating over the open one's content.
  const [activeSheet, setActiveSheet] = useState(null) // 'options' | 'activities' | null

  const handlePointerLatLng = useCallback((lat, lng) => {
    coordsRef.current?.set(lat, lng)
  }, [])

  return (
    <div
      data-theme={theme === 'night' ? 'night' : undefined}
      className="theme-fade h-full w-full overflow-hidden"
      style={{ background: 'var(--page-bg)' }}
    >
      <div className="mx-auto flex h-full max-w-[1560px] flex-col gap-3 px-3 pb-3 pt-4 sm:gap-5 sm:px-12 sm:pb-6 sm:pt-8">
        <DashboardCard
          theme={theme}
          setTheme={setTheme}
          view={view}
          setView={setView}
          globeRef={globeRef}
          coordsRef={coordsRef}
          onPointerLatLng={handlePointerLatLng}
          sheetOpen={activeSheet === 'options'}
          onOpenSheet={() => setActiveSheet('options')}
          onCloseSheet={() => setActiveSheet((s) => (s === 'options' ? null : s))}
          sheetHidden={activeSheet === 'activities'}
        />
        <ActivitiesPanel
          open={activeSheet === 'activities'}
          onOpen={() => setActiveSheet('activities')}
          onClose={() => setActiveSheet((s) => (s === 'activities' ? null : s))}
          hidden={activeSheet === 'options'}
        />
      </div>
    </div>
  )
}
