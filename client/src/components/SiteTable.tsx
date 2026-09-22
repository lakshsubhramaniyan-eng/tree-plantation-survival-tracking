export type Site = { name: string; region: string; trees: number; survival: number; status: 'On track' | 'Needs attention' }

type SiteTableProps = { sites: Site[]; region: string }

export function SiteTable({ sites, region }: SiteTableProps) {
  const visibleSites = region === 'All regions' ? sites : sites.filter((site) => site.region === region)
  return (
    <section className="panel site-panel" aria-labelledby="sites-title">
      <div className="panel-heading"><div><p className="eyebrow">Portfolio view</p><h2 id="sites-title">Plantation sites</h2></div><button className="button button--outline" type="button">Export CSV</button></div>
      {visibleSites.length > 0 ? <div className="table-wrap"><table><thead><tr><th>Site</th><th>Region</th><th>Planted trees</th><th>Survival</th><th>Status</th></tr></thead><tbody>{visibleSites.map((site) => <tr key={site.name}><td><strong>{site.name}</strong></td><td>{site.region}</td><td>{site.trees.toLocaleString()}</td><td><strong>{site.survival}%</strong></td><td><span className={`status status--${site.status === 'On track' ? 'good' : 'warning'}`}>{site.status}</span></td></tr>)}</tbody></table></div> : <p className="empty-state">No sites match this region.</p>}
    </section>
  )
}