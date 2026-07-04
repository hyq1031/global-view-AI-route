export default function TitleBlock({ className }) {
  return (
    <div className={`${className} pointer-events-none select-none`}>
      <p className="theme-fade mb-4 text-lg font-medium" style={{ color: 'var(--accent)' }}>
        AI-Powered
      </p>
      <h1
        className="theme-fade text-[clamp(34px,3.5vw,58px)] font-bold leading-[1.07] tracking-tight"
        style={{ color: 'var(--text-1)' }}
      >
        Plan Your Route with AI Now <span className="align-middle text-[0.8em]">✨</span>
      </h1>
      <button
        className="theme-fade pointer-events-auto mt-9 rounded-lg px-4 pb-2.5 pt-3 text-[13px] font-bold uppercase tracking-[0.09em] transition-transform hover:-translate-y-0.5 active:translate-y-0"
        style={{
          color: 'var(--text-1)',
          background: 'var(--howit-bg)',
          boxShadow: 'inset 0 -3px 0 0 var(--yellow)',
        }}
      >
        How It Works
      </button>
    </div>
  )
}
