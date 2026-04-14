import './MetricCard.css'

export default function MetricCard({ label, value, unit, description, icon, trend }) {
  const isDisconnected = value === '--'
  const hasTrend = !isDisconnected && trend !== null && trend !== undefined
  const trendUp = trend > 0
  const numericValue = typeof value === 'number' ? value : 0

  return (
    <div className={`metric-card ${isDisconnected ? 'metric-card--offline' : ''}`}>
      <div className="metric-card__header">
        <div className="metric-card__icon">{icon}</div>
        {hasTrend && (
          <div className={`metric-card__trend ${trendUp ? 'metric-card__trend--up' : 'metric-card__trend--down'}`}>
            {trendUp ? '▲' : '▼'} {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="metric-card__body">
        <div className={`metric-card__value ${isDisconnected ? 'metric-card__value--offline' : ''}`}>
          {isDisconnected ? (
            <span className="metric-card__dash">—</span>
          ) : (
            <>{value}<span className="metric-card__unit">{unit}</span></>
          )}
        </div>
        <div className="metric-card__label">{label}</div>
        <div className="metric-card__desc">{description}</div>
      </div>

      {/* Progress ring */}
      <div className="metric-card__ring-wrap">
        <svg className="metric-card__ring" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
          {!isDisconnected && (
            <circle
              cx="28" cy="28" r="22"
              stroke={`url(#ring-grad-${label.replace(/\s+/g, '-')})`}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(numericValue / 100) * 138.2} 138.2`}
              strokeDashoffset="34.5"
              transform="rotate(-90 28 28)"
            />
          )}
          {isDisconnected && (
            <circle
              cx="28" cy="28" r="22"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="20 118.2"
              strokeDashoffset="34.5"
              transform="rotate(-90 28 28)"
              className="metric-card__ring-pulse"
            />
          )}
          <defs>
            <linearGradient id={`ring-grad-${label.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="100%" stopColor="#00d2ff" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  )
}