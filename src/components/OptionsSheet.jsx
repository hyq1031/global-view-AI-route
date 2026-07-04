import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import DataModeSwitch from './DataModeSwitch'
import RouteBuilderForm from './RouteBuilderForm'
import CitySelect from './CitySelect'
import LiveFlightsBadge from './LiveFlightsBadge'

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export default function OptionsSheet({
  flightStatus,
  dataMode,
  setDataMode,
  isAutoFallback,
  routes,
  addRoute,
  removeRoute,
  resetToDefaults,
  selectedRouteId,
  onSelectRoute,
  routeCities,
  selectedCity,
  onSelectCity,
  open,
  onOpen,
  onClose,
  hidden,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const statusDotColor = flightStatus?.error ? '#d97706' : dataMode === 'trial' || isAutoFallback ? '#eab308' : '#22c55e'

  return (
    <div className="sm:hidden">
      {/* Bottom-left, sharing the bottom row with the centered 3D/2D toggle and
          the zoom controls on the right — centered here overlaps the toggle. */}
      <div
        className={`fixed inset-x-0 z-50 flex justify-start pl-4 ${open || hidden ? 'invisible' : ''}`}
        style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}
      >
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onOpen?.()}
          className="theme-fade flex items-center gap-2 rounded-full px-5 py-3 text-[14px] font-bold"
          style={{ background: 'var(--control-bg)', color: 'var(--text-1)', boxShadow: 'var(--control-shadow)' }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: statusDotColor }} />
          Options
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: '108%' }}
            animate={{ y: 0 }}
            exit={{ y: '108%' }}
            transition={{ type: 'spring', damping: 27, stiffness: 240 }}
            className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
          >
            <div
              className="glass theme-fade max-h-[75vh] overflow-y-auto rounded-3xl p-5 shadow-2xl"
              style={{ boxShadow: '0 -12px 50px rgba(10, 15, 40, 0.25)' }}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="theme-fade text-[13px] font-medium" style={{ color: 'var(--accent)' }}>
                    AI-Powered
                  </p>
                  <h2 className="theme-fade text-[22px] font-bold leading-tight" style={{ color: 'var(--text-1)' }}>
                    Plan Your Route with AI ✨
                  </h2>
                </div>
                <button
                  aria-label="Collapse options"
                  onClick={() => onClose?.()}
                  className="theme-fade grid h-9 w-9 shrink-0 place-items-center rounded-full"
                  style={{ background: 'var(--control-bg)', color: 'var(--control-fg)', boxShadow: 'var(--control-shadow)' }}
                >
                  <ChevronDown />
                </button>
              </div>

              <div className="mb-5 flex gap-6">
                <div>
                  <p className="theme-fade text-[12px]" style={{ color: 'var(--text-2)' }}>
                    Monthly
                  </p>
                  <p className="theme-fade text-[22px] font-bold" style={{ color: 'var(--text-1)' }}>
                    1021 <span className="text-[12px] font-semibold" style={{ color: 'var(--green)' }}>+32%</span>
                  </p>
                </div>
                <div>
                  <p className="theme-fade text-[12px]" style={{ color: 'var(--text-2)' }}>
                    Yearly
                  </p>
                  <p className="theme-fade text-[22px] font-bold" style={{ color: 'var(--text-1)' }}>
                    4603 <span className="text-[12px] font-semibold" style={{ color: 'var(--green)' }}>+12%</span>
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <DataModeSwitch mode={dataMode} setMode={setDataMode} isAutoFallback={isAutoFallback} />
              </div>

              <div className="mb-4 rounded-2xl border p-3" style={{ borderColor: 'var(--glass-border)' }}>
                <RouteBuilderForm
                  routes={routes}
                  addRoute={addRoute}
                  removeRoute={removeRoute}
                  resetToDefaults={resetToDefaults}
                  selectedRouteId={selectedRouteId}
                  onSelectRoute={onSelectRoute}
                  compact
                />
              </div>

              <div className="mb-4">
                <CitySelect cities={routeCities} selectedCity={selectedCity} onSelectCity={onSelectCity} compact />
              </div>

              <LiveFlightsBadge status={flightStatus} className="" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
