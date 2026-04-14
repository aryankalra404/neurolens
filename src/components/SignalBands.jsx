import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import './SignalBands.css'

const BANDS = [
  { name: 'Delta', frequency: '0.5–4 Hz', power: 45, color: 'var(--signal-delta)' },
  { name: 'Theta', frequency: '4–8 Hz',   power: 32, color: 'var(--signal-theta)' },
  { name: 'Alpha', frequency: '8–13 Hz',  power: 78, color: 'var(--signal-alpha)' },
  { name: 'Beta',  frequency: '13–30 Hz', power: 56, color: 'var(--signal-beta)' },
  { name: 'Gamma', frequency: '30–100 Hz',power: 15, color: 'var(--signal-gamma)' },
]

export default function SignalBands() {
  return (
    <div className="signal-bands">
      <div className="signal-bands__header">
        <h3 className="signal-bands__title">Spectral Power</h3>
        <span className="signal-bands__subtitle">Relative Band Power (%)</span>
      </div>
      
      <div className="signal-bands__chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={BANDS}
            margin={{ top: 20, right: 20, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'var(--bg-elevated)', opacity: 0.5 }}
              contentStyle={{ 
                backgroundColor: 'var(--bg-elevated)', 
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text)'
              }}
              itemStyle={{ color: 'var(--text)' }}
              formatter={(value, name, props) => [`${value}%`, `Power (${props.payload.frequency})`]}
            />
            <Bar dataKey="power" radius={[4, 4, 0, 0]}>
              {BANDS.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
