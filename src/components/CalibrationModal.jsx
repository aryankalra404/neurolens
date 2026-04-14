import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RiCheckLine, RiBrainLine } from 'react-icons/ri'
import './CalibrationModal.css'

const DURATION_DEFAULT = 30

/**
 * CalibrationModal
 * Props:
 *   onStart(durationSecs) — called when user starts calibration (for data collection)
 *   onComplete()          — called when user clicks "View Dashboard" after timer ends
 *   onCancel()            — called if user skips
 */
export default function CalibrationModal({ onStart, onComplete, onCancel }) {
  const [step, setStep] = useState('ready')       // 'ready' | 'calibrating' | 'done'
  const [secondsLeft, setSecondsLeft] = useState(0)
  const timerRef = useRef(null)
  
  // Audio Refs
  const calibAudioRef = useRef(null)
  const endAudioRef = useRef(null)

  // Initialize audio objects once
  useEffect(() => {
    calibAudioRef.current = new Audio('/sounds/calibrationSound.mp3')
    calibAudioRef.current.loop = true
    
    endAudioRef.current = new Audio('/sounds/EndedSound.mp3')
    
    return () => {
      if (calibAudioRef.current) {
        calibAudioRef.current.pause()
        calibAudioRef.current.currentTime = 0
      }
    }
  }, [])

  /* Start calibration: countdown + collect samples */
  const handleStart = () => {
    setSecondsLeft(DURATION_DEFAULT)
    setStep('calibrating')
    // Start calibration sound
    if (calibAudioRef.current) {
      calibAudioRef.current.currentTime = 0
      calibAudioRef.current.play().catch(e => console.error("Audio play failed:", e))
    }
    // Notify parent so it can start data collection in parallel
    if (onStart) onStart(DURATION_DEFAULT)
  }

  /* Countdown tick */
  useEffect(() => {
    if (step !== 'calibrating') return

    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setStep('done')
          // Stop calibration sound, play success sound
          if (calibAudioRef.current) calibAudioRef.current.pause()
          if (endAudioRef.current) {
            endAudioRef.current.currentTime = 0
            endAudioRef.current.play().catch(e => console.error("Audio play failed:", e))
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [step])

  /* Pulse ring progress (0-1) */
  const progress = step === 'calibrating' ? 1 - secondsLeft / DURATION_DEFAULT : 0

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="calib-overlay">
      <motion.div
        className="calib-card"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* ── Ready Step ── */}
        <AnimatePresence mode="wait">
          {step === 'ready' && (
            <motion.div
              key="ready"
              className="calib-step"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <div className="calib-icon-wrap">
                <RiBrainLine size={32} className="calib-icon" />
              </div>
              <h2 className="calib-title">Calibration Phase</h2>
              <p className="calib-desc">
                Before we can measure your mental state, we need to establish your
                personal <strong>baseline</strong> — your brain's resting "zero point".
              </p>
              <p className="calib-desc" style={{ marginBottom: '24px' }}>
                When you're ready, click Start. 
                Then close your eyes, breathe slowly, and relax for <strong>30 seconds</strong> until the bell chimes.
              </p>

              <button className="calib-start-btn" onClick={handleStart}>
                Start Calibration
              </button>

              {onCancel && (
                <button className="calib-skip-btn" onClick={() => {
                  if (calibAudioRef.current) calibAudioRef.current.pause()
                  onCancel()
                }}>
                  Skip for now
                </button>
              )}
            </motion.div>
          )}

          {/* ── Calibrating Step ── */}
          {step === 'calibrating' && (
            <motion.div
              key="calibrating"
              className="calib-step"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {/* Animated rings */}
              <div className="calib-pulse-wrap">
                <div className="calib-pulse calib-pulse--3" />
                <div className="calib-pulse calib-pulse--2" />
                <div className="calib-pulse calib-pulse--1" />

                {/* SVG progress ring */}
                <svg className="calib-ring" viewBox="0 0 100 100">
                  <circle
                    className="calib-ring__track"
                    cx="50" cy="50" r="40"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    className="calib-ring__fill"
                    cx="50" cy="50" r="40"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress)}`}
                    strokeLinecap="round"
                  />
                </svg>

                <div className="calib-countdown">{fmt(secondsLeft)}</div>
              </div>

              <h2 className="calib-title">Calibrating…</h2>
              <p className="calib-instruction">
                🧘 Close your eyes, breathe slowly, and relax.
                <br />
                Stay still until the timer finishes.
              </p>
            </motion.div>
          )}

          {/* ── Done Step ── */}
          {step === 'done' && (
            <motion.div
              key="done"
              className="calib-step"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <div className="calib-icon-wrap calib-icon-wrap--success">
                <RiCheckLine size={32} className="calib-icon" />
              </div>
              <h2 className="calib-title">Baseline Established!</h2>
              <p className="calib-desc">
                Your personal EEG baseline has been recorded. All metrics will now
                be calibrated to your unique neural resting state for accurate readings.
              </p>
              <button className="calib-start-btn" onClick={() => onComplete()}>
                View Dashboard →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
