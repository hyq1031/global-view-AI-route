import { useState } from 'react'
import { CITIES } from '../data/cities'

export default function RouteBuilderForm({ routes, addRoute, removeRoute, resetToDefaults, selectedRouteId, onSelectRoute, compact }) {
  const [fromName, setFromName] = useState(CITIES.find((c) => c.name === 'Sydney')?.name ?? CITIES[0].name)
  const [toName, setToName] = useState(CITIES.find((c) => c.name === 'Beijing')?.name ?? CITIES[1].name)

  const handleAdd = () => {
    const from = CITIES.find((c) => c.name === fromName)
    const to = CITIES.find((c) => c.name === toName)
    addRoute(from, to)
  }

  const rowText = compact ? 'text-[13px]' : 'text-[12px]'

  return (
    <div>
      <p className="theme-fade mb-2 text-[12px] font-bold" style={{ color: 'var(--text-1)' }}>
        Add a route
      </p>
      <div className="flex items-center gap-2">
        <select
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          className={`theme-fade min-w-0 flex-1 rounded-lg border px-2 ${compact ? 'py-2.5 text-[13px]' : 'py-1.5 text-[12px]'}`}
          style={{ borderColor: 'var(--glass-border)', background: 'var(--card-bg)', color: 'var(--text-1)' }}
        >
          {CITIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
          →
        </span>
        <select
          value={toName}
          onChange={(e) => setToName(e.target.value)}
          className={`theme-fade min-w-0 flex-1 rounded-lg border px-2 ${compact ? 'py-2.5 text-[13px]' : 'py-1.5 text-[12px]'}`}
          style={{ borderColor: 'var(--glass-border)', background: 'var(--card-bg)', color: 'var(--text-1)' }}
        >
          {CITIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={handleAdd}
        disabled={fromName === toName}
        className={`theme-fade mt-2 w-full rounded-lg font-bold disabled:opacity-40 ${compact ? 'py-2.5 text-[13px]' : 'py-1.5 text-[12px]'}`}
        style={{ background: 'var(--accent)', color: '#ffffff' }}
      >
        Add Route
      </button>

      {routes.length > 0 && (
        <div className={`mt-3 space-y-1.5 overflow-y-auto ${compact ? 'max-h-56' : 'max-h-40'}`}>
          {routes.map((r) => {
            const selected = r.id === selectedRouteId
            return (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectRoute?.(selected ? null : r.id)}
                onKeyDown={(e) => e.key === 'Enter' && onSelectRoute?.(selected ? null : r.id)}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 ${compact ? 'py-2' : 'py-1'} ${rowText}`}
                style={{
                  color: selected ? '#ef4444' : 'var(--text-2)',
                  background: selected ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                  fontWeight: selected ? 700 : 400,
                }}
              >
                <span className="truncate">
                  {r.from.name} → {r.to.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeRoute(r.id)
                  }}
                  aria-label={`Remove route ${r.from.name} to ${r.to.name}`}
                  className="shrink-0 text-[15px] font-bold leading-none"
                  style={{ color: '#dc2626', minWidth: compact ? 32 : undefined, minHeight: compact ? 32 : undefined }}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
      <button
        onClick={resetToDefaults}
        className="theme-fade mt-3 text-[11px] underline"
        style={{ color: 'var(--text-3)' }}
      >
        Reset to defaults
      </button>
    </div>
  )
}
