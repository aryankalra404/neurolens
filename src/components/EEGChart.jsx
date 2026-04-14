import { useState, useEffect, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import './EEGChart.css'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="eeg-tooltip">
      {payload.map((p) => (
        <div key={p.dataKey} className="eeg-tooltip__row">
          <span className="eeg-tooltip__dot" style={{ background: p.color }} />
          <span>{p.dataKey.charAt(0).toUpperCase() + p.dataKey.slice(1)}</span>
          <strong>{p.value.toFixed(1)} µV</strong>
        </div>
      ))}
    </div>
  )
}

export default function EEGChart({ externalData = null, isConnected = false, analyzeSlot = null }) {
  const [active, setActive] = useState({ alpha: true, beta: true, theta: true, delta: true })

  // Only show data when connected and receiving from Arduino
  const hasData = isConnected && externalData && externalData.length > 0
  const displayData = hasData ? externalData : []

  const bands = [
    { key: 'alpha', color: 'var(--signal-alpha)', label: 'Alpha' },
    { key: 'beta', color: 'var(--signal-beta)', label: 'Beta' },
    { key: 'theta', color: 'var(--signal-theta)', label: 'Theta' },
    { key: 'delta', color: 'var(--signal-delta, #a78bfa)', label: 'Delta' },
  ]

  return (
    <div className="eeg-chart">
      <div className="eeg-chart__header">
        <div>
          <h3 className="eeg-chart__title">EEG Waveform</h3>
          <p className="eeg-chart__sub">
            {isConnected ? 'Live Arduino data via Web Serial' : 'Connect device to begin'}
          </p>
        </div>
        <div className="eeg-chart__status">
          <span className={`eeg-chart__live-dot ${isConnected ? '' : 'eeg-chart__live-dot--off'}`} />
          {isConnected ? 'LIVE' : 'OFFLINE'}
        </div>
      </div>

      {/* Band toggles */}
      <div className="eeg-chart__toggles">
        {bands.map(b => (
          <button
            key={b.key}
            className={`eeg-chart__toggle ${active[b.key] ? 'eeg-chart__toggle--on' : ''}`}
            style={{ '--band-color': b.color }}
            onClick={() => setActive(prev => ({ ...prev, [b.key]: !prev[b.key] }))}
          >
            <span className="eeg-chart__toggle-dot" />
            {b.label}
          </button>
        ))}
      </div>

      <div className="eeg-chart__graph">
        {!hasData ? (
          <div className="eeg-chart__empty">
            {/* Decorative demo waveform */}
            <svg className="eeg-chart__demo-waves" viewBox="0 0 800 160" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="dw-alpha" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="dw-beta" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00b8ff" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#00b8ff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="dw-theta" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a0aec0" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#a0aec0" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Theta — slow, wide */}
              <path d="M0 105 C 100 50, 200 130, 300 85 S 500 38, 600 95 S 750 120, 800 85 L800 160 L0 160Z"
                fill="url(#dw-theta)" />
              <path d="M0 105 C 100 50, 200 130, 300 85 S 500 38, 600 95 S 750 120, 800 85"
                fill="none" stroke="#a0aec0" strokeWidth="1.5" strokeOpacity="0.18" />
              {/* Beta — medium */}
              <path d="M0 88 C 60 52, 120 115, 180 76 S 300 38, 360 80 S 480 112, 540 70 S 660 32, 720 76 S 780 98, 800 80 L800 160 L0 160Z"
                fill="url(#dw-beta)" />
              <path d="M0 88 C 60 52, 120 115, 180 76 S 300 38, 360 80 S 480 112, 540 70 S 660 32, 720 76 S 780 98, 800 80"
                fill="none" stroke="#00b8ff" strokeWidth="1.5" strokeOpacity="0.22" />
              {/* Alpha — prominent */}
              <path d="M0 96 C 40 58, 80 122, 130 80 S 210 28, 270 76 S 360 128, 420 80 S 510 28, 570 74 S 660 128, 720 80 S 775 52, 800 70 L800 160 L0 160Z"
                fill="url(#dw-alpha)" />
              <path d="M0 96 C 40 58, 80 122, 130 80 S 210 28, 270 76 S 360 128, 420 80 S 510 28, 570 74 S 660 128, 720 80 S 775 52, 800 70"
                fill="none" stroke="#00f0ff" strokeWidth="2" strokeOpacity="0.32" />
            </svg>
            <div className="eeg-chart__empty-msg">
              <p>No signal — connect your device to see live EEG data</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayData} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
              <defs>
                {bands.map(b => (
                  <linearGradient key={b.key} id={`grad-${b.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={b.color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={b.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="t" hide />
              <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              {bands.map(b => active[b.key] && (
                <Area
                  key={b.key}
                  type="monotone"
                  dataKey={b.key}
                  stroke={b.color}
                  strokeWidth={1.5}
                  fill={`url(#grad-${b.key})`}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      {analyzeSlot && (
        <div className="eeg-chart__footer">
          {analyzeSlot}
        </div>
      )}
    </div>
  )
}