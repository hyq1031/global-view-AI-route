export default function LiveFlightsBadge({ status, className }) {
  if (!status) return null
  const { count, updatedAt, error, creditsRemaining } = status

  if (error) {
    return (
      <div className={`${className} theme-fade max-w-[220px] text-[12px] leading-5`} style={{ color: '#d97706' }}>
        Live flights unavailable — {error}
        {creditsRemaining != null && (
          <span className="block" style={{ color: 'var(--text-3)' }}>
            {creditsRemaining.toLocaleString()} OpenSky credits left today
          </span>
        )}
      </div>
    )
  }

  if (!updatedAt) {
    return (
      <div className={`${className} theme-fade text-[12px]`} style={{ color: 'var(--text-3)' }}>
        Connecting to OpenSky…
      </div>
    )
  }

  return (
    <div className={`${className} theme-fade flex items-center gap-2 text-[12px]`} style={{ color: 'var(--text-3)' }}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: '#22c55e' }} />
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#22c55e' }} />
      </span>
      {count.toLocaleString()} live aircraft · OpenSky
      {creditsRemaining != null && <span>· {creditsRemaining.toLocaleString()} credits left</span>}
    </div>
  )
}
