import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import { RiTimeLine, RiCalendarLine, RiDeleteBinLine, RiEdit2Line, RiCheckLine, RiCloseLine, RiBrainLine } from 'react-icons/ri'
import './SessionsView.css'

/* ── Arc Gauge ─────────────────────────────────────────────── */
const ARC_LEN = Math.PI * 26  // r=26

function ArcGauge({ value, color, label }) {
  const filled = (Math.max(0, Math.min(100, value)) / 100) * ARC_LEN
  return (
    <div className="arc-gauge">
      <svg viewBox="0 0 68 46" className="arc-gauge__svg" aria-label={`${label}: ${value}%`}>
        {/* track */}
        <path
          d="M 8,40 A 26,26 0 0,1 60,40"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* fill — no glow, just clean stroke */}
        <motion.path
          d="M 8,40 A 26,26 0 0,1 60,40"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeOpacity="0.85"
          initial={{ strokeDasharray: `0 ${ARC_LEN}` }}
          animate={{ strokeDasharray: `${filled} ${ARC_LEN}` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* value */}
        <text
          x="34"
          y="33"
          textAnchor="middle"
          className="arc-gauge__value-text"
          style={{ fill: color, fillOpacity: 0.9 }}
        >
          {value}%
        </text>
      </svg>
      <span className="arc-gauge__label">{label}</span>
    </div>
  )
}

const GAUGE_META = [
  { label: 'Focus',   field: 'focus_avg',       color: '#00d4e8' },
  { label: 'Relax',   field: 'relaxation_avg',  color: '#34c97a' },
  { label: 'Stress',  field: 'stress_avg',       color: '#f5a623' },
  { label: 'Fatigue', field: 'cog_fatigue_avg',  color: '#9b8fe0' },
]

/* ── Warning badges ────────────────────────────────────────── */
const WARNINGS = [
  { field: 'stress_avg',      threshold: 75, label: 'High Stress',   },
  { field: 'cog_fatigue_avg', threshold: 75, label: 'High Fatigue',  },
]

