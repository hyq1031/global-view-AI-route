function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export default function ThemeToggle({ theme, setTheme, className }) {
  const night = theme === 'night'
  return (
    <button
      aria-label="Toggle day/night theme"
      onClick={() => setTheme(night ? 'day' : 'night')}
      className={`${className} theme-fade z-10 flex h-10 w-[76px] items-center gap-1.5 rounded-full px-1.5`}
      style={{ background: 'var(--pill-track)' }}
    >
      <span className="theme-fade h-7 w-7 shrink-0 rounded-full bg-white shadow-md transition-transform active:scale-90" />
      <span className="theme-fade grid h-7 w-7 place-items-center" style={{ color: 'var(--text-2)' }}>
        {night ? <MoonIcon /> : <SunIcon />}
      </span>
    </button>
  )
}
