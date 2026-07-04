export default function ViewToggle({ view, setView, className }) {
  return (
    <div
      className={`${className} theme-fade z-10 flex rounded-full p-1.5`}
      style={{ background: 'var(--pill-track)', boxShadow: 'var(--control-shadow)' }}
    >
      {['3d', '2d'].map((v) => (
        <button
          key={v}
          onClick={() => setView(v)}
          className="rounded-full px-6 py-2 text-[15px] font-bold transition-all duration-300"
          style={
            view === v
              ? { background: '#ffffff', color: '#16203c', boxShadow: '0 2px 10px rgba(20, 30, 60, 0.2)' }
              : { color: 'var(--text-2)' }
          }
        >
          {v.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