function getWarnings(session) {
  return WARNINGS.filter(w => (session[w.field] ?? 0) > w.threshold)
}
export default function SessionsView({ userId }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingSessionId, setEditingSessionId] = useState(null)
  const [editTagValue, setEditTagValue] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const GROUPS_PER_PAGE = 5

  const allGroupedSessions = sessions.reduce((acc, session) => {
    const dateStr = new Date(session.created_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
    if (!acc[dateStr]) acc[dateStr] = []
    acc[dateStr].push(session)
    return acc
  }, {})
  const allGroupEntries = Object.entries(allGroupedSessions)
  const totalPages = Math.ceil(allGroupEntries.length / GROUPS_PER_PAGE)
  const paginatedGroups = allGroupEntries.slice(
    (currentPage - 1) * GROUPS_PER_PAGE,
    currentPage * GROUPS_PER_PAGE
  )

  useEffect(() => {
    if (allGroupEntries.length > 0 && currentPage > Math.ceil(allGroupEntries.length / GROUPS_PER_PAGE)) {
      setCurrentPage(1)
    }
  }, [sessions.length])

  useEffect(() => {
    if (!userId) return
    async function fetchSessions() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        if (error) throw error
        setSessions(data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchSessions()
  }, [userId])

  const handleDelete = async (sessionId) => {
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId).eq('user_id', userId)
      if (error) throw error
      setSessions(prev => prev.filter(s => s.id !== sessionId))
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  const handleUpdateTag = async (sessionId) => {
    try {
      const { error } = await supabase.from('sessions').update({ tag: editTagValue }).eq('id', sessionId).eq('user_id', userId)
      if (error) throw error
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, tag: editTagValue } : s))
      setEditingSessionId(null)
    } catch (err) {
      console.error('Failed to update session name:', err)
    }
  }

  const handleKeyDown = (e, sessionId) => {
    if (e.key === 'Enter') handleUpdateTag(sessionId)
    else if (e.key === 'Escape') setEditingSessionId(null)
  }

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }

  const formatTime = (dateString) => new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit'
  })

  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)
  const n = sessions.length || 1
  const avgFocus   = Math.round(sessions.reduce((sum, s) => sum + (s.focus_avg    || 0), 0) / n)
  const avgStress  = Math.round(sessions.reduce((sum, s) => sum + (s.stress_avg   || 0), 0) / n)
  const avgRelax   = Math.round(sessions.reduce((sum, s) => sum + (s.relaxation_avg || 0), 0) / n)
  const avgFatigue = Math.round(sessions.reduce((sum, s) => sum + (s.cog_fatigue_avg || 0), 0) / n)
  const totalHours = Math.floor(totalDuration / 3600)
  const totalMins  = Math.floor((totalDuration % 3600) / 60)
  const totalTimeLabel = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`

  if (loading) return (
    <div className="sessions-view__loading">
      <div className="sessions-spinner" />
      Loading sessions
    </div>
  )

  if (error) return (
    <div className="sessions-view__error">
      <RiBrainLine size={28} style={{ opacity: 0.4 }} />
      Failed to load sessions
    </div>
  )

  if (sessions.length === 0) return (
    <div className="sessions-view__empty">
      <RiBrainLine size={36} style={{ color: 'var(--signal-alpha)', opacity: 0.3 }} />
      <p>No sessions yet</p>
      <span>Connect your device and start a recording to track your brain activity over time.</span>
    </div>
  )

  return (
    <div className="sessions-view">

      {/* ── Single-row summary strip ── */}
      <motion.div
        className="sessions-summary"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        {[
          { val: sessions.length,  label: 'Sessions'   },
          { val: totalTimeLabel,   label: 'Total Time' },
          { val: `${avgFocus}%`,   label: 'Avg Focus'  },
          { val: `${avgStress}%`,  label: 'Avg Stress' },
          { val: `${avgRelax}%`,   label: 'Avg Relax'  },
          { val: `${avgFatigue}%`, label: 'Avg Fatigue'},
        ].map((s, i, arr) => (
          <div key={s.label} className="ss-stat">
            <span className="ss-stat__val" style={s.color ? { color: s.color } : undefined}>{s.val}</span>
            <span className="ss-stat__label">{s.label}</span>
            {i < arr.length - 1 && <div className="ss-stat__divider" />}
          </div>
        ))}
      </motion.div>

      {/* ── Day groups ── */}
      {paginatedGroups.map(([dateLabel, daySessions], groupIndex) => (
        <motion.div
          key={dateLabel}
          className="session-day-group"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: groupIndex * 0.055, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="session-day-header">
            <RiCalendarLine size={12} className="session-day-icon" />
            <h3>{dateLabel}</h3>
            <div className="session-day-line" />
            <span className="session-day-count">{daySessions.length} session{daySessions.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="session-day-list">
            {daySessions.map((s, cardIndex) => (
              <motion.div
                key={s.id}
                className={`session-card ${getWarnings(s).length > 0 ? 'has-warning' : ''}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.055 + cardIndex * 0.04, duration: 0.32 }}
              >
                {/* Header row */}
                <div className="session-card__top">
                  <div className="session-card__meta">
                    {editingSessionId === s.id ? (
                      <div className="session-card__edit-mode">
                        <input
                          type="text"
                          value={editTagValue}
                          onChange={(e) => setEditTagValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, s.id)}
                          placeholder="Name this session…"
                          autoFocus
                          className="session-name-input"
                        />
                        <button onClick={() => handleUpdateTag(s.id)} className="session-edit-action success" title="Save">
                          <RiCheckLine size={14} />
                        </button>
                        <button onClick={() => setEditingSessionId(null)} className="session-edit-action cancel" title="Cancel">
                          <RiCloseLine size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="session-card__name">
                        <span className="session-card__index">#{sessions.length - sessions.indexOf(s)}</span>
                        {s.tag || `Session at ${formatTime(s.created_at)}`}
                      </div>
                    )}
                    <div className="session-card__sub">
                      <RiTimeLine size={11} />
                      {formatDuration(s.duration_seconds)}
                      <span className="session-card__dot" />
                      {formatTime(s.created_at)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="session-card__actions">
                    <button className="session-edit-btn" onClick={() => { setEditingSessionId(s.id); setEditTagValue(s.tag || '') }} title="Rename">
                      <RiEdit2Line size={13} />
                    </button>
                    <button className="session-delete-btn" onClick={() => handleDelete(s.id)} title="Delete">
                      <RiDeleteBinLine size={13} />
                    </button>
                  </div>
                </div>

                {/* Gauge row */}
                <div className="session-card__gauges">
                  {GAUGE_META.map(({ label, field, color }, gi) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: groupIndex * 0.055 + cardIndex * 0.04 + gi * 0.05 + 0.08 }}
                    >
                      <ArcGauge value={Math.round(s[field] ?? 0)} color={color} label={label} />
                    </motion.div>
                  ))}
                </div>

                {/* Warning bar — only renders when thresholds are exceeded */}
                {getWarnings(s).length > 0 && (
                  <motion.div
                    className="session-card__warn-bar"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                      <path d="M6.5 1L12 11.5H1L6.5 1Z" stroke="#f87171" strokeWidth="1.4" strokeLinejoin="round" fill="rgba(248,113,113,0.12)" />
                      <line x1="6.5" y1="5" x2="6.5" y2="8.5" stroke="#f87171" strokeWidth="1.3" strokeLinecap="round" />
                      <circle cx="6.5" cy="10.2" r="0.65" fill="#f87171" />
                    </svg>
                    {getWarnings(s).map(w => w.label).join(' · ')}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}

      {totalPages > 1 && (
        <motion.div className="sessions-pagination" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>← Prev</button>
          <span className="pagination-info">{currentPage} / {totalPages}</span>
          <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next →</button>
        </motion.div>
      )}
    </div>
  )
}