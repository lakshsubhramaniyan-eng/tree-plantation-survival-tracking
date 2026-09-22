import { useState } from 'react'

export type Site = { id: number; name: string; region: string; trees: number; survival: number; status: 'On track' | 'Needs attention' }

type SiteTableProps = {
  sites: Site[]
  region: string
  onUpdateSite: (site: Site) => void
  onDeleteSite: (siteId: Site['id']) => void
}

type SiteDraft = Pick<Site, 'name' | 'region' | 'trees' | 'survival'>

export function SiteTable({ sites, region, onUpdateSite, onDeleteSite }: SiteTableProps) {
  const [editingSiteId, setEditingSiteId] = useState<Site['id'] | null>(null)
  const [draft, setDraft] = useState<SiteDraft | null>(null)
  const visibleSites = region === 'All regions' ? sites : sites.filter((site) => site.region === region)

  const startEditing = (site: Site) => {
    setEditingSiteId(site.id)
    setDraft({ name: site.name, region: site.region, trees: site.trees, survival: site.survival })
  }

  const cancelEditing = () => {
    setEditingSiteId(null)
    setDraft(null)
  }

  const saveEditing = (site: Site) => {
    if (!draft || draft.name.trim() === '' || draft.region.trim() === '' || draft.trees < 0 || draft.survival < 0 || draft.survival > 100) {
      return
    }

    onUpdateSite({
      ...site,
      ...draft,
      name: draft.name.trim(),
      region: draft.region.trim(),
      status: draft.survival >= 80 ? 'On track' : 'Needs attention',
    })
    cancelEditing()
  }

  const requestDelete = (site: Site) => {
    if (window.confirm(`Delete ${site.name}?`)) {
      onDeleteSite(site.id)
    }
  }

  return (
    <section className="panel site-panel" aria-labelledby="sites-title">
      <div className="panel-heading"><div><p className="eyebrow">Portfolio view</p><h2 id="sites-title">Plantation sites</h2></div><button className="button button--outline" type="button">Export CSV</button></div>
      {visibleSites.length > 0 ? <div className="table-wrap"><table><thead><tr><th>Site</th><th>Region</th><th>Planted trees</th><th>Survival</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visibleSites.map((site) => {
        const isEditing = editingSiteId === site.id && draft
        return <tr key={site.id}>{isEditing ? <><td><input className="site-edit-input" aria-label="Site name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></td><td><input className="site-edit-input" aria-label="Site region" value={draft.region} onChange={(event) => setDraft({ ...draft, region: event.target.value })} /></td><td><input className="site-edit-input site-edit-input--number" aria-label="Planted trees" type="number" min="0" value={draft.trees} onChange={(event) => setDraft({ ...draft, trees: Number(event.target.value) })} /></td><td><input className="site-edit-input site-edit-input--number" aria-label="Survival percentage" type="number" min="0" max="100" value={draft.survival} onChange={(event) => setDraft({ ...draft, survival: Number(event.target.value) })} /></td><td><span className={`status status--${draft.survival >= 80 ? 'good' : 'warning'}`}>{draft.survival >= 80 ? 'On track' : 'Needs attention'}</span></td><td className="table-actions"><button className="table-action table-action--save" type="button" onClick={() => saveEditing(site)}>Save</button><button className="table-action" type="button" onClick={cancelEditing}>Cancel</button></td></> : <><td><strong>{site.name}</strong></td><td>{site.region}</td><td>{site.trees.toLocaleString()}</td><td><strong>{site.survival}%</strong></td><td><span className={`status status--${site.status === 'On track' ? 'good' : 'warning'}`}>{site.status}</span></td><td className="table-actions"><button className="table-action" type="button" onClick={() => startEditing(site)}>Edit</button><button className="table-action table-action--delete" type="button" onClick={() => requestDelete(site)}>Delete</button></td></>}</tr>
      })}</tbody></table></div> : <p className="empty-state">No sites match this region.</p>}
    </section>
  )
}