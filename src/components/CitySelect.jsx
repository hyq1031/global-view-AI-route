// Dropdown that highlights every trial route touching a chosen city (dims the
// rest) via DashboardCard's unified selection state. Options are limited to
// cities that actually appear in the current route list, so every choice is
// guaranteed to highlight something.
export default function CitySelect({ cities, selectedCity, onSelectCity, compact, className }) {
  const handleChange = (e) => onSelectCity(e.target.value || null)

  if (compact) {
    return (
      <div className={className}>
        <p className="theme-fade mb-2 text-[12px] font-bold" style={{ color: 'var(--text-1)' }}>
          Highlight a city
        </p>
        <select
          value={selectedCity ?? ''}
          onChange={handleChange}
          disabled={cities.length === 0}
          className="theme-fade w-full rounded-lg border px-2 py-2.5 text-[13px] disabled:opacity-40"
          style={{ borderColor: 'var(--glass-border)', background: 'var(--card-bg)', color: 'var(--text-1)' }}
        >
          <option value="">All cities</option>
          {cities.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <select
      value={selectedCity ?? ''}
      onChange={handleChange}
      disabled={cities.length === 0}
      aria-label="Highlight routes for a city"
      className={`theme-fade rounded-full border-0 px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40 ${className ?? ''}`}
      style={{ background: 'var(--control-bg)', color: 'var(--control-fg)', boxShadow: 'var(--control-shadow)' }}
    >
      <option value="">All cities</option>
      {cities.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  )
}
