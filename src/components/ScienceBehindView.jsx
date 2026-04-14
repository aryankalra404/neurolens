import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RiBrainLine, RiFlashlightLine, RiPulseLine,
  RiFilter3Line, RiFocus2Line, RiSettings3Line,
  RiArrowRightLine, RiArrowLeftLine
} from 'react-icons/ri'
import './ScienceBehindView.css'

const PAGES = [
  {
    id: 'neuroscience',
    icon: <RiBrainLine size={20} />,
    label: 'Intro',
    title: 'Introduction to Neuroscience',
    subtitle: 'Your brain is the most powerful machine ever built.',
    content: (
      <div className="sb-layout">
        <div className="sb-text">
          <p>
            Think of your brain as a <strong>supercomputer</strong>. It controls everything you do, feel, and think. Neuroscientists study this supercomputer to understand how it works, how it learns, and how to keep it healthy.
          </p>
          <p>
            Your brain sends tiny electrical signals all the time, firing back and forth between billions of <strong>neurons</strong> (brain cells). Whether you're solving a math problem, chilling out, or watching a movie — your brain is always creating a symphony of activity!
          </p>
          <div className="sb-fact-pill">
            💡 The human brain has ~86 billion neurons and 100 trillion connections.
          </div>
        </div>
        <div className="sb-visual">
          <video autoPlay muted playsInline className="sb-media sb-media--neuro">
            <source src="/neuro.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    )
  },
  {
    id: 'eeg',
    icon: <RiFlashlightLine size={20} />,
    label: 'EEG',
    title: 'What is EEG?',
    subtitle: 'A window into the living brain.',
    content: (
      <div className="sb-layout">
        <div className="sb-text">
          <p>
            <strong>EEG</strong> stands for <strong>Electroencephalography</strong>. Big word — simple idea! An EEG device acts like a stethoscope for your brain. Instead of listening to your heartbeat, it listens to the tiny electrical signals your brain makes.
          </p>
          <p>
            Sensors placed on your forehead pick these signals up without hurting you at all. It's completely safe and lets us peek into your brain's activity in <strong>real time!</strong>
          </p>
          <div className="sb-fact-pill">
            💡 EEG was first used in humans in 1924 by Hans Berger.
          </div>
        </div>
        <div className="sb-visual">
          <img src="/EEG.jpg" alt="EEG illustration" className="sb-media" />
        </div>
      </div>
    )
  },
  {
    id: 'fft',
    icon: <RiFilter3Line size={20} />,
    label: 'FFT',
    title: 'Breaking Down the Signals (FFT)',
    subtitle: 'Turning noise into knowledge.',
    content: (
      <div className="sb-layout">
        <div className="sb-text">
          <p>
            Brain signals look like a messy, overlapping scribble. To make sense of it, we use a math trick called the <strong>Fast Fourier Transform (FFT)</strong>.
          </p>
          <p>
            Imagine a fruit smoothie — you can't tell the ingredients apart once blended. FFT is like a machine that <strong>separates the smoothie</strong> back into apples, bananas, and strawberries. For brainwaves, those "fruits" are your Alpha, Beta, Theta, and Gamma frequencies.
          </p>
          <div className="sb-fact-pill">
            💡 FFT is one of the most important algorithms in all of computing.
          </div>
        </div>
        <div className="sb-visual">
          <img src="/FFT.jpg" alt="FFT Diagram" className="sb-media" />
        </div>
      </div>
    )
  },
  {
    id: 'brainwaves',
    icon: <RiPulseLine size={20} />,
    label: 'Waves',
    title: 'Meet Your Brainwaves',
    subtitle: 'Four frequencies, four states of mind.',
    content: (
      <div className="sb-waves-page">
        <p className="sb-intro-text">FFT separates your brain's signal into four main frequency bands. Each one tells a different story about what your brain is doing.</p>
        <div className="sb-waves-grid">
          <div className="sb-wave-card">
            <div className="wave-freq-tag" style={{ background: 'rgba(160,174,192,0.1)', color: 'var(--signal-theta)' }}>1 – 8 Hz</div>
            <svg viewBox="0 0 100 30" className="wave-svg"><path d="M0 15 Q 25 2, 50 15 T 100 15" fill="none" stroke="var(--signal-theta)" strokeWidth="2.5"/></svg>
            <h4>Delta & Theta</h4>
            <p><strong>The Slow Waves</strong> — Produced during sleep, deep dreams, and meditation. In an awake state, high Theta can signal fatigue.</p>
          </div>
          <div className="sb-wave-card alpha">
            <div className="wave-freq-tag" style={{ background: 'rgba(52,201,122,0.1)', color: '#34c97a' }}>8 – 13 Hz</div>
            <svg viewBox="0 0 100 30" className="wave-svg"><path d="M0 15 Q 12 2, 25 15 T 50 15 T 75 15 T 100 15" fill="none" stroke="#34c97a" strokeWidth="2.5"/></svg>
            <h4>Alpha</h4>
            <p><strong>The Chill Waves</strong> — You produce these when you're relaxed but alert. High alpha = your brain is comfortably at rest.</p>
          </div>
          <div className="sb-wave-card beta">
            <div className="wave-freq-tag" style={{ background: 'rgba(245,166,35,0.1)', color: '#f5a623' }}>13 – 30 Hz</div>
            <svg viewBox="0 0 100 30" className="wave-svg"><path d="M0 15 Q 6 2, 12 15 T 25 15 T 37 15 T 50 15 T 62 15 T 75 15 T 88 15 T 100 15" fill="none" stroke="#f5a623" strokeWidth="2.5"/></svg>
            <h4>Beta</h4>
            <p><strong>The Busy Waves</strong> — Active when you're focused and working. You're using Beta to read this right now! Prolonged Beta can cause stress.</p>
          </div>
          <div className="sb-wave-card gamma">
            <div className="wave-freq-tag" style={{ background: 'rgba(0,212,232,0.1)', color: 'var(--signal-alpha)' }}>30+ Hz</div>
            <svg viewBox="0 0 100 30" className="wave-svg"><path d="M0 15 Q 3 2, 6 15 T 12 15 T 18 15 T 25 15 T 31 15 T 37 15 T 43 15 T 50 15 T 56 15 T 62 15 T 68 15 T 75 15 T 81 15 T 87 15 T 93 15 T 100 15" fill="none" stroke="var(--signal-alpha)" strokeWidth="2.5"/></svg>
            <h4>Gamma</h4>
            <p><strong>The Super Waves</strong> — Rapid bursts linked to intense focus, insight, and high-level cognitive processing.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'calibration',
    icon: <RiSettings3Line size={20} />,
    label: 'Calibration',
    title: 'Why Do We Need Calibration?',
    subtitle: "Your brain is one-of-a-kind. So is your baseline.",
    content: (
      <div className="sb-layout">
        <div className="sb-text">
          <p>
            Everyone's brain is unique — like a fingerprint! What looks like a "relaxed" state for your friend might look completely different for you.
          </p>
          <p>
            When we "calibrate," we measure your personal baseline — specifically your <strong>Basal Alpha</strong> (your normal chill level). By knowing your personal starting point, the app can tell when your stress is rising or your focus is sharpening <em>relative to you</em>, not to anyone else.
          </p>
          <div className="sb-fact-pill">
            💡 Without a baseline, metrics are just numbers — with one, they tell your story.
          </div>
        </div>
        <div className="sb-visual">
          <img src="/calibration.jpg" alt="Calibration Diagram" className="sb-media sb-media--calib" />
        </div>
      </div>
    )
  },
  {
    id: 'metrics',
    icon: <RiFocus2Line size={20} />,
    label: 'Metrics',
    title: 'How We Calculate Your Stats',
    subtitle: 'From raw brainwaves to meaningful numbers.',
    content: (
      <div className="sb-metrics-page">
        <p className="sb-intro-text">Using FFT-separated brainwaves, we apply simple ratios to calculate how your brain is performing in real time.</p>
        <div className="sb-metrics-grid">
          <div className="sb-metric-card focus">
            <div className="sm-emoji">🎯</div>
            <div className="sm-body">
              <div className="sm-title">Focus</div>
              <div className="sm-formula">Beta ÷ (Alpha + Theta)</div>
              <p>When your alertness (Beta) clearly outweighs your slow waves, you're in a high-focus state.</p>
            </div>
          </div>
          <div className="sb-metric-card stress">
            <div className="sm-emoji">⚡</div>
            <div className="sm-body">
              <div className="sm-title">Stress</div>
              <div className="sm-formula">Beta ÷ Alpha</div>
              <p>High Beta with suppressed Alpha is a classic stress signature — your brain is working overdrive.</p>
            </div>
          </div>
          <div className="sb-metric-card relax">
            <div className="sm-emoji">🌊</div>
            <div className="sm-body">
              <div className="sm-title">Relaxation</div>
              <div className="sm-formula">Alpha ÷ (Alpha + Beta)</div>
              <p>When Alpha dominates Beta, your mind is quiet and at ease.</p>
            </div>
          </div>
          <div className="sb-metric-card fatigue">
            <div className="sm-emoji">🧠</div>
            <div className="sm-body">
              <div className="sm-title">Cognitive Fatigue</div>
              <div className="sm-formula">Theta ÷ Alpha</div>
              <p>When slow Theta waves creep up despite trying to focus, your brain is running low on fuel.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
]

export default function ScienceBehindView() {
  const [currentPage, setCurrentPage] = useState(0)

  const nextPage = () => setCurrentPage(p => Math.min(PAGES.length - 1, p + 1))
  const prevPage = () => setCurrentPage(p => Math.max(0, p - 1))

  const variants = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -16 }
  }

  return (
    <div className="science-behind animation-fade-in">
      {/* Main Card */}
      <div className="sb-card">
          {/* Card Header */}
          <div className="sb-card__header">
            <div className="sb-card__icon">{PAGES[currentPage].icon}</div>
            <div>
              <h2 className="sb-card__title">{PAGES[currentPage].title}</h2>
              <p className="sb-card__subtitle">{PAGES[currentPage].subtitle}</p>
            </div>
            <div className="sb-card__page-badge">
              {currentPage + 1} / {PAGES.length}
            </div>
          </div>

          {/* Animated Body */}
          <div className="sb-card__body">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.25 }}
              >
                {PAGES[currentPage].content}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Navigation */}
          <div className="sb-card__footer">
            <button
              className="sb-nav-btn sb-nav-btn--prev"
              onClick={prevPage}
              disabled={currentPage === 0}
            >
              <RiArrowLeftLine /> Previous
            </button>

            <button
              className="sb-nav-btn sb-nav-btn--next"
              onClick={nextPage}
              disabled={currentPage === PAGES.length - 1}
            >
              Next <RiArrowRightLine />
            </button>
          </div>

          {/* Step Tracker */}
          <div className="sb-stepper">
            {PAGES.map((page, i) => (
              <div
                key={page.id}
                className={`sb-stepper__step ${i === currentPage ? 'active' : ''} ${i < currentPage ? 'done' : ''}`}
                onClick={() => setCurrentPage(i)}
              >
                {/* Connector line before (skip first) */}
                {i > 0 && <div className={`sb-stepper__line ${i <= currentPage ? 'filled' : ''}`} />}

                <div className="sb-stepper__node">
                  {i < currentPage
                    ? <span className="sb-stepper__check">✓</span>
                    : <span>{i + 1}</span>
                  }
                </div>
                <span className="sb-stepper__label">{page.label}</span>
              </div>
            ))}
          </div>
        </div>
    </div>
  )
}