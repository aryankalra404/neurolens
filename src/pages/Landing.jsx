import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RiBrainLine, RiWifiLine, RiLineChartLine, RiShieldLine, RiArrowRightLine, RiDownloadLine } from 'react-icons/ri'
import { HiOutlineLightningBolt } from 'react-icons/hi'
import Navbar from '../components/Navbar'
import ParticleField from '../components/ParticleField'
import BrainViewer from '../components/BrainViewer'
import Footer from '../components/Footer'
import './Landing.css'

import { useTheme } from '../contexts/ThemeContext'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.65, ease: [0.22, 1, 0.36, 1] } }),
}

const FEATURES = [
  {
    icon: <RiWifiLine size={26} />,
    title: 'Universal Connection',
    desc: 'Connect seamlessly to any compatible EEG device and stream your raw biopotential data in real-time.',
  },
  {
    icon: <RiLineChartLine size={26} />,
    title: 'Live Band Analysis',
    desc: 'Visualize your Delta, Theta, Alpha, and Beta frequencies dynamically through clean, interactive charts.',
  },
  {
    icon: <RiBrainLine size={26} />,
    title: 'Cognitive Metrics',
    desc: 'Track essential mental states live, including your focus, relaxation, cognitive fatigue, and stress levels.',
  },
  {
    icon: <HiOutlineLightningBolt size={26} />,
    title: 'AI-Powered Insights',
    desc: 'Generate personalized mental health insights by analyzing patterns across your past sessions using advanced AI.',
  },
  {
    icon: <RiDownloadLine size={26} />,
    title: 'Session Archives',
    desc: 'Automatically save and archive your recording history. Access and compare past sessions effortlessly.',
  },
  {
    icon: <RiShieldLine size={26} />,
    title: 'Actionable Tips',
    desc: 'Receive personalized, actionable recommendations based on your cognitive trends to improve daily mental well-being.',
  },
]

const STEPS = [
  { num: '01', title: 'Connect Your Device', desc: 'Securely interface any compatible EEG device via high-speed Web Serial integration.' },
  { num: '02', title: 'Record Brainwaves', desc: 'Stream your Alpha, Beta, Theta, and Delta waves dynamically while tracking live cognitive metrics.' },
  { num: '03', title: 'Gain Actionable Insights', desc: 'Save your sessions and generate AI-powered insights to understand and improve your mental well-being.' },
]

export default function Landing() {
  const { theme } = useTheme()

  return (
    <div className="landing">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="hero">
        <ParticleField count={140} />

        <div className={`hero__inner container ${theme === 'light' ? 'hero__inner--centered' : ''}`}>
          {/* Left: copy */}
          <div className="hero__copy">
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} className="tag">
              <RiBrainLine size={12} /> EEG Signal Analysis Platform
            </motion.div>

            <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1} className="hero__heading">
              Improve Your<br />
              <span className="glow-text" data-text="Mental Health">Mental Health</span>
            </motion.h1>

            <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2} className="hero__desc">
              NeuroLens bridges the gap between neural data and mental wellness. Our platform analyzes your unique brainwave patterns to provide personalized cognitive coaching, helping you identify stress triggers and build long-term mental resilience through AI-driven insights.
            </motion.p>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="hero__actions">
              <Link to="/dashboard" className="btn-primary">
                <RiLineChartLine size={16} />
                Open Dashboard
              </Link>
              <a href="#how-it-works" className="btn-secondary">
                How It Works <RiArrowRightLine size={14} />
              </a>
            </motion.div>

            {/* Stats row */}
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="hero__stats">
              {[
                { val: '256 Hz', label: 'Sample Rate' },
                { val: 'EEG', label: 'Biopotential' },
                { val: '<5ms', label: 'Latency' },
              ].map(s => (
                <div className="hero__stat" key={s.label}>
                  <span className="hero__stat-val">{s.val}</span>
                  <span className="hero__stat-label">{s.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Brain viewer (3D embed slot) */}
          {theme === 'dark' && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={1}
              className="hero__brain-area"
            >
              <BrainViewer />
            </motion.div>
          )}
        </div>

        {/* Gradient fade at bottom */}
        <div className="hero__fade" />
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section className="features section" id="features">
        <div className="container">
          <motion.div
            className="section-heading"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="tag">Capabilities</div>
            <h2>Unlock your mind's true potential</h2>
            <p>From live brainwave tracking to AI-driven mental health insights, NeuroLens gives you the tools to understand yourself.</p>
          </motion.div>

          <div className="features__grid">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                className="feature-card"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.55 }}
              >
                <div className="feature-card__icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────── */}
      <section className="hiw section" id="how-it-works">
        <div className="container">
          <motion.div
            className="section-heading"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="tag">Process</div>
            <h2>Three steps to neural clarity</h2>
          </motion.div>

          <div className="hiw__steps">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.num}
                className="hiw-step"
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: i * 0.15, duration: 0.55 }}
              >
                <div className="hiw-step__num">{s.num}</div>
                <div className="hiw-step__content">
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hiw-step__line">
                    <motion.div 
                      className="hiw-step__line-fill"
                      initial={{ height: "0%" }}
                      whileInView={{ height: "100%" }}
                      viewport={{ once: true, margin: "-150px" }}
                      transition={{ duration: 1.2, delay: 0.3 + (i * 0.2), ease: "easeInOut" }}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="cta section">
        <div className="container">
          <motion.div
            className="cta__box"
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="cta__glow" />
            <div className="tag">Get Started</div>
            <h2>Ready to decode your brain?</h2>
            <p>Open the live dashboard and connect your EEG headset in seconds.</p>
            <Link to="/dashboard" className="btn-primary">
              <RiLineChartLine size={16} />
              Launch Dashboard
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}