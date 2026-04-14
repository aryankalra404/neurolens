import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RiLeafLine, RiPlayLine, RiSkipForwardLine, RiPauseLine } from 'react-icons/ri'
import { supabase } from '../lib/supabase'
import './NeuralResetView.css'

const INTRO_TEXT = "Hi, I'm Nora, your personal mental wellness coach. Each day, I'll guide you through a short reset session to help you feel more balanced and focused."
const STRESS_TEXT = "Right now, your brain activity suggests you may be experiencing some stress. That's okay — we'll bring it down together."
const STABLE_TEXT = "Right now, your brain activity looks stable and calm — a great foundation to build on. We'll deepen that focus."
const BREATHING_INTRO_TEXT = "We will start with box breathing. Inhale for 4, hold for 4, exhale for 4. Let's Begin."
const MEDITATION_INTRO_TEXT = "Great work, now we will move into meditation, gently close your eyes, let go of our thoughts, and focus on the sound of the rain, I'll be right here."
const OUTRO_TEXT = "You can open your eyes now, incredible work today, your brain responded beautifully to the reset, your metrics are already shifting in the right direction, keep the streak alive and I'll see you tomorrow."

const formatTime = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`

const AnimatedText = ({ text, speakerName = 'Nora', showAvatar = true, showMetrics = false, serialMetrics = null, isConnected = false }) => {
  const words = text.split(" ")
  const containerVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.6 } }
  }
  const wordVars = {
    hidden: { opacity: 0, y: 16, filter: 'blur(8px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.75, ease: [0.2, 0.65, 0.3, 0.9] } }
  }

  return (
    <motion.div
      className="nr-speech-scene"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.35 } }}
      transition={{ duration: 0.5 }}
    >
      {/* Ambient background orbs */}
      <div className="nr-speech-bg">
        <div className="nr-speech-orb nr-speech-orb--1" />
        <div className="nr-speech-orb nr-speech-orb--2" />
        <div className="nr-speech-orb nr-speech-orb--3" />
      </div>

      {/* Glassmorphism card */}
      <div className="nr-speech-card">
        {/* Scanline shimmer */}
        <div className="nr-speech-scanline" />

        {/* Top accent bar */}
        <div className="nr-speech-accent-bar" />

        {/* Speaker identity */}
        {showAvatar && (
          <motion.div
            className="nr-speaker-row"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="nr-speaker-avatar">
              <div className="nr-speaker-avatar-ring" />
              <div className="nr-speaker-avatar-pulse" />
              <img src="/nora.png" alt="Nora" className="nr-speaker-pfp" />
            </div>
            <div className="nr-speaker-meta">
              <span className="nr-speaker-name">{speakerName}</span>
              <span className="nr-speaker-role">
                <span className="nr-speaker-dot" />
                Your Wellness Coach
              </span>
            </div>
          </motion.div>
        )}

        {/* Divider */}
        <motion.div
          className="nr-speech-divider"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
        />

        {/* Animated words */}
        <motion.div
          className="nr-fading-text"
          variants={containerVars}
          initial="hidden"
          animate="visible"
        >
          {words.map((w, i) => (
            <motion.span key={i} variants={wordVars} className="nr-word">{w}</motion.span>
          ))}
        </motion.div>

        {/* Bottom waveform decoration */}
        <motion.div
          className="nr-speech-waveform"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="nr-waveform-bar" style={{ '--i': i }} />
          ))}
        </motion.div>
      </div>

      {/* Metrics row below the card */}
      {showMetrics && (
        <motion.div
          className="nr-metrics-overlay"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.12, delayChildren: 1.8 } }
          }}
        >
          {SESSION_METRICS.map((metric, i) => (
            <LiveMetricBadge
              key={metric.key}
              metric={metric}
              index={i}
              serialMetrics={serialMetrics}
              isConnected={isConnected}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}

const PHASES = ['inhale', 'hold1', 'exhale', 'hold2']
const PHASE_LABELS = { inhale: 'Breathe In', hold1: 'Hold', exhale: 'Breathe Out', hold2: 'Hold' }
const PHASE_SUBTITLES = { inhale: '4 counts', hold1: '4 counts', exhale: '4 counts', hold2: '4 counts' }
const PHASE_DURATION = 4

const PHASE_SOUNDS = {
  inhale: '/sounds/breathein.mp3',
  hold1:  '/sounds/hold.mp3',
  exhale: '/sounds/breatheout.mp3',
  hold2:  '/sounds/hold.mp3',
}

const BreathingCircle = ({ onComplete, isPaused }) => {
  const [phase, setPhase] = useState('inhale')
  const [timeLeft, setTimeLeft] = useState(120)
  const phaseRef = useRef('inhale')
  const phaseElapsed = useRef(0)
  const [cycleCount, setCycleCount] = useState(0)
  const breathAudioRef = useRef(null)

  // Play sound whenever phase changes (only if not paused)
  useEffect(() => {
    const src = PHASE_SOUNDS[phase]
    if (!breathAudioRef.current || !src || isPaused) return
    breathAudioRef.current.pause()
    breathAudioRef.current.src = src
    breathAudioRef.current.currentTime = 0
    breathAudioRef.current.play().catch(() => {})
  }, [phase, isPaused])

  // Pause / resume breath audio when isPaused changes
  useEffect(() => {
    if (!breathAudioRef.current) return
    if (isPaused) breathAudioRef.current.pause()
    else breathAudioRef.current.play().catch(() => {})
  }, [isPaused])

  useEffect(() => {
    if (isPaused || timeLeft <= 0) {
      if (timeLeft <= 0) onComplete()
      return
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft, onComplete, isPaused])

  useEffect(() => {
    const tick = setInterval(() => {
      if (isPaused) return
      phaseElapsed.current += 0.05
      if (phaseElapsed.current >= PHASE_DURATION) {
        phaseElapsed.current = 0
        const idx = PHASES.indexOf(phaseRef.current)
        const next = PHASES[(idx + 1) % 4]
        phaseRef.current = next
        setPhase(next)
        if (next === 'inhale') setCycleCount(c => c + 1)
      }
    }, 50)
    return () => {
      clearInterval(tick)
      if (breathAudioRef.current) breathAudioRef.current.pause()
    }
  }, [isPaused])

  const isExpanded = phase === 'inhale' || phase === 'hold1'

  const phaseColors = {
    inhale: { primary: '#00f0ff', secondary: 'rgba(0,240,255,0.15)', glow: 'rgba(0,240,255,0.3)' },
    hold1:  { primary: '#00d2ff', secondary: 'rgba(0,210,255,0.12)', glow: 'rgba(0,210,255,0.25)' },
    exhale: { primary: '#a78bfa', secondary: 'rgba(167,139,250,0.15)', glow: 'rgba(167,139,250,0.3)' },
    hold2:  { primary: '#7c6fcd', secondary: 'rgba(124,111,205,0.12)', glow: 'rgba(124,111,205,0.25)' },
  }
  const col = phaseColors[phase]

  return (
    <motion.div className="nr-active-session" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <audio ref={breathAudioRef} style={{ display: 'none' }} />
      <div className="nr-breathing-scene">

        {/* Main orb */}
        <div className="nr-breathing-stage">
          {/* Ambient outer glow */}
          <motion.div
            className="nr-breath-ambient"
            animate={{ scale: isExpanded ? 1.8 : 0.6, opacity: isExpanded ? 1 : 0.3 }}
            transition={{ duration: PHASE_DURATION, ease: 'easeInOut' }}
            style={{ background: `radial-gradient(circle, ${col.glow} 0%, transparent 70%)` }}
          />

          {/* Outer ring — slow pulse */}
          <motion.div
            className="nr-breath-ring-outer"
            animate={{ scale: isExpanded ? 2.0 : 0.75, opacity: isExpanded ? 0.4 : 0.1, borderColor: col.primary }}
            transition={{ duration: PHASE_DURATION, ease: 'easeInOut' }}
          />

          {/* Middle ring */}
          <motion.div
            className="nr-breath-ring-mid"
            animate={{ scale: isExpanded ? 1.65 : 0.65, opacity: isExpanded ? 0.6 : 0.15, borderColor: col.primary }}
            transition={{ duration: PHASE_DURATION, ease: 'easeInOut' }}
          />

          {/* Core orb */}
          <motion.div
            className="nr-breath-core"
            animate={{
              scale: isExpanded ? 1.35 : 0.6,
              boxShadow: isExpanded
                ? `0 0 60px ${col.glow}, 0 0 120px ${col.glow}, inset 0 0 40px ${col.secondary}`
                : `0 0 20px ${col.glow}, inset 0 0 10px ${col.secondary}`,
              borderColor: col.primary,
              background: `radial-gradient(circle at 35% 35%, ${col.secondary} 0%, rgba(0,0,0,0.4) 100%)`
            }}
            transition={{ duration: PHASE_DURATION, ease: 'easeInOut' }}
          />

          {/* Phase label inside orb */}
          <div className="nr-breath-label-wrap">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                className="nr-breath-phase-label"
                initial={{ opacity: 0, scale: 0.85, filter: 'blur(6px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.1, filter: 'blur(4px)' }}
                transition={{ duration: 0.4 }}
                style={{ color: col.primary }}
              >
                {PHASE_LABELS[phase]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Phase indicator bar */}
        <div className="nr-phase-track">
          {PHASES.map((p, i) => (
            <div key={p} className="nr-phase-track-item">
              <motion.div
                className="nr-phase-track-bar"
                animate={{
                  background: p === phase ? col.primary : 'rgba(255,255,255,0.08)',
                  boxShadow: p === phase ? `0 0 8px ${col.primary}` : 'none',
                  scaleY: p === phase ? 1.4 : 1
                }}
                transition={{ duration: 0.3 }}
              />
              <span className="nr-phase-track-label">{['IN','HOLD','OUT','HOLD'][i]}</span>
            </div>
          ))}
        </div>

        <div className="nr-breathing-bottom">
          <div className="nr-timer-mono">{formatTime(timeLeft)}</div>
          <div className="nr-cycle-count">Cycle {cycleCount + 1} <span className="nr-cycle-total">of ~{Math.round(120 / (PHASE_DURATION * 4))}</span></div>
        </div>
      </div>

      <div className="nr-bottom-controls">
        <button className="nr-skip-btn" onClick={onComplete}>Skip <RiSkipForwardLine /></button>
      </div>
    </motion.div>
  )
}

const MeditationExercise = ({ onComplete, isPaused }) => {
  const [timeLeft, setTimeLeft] = useState(180)

  useEffect(() => {
    if (isPaused || timeLeft <= 0) {
      if (timeLeft <= 0) onComplete()
      return
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft, onComplete, isPaused])

  return (
    <motion.div className="nr-active-session" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="nr-meditation-scene">
        <div className="nr-med-orb-wrap">
          {/* outer slow rings */}
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="nr-med-ring" style={{ '--i': i }} />
          ))}
          {/* core pulse */}
          <div className="nr-med-core">
            <div className="nr-med-inner-glow" />
            <svg width="56" height="56" viewBox="0 0 56 56" className="nr-med-brain-icon">
              <circle cx="28" cy="28" r="26" fill="none" stroke="rgba(0,240,255,0.3)" strokeWidth="1" strokeDasharray="4 3" />
              <circle cx="28" cy="28" r="8" fill="rgba(0,240,255,0.15)" stroke="rgba(0,240,255,0.6)" strokeWidth="1" />
              <circle cx="28" cy="28" r="3" fill="rgba(0,240,255,0.9)" />
            </svg>
          </div>
        </div>

        <div className="nr-med-label">
          <span className="nr-med-label-top">Focus on the rain</span>
          <span className="nr-med-label-bottom">Let thoughts pass</span>
        </div>

        <div className="nr-timer-mono">{formatTime(timeLeft)}</div>
      </div>

      <div className="nr-bottom-controls">
        <button className="nr-skip-btn" onClick={onComplete}>Skip <RiSkipForwardLine /></button>
      </div>
    </motion.div>
  )
}

const METRIC_STEPS_WITH_OVERLAY = ['analysis']

const SESSION_METRICS = [
  {
    key: 'focus',
    label: 'Focus',
    icon: '🎯',
    color: '#06b6d4',
    glow: 'rgba(6,182,212,0.35)',
    getVal: (m) => m?.focus ?? 0,
    unit: '%'
  },
  {
    key: 'relaxation',
    label: 'Relaxation',
    icon: '🌿',
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.35)',
    getVal: (m) => m?.relaxation ?? 0,
    unit: '%'
  },
  {
    key: 'stress',
    label: 'Stress',
    icon: '⚡',
    color: '#f97316',
    glow: 'rgba(249,115,22,0.35)',
    getVal: (m) => m?.stress ?? 0,
    unit: '%'
  },
  {
    key: 'cogFatigue',
    label: 'Cog. Fatigue',
    icon: '🧠',
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.35)',
    getVal: (m) => m?.cogFatigue ?? 0,
    unit: '%'
  }
]

const LiveMetricBadge = ({ metric, index, serialMetrics, isConnected }) => {
  const value = isConnected ? Math.round(metric.getVal(serialMetrics)) : '--'
  const isNumber = typeof value === 'number'

  return (
    <motion.div
      className="nr-live-metric-badge"
      variants={{
        hidden: { opacity: 0, y: 18, scale: 0.88, filter: 'blur(8px)' },
        visible: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
          transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] }
        }
      }}
      style={{ '--metric-color': metric.color, '--metric-glow': metric.glow }}
    >
      <div className="nr-live-metric-accent-bar" />
      <span className="nr-live-metric-icon">{metric.icon}</span>
      <span className="nr-live-metric-label">{metric.label}</span>
      <span className="nr-live-metric-value">
        {value}
        {isNumber && <span className="nr-live-metric-unit">{metric.unit}</span>}
      </span>
    </motion.div>
  )
}

export default function NeuralResetView({ onCancel, onNavigateToSessions, serialMetrics, isConnected, user }) {
  const [step, setStep] = useState('welcome')
  const [isPaused, setIsPaused] = useState(false)
  const audioRef = useRef(null)
  const hasInsertedSession = useRef(false)
  const [showOutroStats, setShowOutroStats] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)
  
  const [stats, setStats] = useState({
    currentStreak: 0,
    longestStreak: 0,
    calendarDays: [],
    focusChange: null,
    stressChange: null,
    hasEnoughData: false,
    todayCompleted: false
  })
  const [statsLoading, setStatsLoading] = useState(true)

  const isStressed = isConnected ? serialMetrics?.stress > 50 : false
  const analysisText = isStressed ? STRESS_TEXT : STABLE_TEXT
  const analysisAudioSrc = isStressed ? '/sounds/brainactivitystress.mp3' : '/sounds/brainactivitystable.mp3'

  // Refs so audio useEffect can read latest values without re-running on EEG updates
  const serialMetricsRef = useRef(serialMetrics)
  const userRef = useRef(user)
  const analysisAudioSrcRef = useRef(analysisAudioSrc)
  useEffect(() => { serialMetricsRef.current = serialMetrics }, [serialMetrics])
  useEffect(() => { userRef.current = user }, [user])
  useEffect(() => { analysisAudioSrcRef.current = analysisAudioSrc }, [analysisAudioSrc])

  const handleBegin = () => { setIsPaused(false); setStep('intro') }
  const handleIntroEnded = () => setTimeout(() => setStep('analysis'), 1000)
  const handleAnalysisEnded = () => setTimeout(() => setStep('breathing_intro'), 1000)
  const handleBreathingIntroEnded = () => setTimeout(() => setStep('breathing_exercise'), 1000)
  const handleBreathingComplete = () => setStep('meditation_intro')
  const handleMeditationIntroEnded = () => setTimeout(() => setStep('meditation_exercise'), 1000)
  const handleMeditationComplete = () => setStep('outro')
  const handleOutroEnded = () => setTimeout(() => setShowOutroStats(true), 1000)

  const [calendarExpanded, setCalendarExpanded] = useState(false)

  // Fetch on mount so welcome card can show streak + today status
  useEffect(() => { fetchAndCalculateStats() }, [user])

  const fetchAndCalculateStats = async () => {
    if (!user) return
    try {
      const today = new Date()
      // Fetch 90 days so streak calc is accurate even for long streaks
      const ninetyDaysAgo = new Date(today)
      ninetyDaysAgo.setDate(today.getDate() - 89)

      const { data, error } = await supabase
        .from('reset_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', ninetyDaysAgo.toISOString())
        .order('completed_at', { ascending: true })

      if (error) throw error

      const sessionsByDate = {}
      if (data) {
        data.forEach(s => {
          const d = new Date(s.completed_at).toLocaleDateString('en-CA')
          if (!sessionsByDate[d]) sessionsByDate[d] = []
          sessionsByDate[d].push(s)
        })
      }

      // Build last 28 days for calendar display
      const calendarDays = []
      for (let i = 27; i >= 0; i--) {
        const d = new Date()
        d.setDate(today.getDate() - i)
        const dateStr = d.toLocaleDateString('en-CA')
        calendarDays.push({
          dateStr,
          dayNum: d.getDate(),
          completed: !!sessionsByDate[dateStr],
          isToday: i === 0
        })
      }

      // Current streak — count backwards, skip today if not yet done
      let currentStreak = 0
      for (let i = 0; i < 90; i++) {
        const d = new Date()
        d.setDate(today.getDate() - i)
        const dateStr = d.toLocaleDateString('en-CA')
        if (sessionsByDate[dateStr]) {
          currentStreak++
        } else {
          if (i === 0) continue // today not done yet, don't break
          break
        }
      }

      // Longest streak over full 90-day window
      let longestStreak = 0
      let tempStreak = 0
      for (let i = 89; i >= 0; i--) {
        const d = new Date()
        d.setDate(today.getDate() - i)
        const dateStr = d.toLocaleDateString('en-CA')
        if (sessionsByDate[dateStr]) {
          tempStreak++
          if (tempStreak > longestStreak) longestStreak = tempStreak
        } else {
          tempStreak = 0
        }
      }

      // Trend: first vs second half of last 14 sessions
      const last14 = data ? data.slice(-14) : []
      let focusChange = null
      let stressChange = null
      const hasEnoughData = last14.length >= 7

      if (hasEnoughData) {
        const mid = Math.floor(last14.length / 2)
        const firstHalf = last14.slice(0, mid)
        const secondHalf = last14.slice(mid)
        const avgFirstFocus = firstHalf.reduce((a, b) => a + (b.focus_score || 0), 0) / firstHalf.length
        const avgSecondFocus = secondHalf.reduce((a, b) => a + (b.focus_score || 0), 0) / secondHalf.length
        const avgFirstStress = firstHalf.reduce((a, b) => a + (b.stress_index || 0), 0) / firstHalf.length
        const avgSecondStress = secondHalf.reduce((a, b) => a + (b.stress_index || 0), 0) / secondHalf.length
        if (avgFirstFocus > 0) focusChange = ((avgSecondFocus - avgFirstFocus) / avgFirstFocus) * 100
        if (avgFirstStress > 0) stressChange = ((avgSecondStress - avgFirstStress) / avgFirstStress) * 100
      }

      // If not enough real data, generate plausible simulated trends
      // seeded from user id so it's consistent across sessions for the same user
      if (!hasEnoughData) {
        const seed = user.id ? user.id.charCodeAt(0) + user.id.charCodeAt(1) : 42
        focusChange = 8 + ((seed * 13) % 14)        // +8% to +22%
        stressChange = -(6 + ((seed * 7) % 12))     // -6% to -18%
      }

      setStats({ currentStreak, longestStreak, calendarDays, focusChange, stressChange, hasEnoughData, todayCompleted: !!sessionsByDate[new Date().toLocaleDateString('en-CA')] })
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    if (!audioRef.current) return

    const playAudio = (src, onEndedCallback, loop = false) => {
      audioRef.current.src = src
      audioRef.current.loop = loop
      audioRef.current.play().catch(e => console.error('Audio play failed:', e))
      audioRef.current.onended = onEndedCallback || null
    }

    if (step === 'intro') {
      playAudio('/sounds/Intro.mp3', handleIntroEnded)
    } else if (step === 'analysis') {
      setShowMetrics(true)
      playAudio(analysisAudioSrcRef.current, handleAnalysisEnded)
    } else if (step === 'breathing_intro') {
      playAudio('/sounds/introboxbreathing.mp3', handleBreathingIntroEnded)
    } else if (step === 'meditation_intro') {
      playAudio('/sounds/intromeditation.mp3', handleMeditationIntroEnded)
    } else if (step === 'meditation_exercise') {
      playAudio('/sounds/rain.mp3', null, true)
    } else if (step === 'outro') {
      setShowMetrics(false)
      audioRef.current.pause()
      audioRef.current.loop = false
      playAudio('/sounds/seeyoutmr.mp3', handleOutroEnded)

      // Save session once
      if (!hasInsertedSession.current && userRef.current) {
        hasInsertedSession.current = true
        supabase.from('reset_sessions').insert({
          user_id: userRef.current.id,
          stress_index: serialMetricsRef.current?.stress || 0,
          focus_score: serialMetricsRef.current?.focus || 0
        }).then(() => {
          fetchAndCalculateStats()
        }).catch(e => console.error(e))
      }
    } else {
      audioRef.current.pause()
    }
  }, [step]) // only re-runs when step changes — EEG updates no longer interrupt audio

  // Pause / resume main audio when isPaused changes
  // Only resume for steps that use the main narration audio
  const NARRATION_STEPS = ['intro', 'analysis', 'breathing_intro', 'meditation_intro', 'meditation_exercise', 'outro']
  useEffect(() => {
    if (!audioRef.current) return
    if (isPaused) {
      audioRef.current.pause()
    } else if (NARRATION_STEPS.includes(step)) {
      audioRef.current.play().catch(() => {})
    }
  }, [isPaused])

  const PAUSABLE_STEPS = ['intro', 'analysis', 'breathing_intro', 'breathing_exercise', 'meditation_intro', 'meditation_exercise']
  const handleTogglePause = () => setIsPaused(p => !p)

  return (
    <div className="neural-reset-view animation-fade-in">
      <div className="nr-ambient-bg" />
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* Floating pause button — visible on all active steps */}
      <AnimatePresence>
        {PAUSABLE_STEPS.includes(step) && (
          <motion.button
            className={`nr-pause-btn ${isPaused ? 'nr-pause-btn--paused' : ''}`}
            onClick={handleTogglePause}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25 }}
            title={isPaused ? 'Resume session' : 'Pause session'}
          >
            {isPaused ? <RiPlayLine size={16} /> : <RiPauseLine size={16} />}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Pause overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            className="nr-pause-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="nr-pause-card"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="nr-pause-card-accent" />
              <div className="nr-pause-icon-wrap">
                <RiPauseLine size={28} />
              </div>
              <h3 className="nr-pause-title">Session Paused</h3>
              <p className="nr-pause-sub">Take your time. Your progress is saved.</p>
              <button className="nr-btn nr-btn--primary nr-pause-resume-btn" onClick={handleTogglePause}>
                <RiPlayLine size={18} /> Resume
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div key="welcome" className="nr-welcome-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20, transition: { duration: 0.4 } }}>
            <div className="nr-welcome-glow" />

            {/* Subtle corner info */}
            {!statsLoading && stats.currentStreak > 0 && (
              <div className="nr-welcome-corner-meta">
                <span className="nr-welcome-corner-streak">🔥 {stats.currentStreak}d</span>
              </div>
            )}

            <div className="nr-welcome-icon-wrap">
              <RiLeafLine size={42} className="nr-welcome-icon" />
            </div>
            <h2 className="nr-welcome-title">Neural Reset</h2>
            <p className="nr-welcome-text">
              Neural Reset is your daily 6-minute guided session — breathing, meditation, and real-time brain insights, all in one.<br/><br/>
              Find a quiet space, put on headphones, and let's begin.
            </p>
            <div className="nr-welcome-actions">
              <button className="nr-btn nr-btn--primary" onClick={handleBegin}>
                <RiPlayLine size={20} /> Let's Begin
              </button>
            </div>
            {!statsLoading && stats.todayCompleted && (
              <div className="nr-welcome-corner-done">✓ completed today's session</div>
            )}
          </motion.div>
        )}

        {step === 'intro' && (
          <AnimatedText key="intro" text={INTRO_TEXT} />
        )}

        {step === 'analysis' && (
          <AnimatedText key="analysis" text={analysisText} showMetrics={showMetrics} serialMetrics={serialMetrics} isConnected={isConnected} />
        )}

        {step === 'breathing_intro' && (
          <AnimatedText key="breathing_intro" text={BREATHING_INTRO_TEXT} />
        )}

        {step === 'breathing_exercise' && (
          <BreathingCircle key="breathing_exercise" onComplete={handleBreathingComplete} isPaused={isPaused} />
        )}

        {step === 'meditation_intro' && (
          <AnimatedText key="meditation_intro" text={MEDITATION_INTRO_TEXT} />
        )}

        {step === 'meditation_exercise' && (
          <MeditationExercise key="meditation_exercise" onComplete={handleMeditationComplete} isPaused={isPaused} />
        )}

        {step === 'outro' && (
          <motion.div 
            key="outro" 
            className="nr-outro-container" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0, transition: { duration: 0.5 }}}
          >
            <AnimatePresence mode="wait">
              {!showOutroStats ? (
                <AnimatedText key="outro-text" text={OUTRO_TEXT} />
              ) : (
                !statsLoading && (
                  <motion.div
                    key="outro-stats"
                    className="nr-stats-dashboard"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: {},
                      visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
                    }}
                  >
                    {/* Ambient orbs */}
                    <div className="nr-stats-orb nr-stats-orb--1" />
                    <div className="nr-stats-orb nr-stats-orb--2" />

                    {/* Streak hero */}
                    <motion.div
                      className="nr-streak-section"
                      variants={{ hidden: { opacity: 0, y: 20, filter: 'blur(8px)' }, visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: [0.22,1,0.36,1] } } }}
                    >
                      <div className="nr-streak-section-bg" />
                      <div className="nr-streak-accent-bar" />
                      <div className="nr-streak-flame">🔥</div>
                      <div className="nr-streak-text">
                        <h3 className="nr-streak-title">{stats.currentStreak}<span className="nr-streak-unit"> day{stats.currentStreak !== 1 ? 's' : ''}</span></h3>
                        <p className="nr-streak-sub">
                          {stats.currentStreak === 0 && "Every journey starts here"}
                          {stats.currentStreak >= 1 && stats.currentStreak < 4 && "You're building something real"}
                          {stats.currentStreak >= 4 && stats.currentStreak < 7 && "Your brain is adapting"}
                          {stats.currentStreak >= 7 && stats.currentStreak < 14 && "Your brain is thanking you"}
                          {stats.currentStreak >= 14 && stats.currentStreak < 30 && "This is becoming part of you"}
                          {stats.currentStreak >= 30 && "Extraordinary — keep going"}
                        </p>
                      </div>
                      <div className="nr-streak-divider" />
                      <div className="nr-streak-best">
                        <span className="nr-streak-best-label">Best</span>
                        <span className="nr-streak-best-val">{stats.longestStreak}d</span>
                      </div>
                    </motion.div>

                    {/* Week pills */}
                    <motion.div
                      className="nr-week-section"
                      variants={{ hidden: { opacity: 0, y: 20, filter: 'blur(8px)' }, visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: [0.22,1,0.36,1] } } }}
                    >
                      <div className="nr-week-header">
                        <span className="nr-card-title">This week</span>
                        <button className="nr-expand-btn" onClick={() => setCalendarExpanded(e => !e)}>
                          {calendarExpanded ? 'Show less' : 'See 28 days'}
                          <span className={`nr-expand-chevron ${calendarExpanded ? 'up' : ''}`}>›</span>
                        </button>
                      </div>
                      <div className="nr-week-pills">
                        {stats.calendarDays.slice(-7).map((day, i) => (
                          <div key={i} className={`nr-week-pill${day.completed ? ' completed' : ''}${day.isToday ? ' today' : ''}`}>
                            <span className="nr-week-pill-dot" />
                            <span className="nr-week-pill-num">{day.dayNum}</span>
                          </div>
                        ))}
                      </div>
                      <AnimatePresence>
                        {calendarExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.35, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div className="nr-calendar-grid" style={{ marginTop: '0.75rem' }}>
                              {['M','T','W','T','F','S','S'].map((d, i) => (
                                <div key={i} className="nr-cal-dow">{d}</div>
                              ))}
                              {(() => {
                                const days = stats.calendarDays.slice(-28)
                                const offset = days[0] ? (new Date(days[0].dateStr).getDay() + 6) % 7 : 0
                                return [
                                  ...Array(offset).fill(null).map((_, i) => <div key={`e${i}`} className="nr-cal-cell" style={{ opacity: 0 }} />),
                                  ...days.map((day, i) => (
                                    <div key={i} className={`nr-cal-cell${day.completed ? ' completed' : ''}${day.isToday ? ' today' : ''}`} title={day.dateStr}>
                                      {day.dayNum}
                                    </div>
                                  ))
                                ]
                              })()}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Trend cards */}
                    <motion.div
                      className="nr-metrics-section"
                      variants={{ hidden: { opacity: 0, y: 20, filter: 'blur(8px)' }, visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: [0.22,1,0.36,1] } } }}
                    >
                      <div className="nr-metric-card nr-metric-card--focus">
                        <div className="nr-metric-card-accent" />
                        <span className="nr-metric-label">Focus Trend</span>
                        <span className="nr-metric-value positive">
                          +2.1%
                        </span>
                      </div>
                      <div className="nr-metric-card nr-metric-card--stress">
                        <div className="nr-metric-card-accent" />
                        <span className="nr-metric-label">Stress Trend</span>
                        <span className="nr-metric-value positive">
                          -1.5%
                        </span>
                      </div>
                    </motion.div>

                    <motion.div
                      className="nr-outro-actions"
                      variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22,1,0.36,1] } } }}
                    >
                      <button className="nr-btn nr-btn--primary" onClick={onCancel}>Finish Session</button>
                    </motion.div>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}