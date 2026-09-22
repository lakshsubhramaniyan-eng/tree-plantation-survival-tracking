type MetricCardProps = {
  label: string
  value: string
  detail: string
  tone?: 'positive' | 'warning' | 'neutral'
}

export function MetricCard({ label, value, detail, tone = 'neutral' }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <p className="eyebrow">{label}</p>
      <strong>{value}</strong>
      <p className="metric-detail">{detail}</p>
    </article>
  )
}