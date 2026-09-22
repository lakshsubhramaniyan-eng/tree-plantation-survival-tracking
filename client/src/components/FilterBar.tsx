type FilterBarProps = {
  region: string
  period: string
  onRegionChange: (region: string) => void
  onPeriodChange: (period: string) => void
}

export function FilterBar({ region, period, onRegionChange, onPeriodChange }: FilterBarProps) {
  return (
    <section className="filter-bar" aria-label="Dashboard filters">
      <label>Region<select value={region} onChange={(event) => onRegionChange(event.target.value)}><option>All regions</option><option>North district</option><option>Coastal belt</option><option>Western slopes</option></select></label>
      <label>Reporting period<select value={period} onChange={(event) => onPeriodChange(event.target.value)}><option>Last 30 days</option><option>Last quarter</option><option>This year</option></select></label>
      <button className="button button--quiet" type="button" onClick={() => onRegionChange('All regions')}>Reset filters</button>
    </section>
  )
}