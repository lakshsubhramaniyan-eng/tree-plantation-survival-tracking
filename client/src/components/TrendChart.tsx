type TrendPoint = { month: string; value: number }

type TrendChartProps = { points: TrendPoint[] }

export function TrendChart({ points }: TrendChartProps) {
  const maxValue = Math.max(...points.map((point) => point.value))
  return (
    <section className="panel trend-panel" aria-labelledby="trend-title">
      <div className="panel-heading"><div><p className="eyebrow">Field reporting</p><h2 id="trend-title">Survival trend</h2></div><span className="legend"><i /> Survival rate</span></div>
      <div className="chart" role="img" aria-label="Survival rate increases from 71 to 82 percent over six months"><div className="chart-grid"><span>90%</span><span>75%</span><span>60%</span></div><div className="chart-bars">{points.map((point) => <div className="chart-column" key={point.month}><div className="chart-bar" style={{ height: `${(point.value / maxValue) * 100}%` }}><span>{point.value}%</span></div><small>{point.month}</small></div>)}</div></div>
    </section>
  )
}