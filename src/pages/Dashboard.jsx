import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RiBrainLine, RiWifiLine, RiRecordCircleLine, RiStopCircleLine, RiDownloadLine, RiUsbLine, RiPulseLine, RiTimeLine, RiLightbulbFlashLine, RiArrowUpLine, RiArrowDownLine, RiLeafLine } from 'react-icons/ri'
import { HiOutlineCog, HiOutlineBell } from 'react-icons/hi'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import EEGChart from '../components/EEGChart'
import MetricCard from '../components/MetricCard'
import SessionsView from '../components/SessionsView'
import InsightsView from '../components/InsightsView'
import ScienceBehindView from '../components/ScienceBehindView'
import NeuralResetView from '../components/NeuralResetView'
import CalibrationModal from '../components/CalibrationModal'
import useSerial from '../hooks/useSerial'
import './Dashboard.css'

const NAV_ITEMS = [
  { id: 'Overview', icon: <RiPulseLine size={18} />, label: 'Overview' },
  { id: 'Sessions', icon: <RiTimeLine size={18} />, label: 'Sessions' },
  { id: 'Insights & Tips', icon: <RiLightbulbFlashLine size={18} />, label: 'Insights & Tips' },
  { id: 'Neural Reset', icon: <RiLeafLine size={18} />, label: 'Neural Reset' },
  { id: 'The Science Behind', icon: <RiBrainLine size={18} />, label: 'The Science Behind' }
]

