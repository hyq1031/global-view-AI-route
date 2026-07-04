function Stat({ label, value, delta }) {
  return (
    <div>
      <p className="theme-fade text-[15px] font-medium" style={{ color: 'var(--text-2)' }}>
        {label}
      </p>
      <p
        className="theme-fade mt-0.5 text-[40px] font-bold leading-tight tracking-tight"
        style={{ color: 'var(--text-1)' }}
      >
        {value}{' '}
        <span className="align-middle text-[15px] font-semibold" style={{ color: 'var(--green)' }}>
          {delta}
        </span>
      </p>
    </div>
  )
}

export default function StatsPanel({ className }) {
  return (
    <div className={`${className} pointer-events-none select-none space-y-5`}>
      <h2 className="theme-fade text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-1)' }}>
        Main Statistics
      </h2>
      <Stat label="Monthly Delivered" value="1021" delta="+32%" />
      <Stat label="Yearly Delivered" value="4603" delta="+12%" />
    </div>
  )
}
