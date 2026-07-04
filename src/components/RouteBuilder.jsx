import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import RouteBuilderForm from './RouteBuilderForm'

export default function RouteBuilder({ routes, addRoute, removeRoute, resetToDefaults, selectedRouteId, onSelectRoute, className }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`${className} relative`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="theme-fade flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold"
        style={{ background: 'var(--control-bg)', color: 'var(--control-fg)', boxShadow: 'var(--control-shadow)' }}
      >
        Routes ({routes.length}) {open ? '▴' : '▾'}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="glass theme-fade absolute bottom-full left-0 z-20 mb-2 w-72 rounded-2xl p-4 shadow-2xl"
          >
            <RouteBuilderForm
              routes={routes}
              addRoute={addRoute}
              removeRoute={removeRoute}
              resetToDefaults={resetToDefaults}
              selectedRouteId={selectedRouteId}
              onSelectRoute={onSelectRoute}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
