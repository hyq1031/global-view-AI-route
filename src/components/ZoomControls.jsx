function ControlButton({ children, onClick, label }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="theme-fade grid h-11 w-11 place-items-center rounded-full transition-transform hover:scale-105 active:scale-95"
      style={{ background: 'var(--control-bg)', color: 'var(--control-fg)', boxShadow: 'var(--control-shadow)' }}
    >
      {children}
    </button>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M5 12h14" />
    </svg>
  )
}

function TargetIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  )
}

export default function ZoomControls({ globeRef, className }) {
  return (
    <div className={`${className} z-10 flex flex-col items-end gap-3`}>
      <ControlButton label="Zoom in" onClick={() => globeRef.current?.zoomIn()}>
        <PlusIcon />
      </ControlButton>
      <div className="flex gap-3">
        <ControlButton label="Zoom out" onClick={() => globeRef.current?.zoomOut()}>
          <MinusIcon />
        </ControlButton>
        <ControlButton label="Recenter globe" onClick={() => globeRef.current?.recenter()}>
          <TargetIcon />
        </ControlButton>
      </div>
    </div>
  )
}
