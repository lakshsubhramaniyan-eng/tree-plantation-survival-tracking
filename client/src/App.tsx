import { useState } from 'react'
import { FilterBar } from './components/FilterBar'
import { MetricCard } from './components/MetricCard'
import { SiteTable, type Site } from './components/SiteTable'
import { TrendChart } from './components/TrendChart'
import './App.css'

function App() {
  const [region, setRegion] = useState('All regions')
  const [period, setPeriod] = useState('Last 30 days')
  const [sites, setSites] = useState<Site[]>([
    { id: 1, name: 'Mawingu South', region: 'North district', trees: 12400, survival: 91, status: 'On track' },
    { id: 2, name: 'Kijani Ridge', region: 'Western slopes', trees: 9800, survival: 78, status: 'Needs attention' },
    { id: 3, name: 'Mtoni Watershed', region: 'Coastal belt', trees: 15750, survival: 84, status: 'On track' },
  ])

  const updateSite = (updatedSite: Site) => {
    setSites((currentSites) => currentSites.map((site) => site.id === updatedSite.id ? updatedSite : site))
  }

  const deleteSite = (siteId: Site['id']) => {
    setSites((currentSites) => currentSites.filter((site) => site.id !== siteId))
  }

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="brand-mark"><span>TS</span><div><strong>Treebase</strong><small>Survival tracking</small></div></div>
        <div className="user-menu"><span className="avatar">LP</span><span>Field coordinator</span><button aria-label="Open account menu">⌄</button></div>
      </header>
      <div className="dashboard-content">
        <div className="page-heading"><div><p className="eyebrow">Wednesday, 23 September 2026</p><h1>Good morning, Lakshmi</h1><p>Here is how your plantations are performing today.</p></div><button className="button button--primary" type="button">+ Add observation</button></div>
        <FilterBar region={region} period={period} onRegionChange={setRegion} onPeriodChange={setPeriod} />
        <section className="metrics-grid" aria-label="Portfolio summary">
          <MetricCard label="Overall survival" value="82.4%" detail="Up 3.8% from last period" tone="positive" />
          <MetricCard label="Trees surviving" value="31,642" detail="of 38,400 planted" />
          <MetricCard label="Sites monitored" value="12" detail="3 need attention" tone="warning" />
        </section>
        <div className="dashboard-grid"><TrendChart points={[{ month: 'Apr', value: 71 }, { month: 'May', value: 74 }, { month: 'Jun', value: 76 }, { month: 'Jul', value: 78 }, { month: 'Aug', value: 80 }, { month: 'Sep', value: 82 }]} /><aside className="panel attention-panel"><div className="panel-heading"><div><p className="eyebrow">Action queue</p><h2>Needs attention</h2></div><span className="attention-count">3</span></div><p className="attention-copy">These sites are below the 80% survival threshold and may need a field visit.</p><button className="button button--outline" type="button">Review sites <span>→</span></button></aside></div>
        <SiteTable sites={sites} region={region} onUpdateSite={updateSite} onDeleteSite={deleteSite} />
      </div>
    </main>
  )
}

export default App