// Default metrics when no Arduino is connected
const DEFAULT_METRICS = [
  { label: 'Focus Level',     value: '--', unit: '', description: 'Connect device to measure', icon: '🎯', trend: null },
  { label: 'Stress Index',    value: '--', unit: '', description: 'Connect device to measure', icon: '⚡', trend: null },
  { label: 'Relaxation',      value: '--', unit: '', description: 'Connect device to measure', icon: '🌊', trend: null },
  { label: 'Cog. Fatigue',    value: '--', unit: '', description: 'Connect device to measure', icon: '🧠', trend: null },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('Overview')
  const [sessionTime, setSessionTime] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)

  // Calibration state: 'idle' | 'show_modal' | 'calibrating' | 'done'
  const [calibrationState, setCalibrationState] = useState('idle')
  const [baseline, setBaseline] = useState(null)

  // Arduino serial connection
  const {
    isConnected,
    isSupported,
    connect,
    disconnect,
    metrics: serialMetrics,
    chartData,
    getSessionAverages,
    startCalibration,
    connectError,
    clearConnectError,
    clearSessionData,
    clearChartData,
  } = useSerial()

  // Device-level error shown as a banner (separate from connectError)
  // 'no_data_timeout' — port opened but Arduino sent nothing in 10s
  const [deviceError, setDeviceError] = useState(null)

  // DEV DEMO — press "A" to trigger the stress alert for pitch demo
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'a' || e.key === 'A') {
        setStressAlertDismissed(false)
        setStressAlertVisible(true)
        setActiveTab('Overview')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])
  const [stressAlertVisible, setStressAlertVisible] = useState(false)
  const [stressAlertDismissed, setStressAlertDismissed] = useState(false)
  const stressHighSince = useRef(null)

  useEffect(() => {
    if (!isConnected || calibrationState !== 'done') return

    const stress = Math.round(serialMetrics.stress)

    if (stress >= 80) {
      if (!stressHighSince.current) stressHighSince.current = Date.now()
      const elapsed = (Date.now() - stressHighSince.current) / 1000
      if (elapsed >= 120 && !stressAlertDismissed) {
        setStressAlertVisible(true)
      }
    } else {
      // Hysteresis — only reset once stress drops below 70
      if (stress < 70) {
        stressHighSince.current = null
        setStressAlertVisible(false)
        setStressAlertDismissed(false)
      }
    }
  }, [serialMetrics.stress, isConnected, calibrationState, stressAlertDismissed])

  // Build the live metrics array from serial data, or fall back to static
  const liveMetrics = isConnected
    ? [
        { label: 'Focus Level',  value: Math.round(serialMetrics.focus),       unit: '%', description: baseline ? 'Normalized to your baseline' : 'Beta / (Alpha+Theta)',  icon: '🎯' },
        { label: 'Stress Index', value: Math.round(serialMetrics.stress),      unit: '%', description: baseline ? 'Normalized to your baseline' : 'Beta / Alpha ratio',     icon: '⚡' },
        { label: 'Relaxation',   value: Math.round(serialMetrics.relaxation),  unit: '%', description: baseline ? 'Normalized to your baseline' : 'Alpha / (Alpha+Beta)',   icon: '🌊' },
        { label: 'Cog. Fatigue', value: Math.round(serialMetrics.cogFatigue),  unit: '%', description: baseline ? 'Normalized to your baseline' : 'Theta / Alpha ratio',    icon: '🧠' },
      ]
    : DEFAULT_METRICS

  const analyzeState = async () => {
    const avgs = getSessionAverages()
    if (!avgs || sessionTime < 5) return

    setIsAnalyzing(true)
    setAnalysisResult(null)
    
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('OpenAI API key missing. Please add VITE_OPENAI_API_KEY to your .env.local file.')
      }

      const promptMsg = `Act as a mental health doctor and neuroscientist. I will provide 4 EEG metrics (Focus, Stress, Relaxation, Cognitive Fatigue) that represent the user's average brain state over their current session. Generate a 2-sentence summary and 1 short 'Doc's Tip'. Keep it under 60 words total and use a supportive, professional tone.\n\nAverage Metrics:\nFocus: ${Math.round(avgs.focus)}%\nStress: ${Math.round(avgs.stress)}%\nRelaxation: ${Math.round(avgs.relaxation)}%\nCognitive Fatigue: ${Math.round(avgs.cogFatigue)}%`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: promptMsg }],
          max_tokens: 150
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch analysis')
      }

      setAnalysisResult(data.choices[0].message.content)
    } catch (err) {
      console.error('AI Analysis failed:', err)
      setAnalysisResult("An error occurred while generating insights. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Handle connection start → wait for data, then show calibration modal
  const handleConnect = async () => {
    setDeviceError(null)
    clearConnectError()
    const connected = await connect()
    // connect() returns true only if the port actually opened.
    // If the user cancelled the picker or an error occurred, do nothing.
    if (!connected) return
    // Timer and session data collection will begin AFTER calibration finishes
    setCalibrationState('waiting_for_data')
  }

  // Show modal only once data is flowing; or time-out after 10s with a helpful error
  useEffect(() => {
    if (calibrationState !== 'waiting_for_data') return

    if (chartData.length > 0) {
      setCalibrationState('show_modal')
      return
    }

    // 10-second safety timeout — port opened but Arduino isn't sending data
    const timeout = setTimeout(() => {
      if (calibrationState === 'waiting_for_data') {
        setCalibrationState('idle')
        setDeviceError(
          'Device connected but no EEG data received. Make sure your Arduino sketch is running and sending data at 115200 baud.'
        )
      }
    }, 10_000)

    return () => clearTimeout(timeout)
  }, [calibrationState, chartData.length])

  // Handle intentional disconnect and auto-saving
  const handleDisconnect = async () => {
    clearInterval(window._recId)
    const sessionData = await disconnect()
    const hadBaseline = !!baseline  // capture before clearing
    setCalibrationState('idle')
    setBaseline(null)
    setDeviceError(null)
    clearConnectError()
    setStressAlertVisible(false)
    setStressAlertDismissed(false)
    stressHighSince.current = null
    
    // Only save sessions where calibration was completed — no point in
    // storing metrics that aren't normalized to the user's baseline.
    if (sessionData && user && hadBaseline) {
      try {
        const { error } = await supabase.from('sessions').insert({
          user_id: user.id,
          duration_seconds: sessionData.durationSeconds,
          focus_avg: sessionData.focusAvg,
          stress_avg: sessionData.stressAvg,
          relaxation_avg: sessionData.relaxationAvg,
          cog_fatigue_avg: sessionData.cogFatigueAvg
        })
        if (error) console.error('Failed to save session:', error)
      } catch (err) {
        console.error('Session save error:', err)
      }
    }
  }

  // Called by CalibrationModal when the timer finishes and user clicks "View Dashboard"
  const handleCalibrationComplete = () => {
    // startCalibration was already called when the user clicked "Start".
    // Calibration averages are now applied.
    
    // 1. Wipe the history array so the dashboard chart starts fresh
    clearChartData()
    
    // 2. Wipe the internal running averages in useSerial so the final
    //    saved session doesn't include the uncalibrated data from the last 30s.
    clearSessionData()

    // 3. Start the actual session timer
    setSessionTime(0)
    window._recId = setInterval(() => setSessionTime(t => t + 1), 1000)

    setCalibrationState('done')
  }

  // Called by CalibrationModal when user selects a duration and starts the timer.
  // We use the CalibrationModal's internal timer for the UX side,
  // and startCalibration() for the data side simultaneously.
  const handleCalibrationStart = (durationSecs) => {
    setCalibrationState('calibrating')
    startCalibration(durationSecs * 1000, (bl) => {
      if (bl) setBaseline(bl)
    })
  }

  // Skip calibration — metrics will use uncalibrated formulas
  const handleSkipCalibration = () => {
    setCalibrationState('done')
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`

  // Whether to show the live content (blocked until calibration done or skipped)
  const showContent = calibrationState === 'done' || calibrationState === 'idle'

  return (
    <div className="dashboard">
      <Navbar />

      {/* ── Calibration Modal ── */}
      {(calibrationState === 'show_modal' || calibrationState === 'calibrating') && (
        <CalibrationModal
          onStart={handleCalibrationStart}
          onComplete={handleCalibrationComplete}
          onCancel={handleSkipCalibration}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className="dashboard__sidebar">
        <div className="sidebar__brand">
          <RiBrainLine size={22} />
          <span>Dashboard</span>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map(n => (
            <button 
              key={n.id} 
              className={`sidebar__item ${activeTab === n.id ? 'sidebar__item--active' : ''}`}
              onClick={() => setActiveTab(n.id)}
            >
              {n.icon}
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <main className="dashboard__main">
        {/* Header */}
        <div className="dashboard__header">
          <div>
            <h1 className="dashboard__title">
              {activeTab === 'Sessions' ? 'Past Sessions' : 
               activeTab === 'Insights & Tips' ? 'Neural Insights' : 
               activeTab === 'Neural Reset' ? 'Mental Wellness' :
               activeTab === 'The Science Behind' ? 'Neuroscience 101' :
               'Neural Overview'}
            </h1>
            <p className="dashboard__sub">
              {activeTab === 'Sessions' ? 'Review your recorded neural data' : 
               activeTab === 'Insights & Tips' ? 'Personalized tips and analysis' : 
               activeTab === 'Neural Reset' ? 'Guided breathing and meditation' :
               activeTab === 'The Science Behind' ? 'Understand your brain and your metrics' :
               `Session · ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
            </p>
          </div>
          <div className="dashboard__controls">
            {activeTab === 'Overview' && (
              <>
                {/* Session status group: timer OR calibration warning */}
                {isConnected && (
                  <div className="dashboard__status-group">
                    {baseline ? (
                      <div className="dashboard__timer">
                        <span className="dashboard__timer-dot" />
                        {fmt(sessionTime)}
                      </div>
                    ) : (
                      <div className="dashboard__calib-badge uncalibrated">
                        ⚠ Uncalibrated
                      </div>
                    )}
                  </div>
                )}

                {/* Arduino connect / disconnect */}
                {isSupported && (
                  <button
                    className={`dashboard__connect-btn ${isConnected ? 'dashboard__connect-btn--connected' : ''}`}
                    onClick={isConnected ? handleDisconnect : handleConnect}
                  >
                    <RiUsbLine size={16} />
                    {isConnected ? 'Disconnect' : 'Connect Device'}
                    {isConnected && <span className="dashboard__connect-dot" />}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Error / Status Banners ── */}
        {!isSupported && (
          <div className="dashboard__banner dashboard__banner--error">
            <span>🚫</span>
            <span>Web Serial API is not supported in this browser. Please use <strong>Chrome</strong> or <strong>Edge</strong> (version 89+).</span>
          </div>
        )}

        {calibrationState === 'waiting_for_data' && !deviceError && (
          <div className="dashboard__banner dashboard__banner--info">
            <span className="dashboard__banner-spinner" />
            <span>Connected — waiting for EEG data from Arduino…</span>
          </div>
        )}

        {(connectError || deviceError) && (
          <div className="dashboard__banner dashboard__banner--error">
            <span>⚠️</span>
            <span>{connectError || deviceError}</span>
            <button
              className="dashboard__banner-dismiss"
              onClick={() => { clearConnectError(); setDeviceError(null) }}
            >✕</button>
          </div>
        )}

        {/* Stress alert — shown after 2 mins of elevated stress */}
        {stressAlertVisible && activeTab === 'Overview' && (
          <motion.div
            className="dashboard__banner dashboard__banner--warning"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
          >
            <span className="dashboard__banner-warning-icon">
              <svg width="15" height="15" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1L12 11.5H1L6.5 1Z" stroke="#f5a623" strokeWidth="1.4" strokeLinejoin="round" fill="rgba(245,166,35,0.15)" />
                <line x1="6.5" y1="4.5" x2="6.5" y2="8" stroke="#f5a623" strokeWidth="1.3" strokeLinecap="round" />
                <circle cx="6.5" cy="9.8" r="0.65" fill="#f5a623" />
              </svg>
            </span>
            <span>Your stress has been elevated for over 2 minutes. A short reset may help.</span>
            <button
              className="dashboard__banner-action"
              onClick={() => { setActiveTab('Neural Reset'); setStressAlertVisible(false); setStressAlertDismissed(true) }}
            >
              Try Neural Reset →
            </button>
            <button
              className="dashboard__banner-dismiss"
              onClick={() => { setStressAlertVisible(false); setStressAlertDismissed(true) }}
            >✕</button>
          </motion.div>
        )}

        {/* Main Workspace Area */}
        <div className="dashboard__workspace fade-enter">
          {activeTab === 'Overview' && (
            <>
              {/* Metrics row */}
              <motion.div
                className={`dashboard__metrics ${!showContent ? 'dashboard__metrics--dimmed' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {liveMetrics.map(m => (
                  <MetricCard key={m.label} {...m} />
                ))}
              </motion.div>
              {/* Charts row */}
              <div className="dashboard__charts">
                <motion.div
                  className="dashboard__chart-main"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  <EEGChart
                    live
                    externalData={chartData}
                    isConnected={isConnected}
                    analyzeSlot={
                      <button
                        className="dashboard__ai-btn"
                        onClick={analyzeState}
                        disabled={isAnalyzing || !isConnected || sessionTime < 5}
                        title={!isConnected ? 'Connect device first' : sessionTime < 5 ? 'Collecting baseline data...' : 'Analyze Session'}
                      >
                        {isAnalyzing ? '✨ Analyzing Neural State...' : '✨ Analyze Neural State'}
                      </button>
                    }
                  />
                </motion.div>
              </div>

              {/* AI insight result - shown below chart when analysis is complete */}
              {analysisResult && (
                  <motion.div 
                    className="dashboard__ai-insight"
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <div className="ai-insight-header">
                      <RiBrainLine size={14} />
                      Neural Analysis Report
                    </div>
                    <div className="ai-insight-content">
                      {analysisResult.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={i}>{part.slice(2, -2)}</strong>
                        }
                        return part
                      })}
                    </div>
                  </motion.div>
                )}
            </>
          )}

          {activeTab === 'Sessions' && (
            <SessionsView userId={user?.id} />
          )}

          {activeTab === 'Insights & Tips' && (
            <InsightsView user={user} />
          )}

          {activeTab === 'Neural Reset' && (
            <NeuralResetView 
              onCancel={() => setActiveTab('Overview')} 
              serialMetrics={serialMetrics}
              isConnected={isConnected}
              user={user}
              onNavigateToSessions={() => setActiveTab('Sessions')}
            />
          )}

          {activeTab === 'The Science Behind' && (
            <ScienceBehindView />
          )}
        </div>
      </main>
    </div>
  )
}