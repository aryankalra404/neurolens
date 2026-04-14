import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { RiBrainLine } from 'react-icons/ri'
import './Signup.css'

export default function Signup() {
  const navigate = useNavigate()

  /* ── Signup form state ── */
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  /* ── Step 1: Create account ── */
  const handleSignup = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      // Auto-login since OTP is bypassed
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      setLoading(false)

      if (loginError) {
        setError(loginError.message)
      } else {
        navigate('/dashboard')
      }
    }
  }

  /* ── Render ── */
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-card__logo">
          <div className="auth-card__logo-icon">
            <RiBrainLine size={20} />
          </div>
          <span className="auth-card__logo-text">NeuroLens</span>
        </Link>

        <h1>Create an account</h1>
        <p className="auth-card__subtitle">Start decoding your neural activity</p>

        {error && <div className="auth-card__error">{error}</div>}

        <form onSubmit={handleSignup} className="auth-form">
          <label className="auth-field">
            <span>Full name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
              autoFocus
            />
          </label>

          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              minLength={6}
            />
          </label>

          <button type="submit" className="btn-primary auth-btn" disabled={loading}>
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="auth-card__footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}
