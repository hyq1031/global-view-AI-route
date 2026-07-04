export default function DataModeSwitch({ mode, setMode, isAutoFallback, className }) {
  return (
    <div className={`${className} flex items-center gap-2`}>
      <div className="theme-fade flex rounded-full p-1" style={{ background: 'var(--pill-track)', boxShadow: 'var(--control-shadow)' }}>
        {['live', 'trial'].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition-all duration-200"
            style={
              mode === m
                ? { background: '#ffffff', color: '#16203c', boxShadow: '0 1px 4px rgba(20, 30, 60, 0.2)' }
                : { color: 'var(--text-2)' }
            }
          >
            {m}
          </button>
        ))}
      </div>
      {isAutoFallback && (
        <span className="theme-fade text-[11px] font-medium" style={{ color: '#d97706' }}>
          auto-fallback
        </span>
      )}
    </div>
  )
}
