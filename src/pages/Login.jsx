import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { RiBrainLine } from 'react-icons/ri'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-card__logo">
          <div className="auth-card__logo-icon">
            <RiBrainLine size={20} />
          </div>
          <span className="auth-card__logo-text">NeuroLens</span>
        </Link>

        <h1>Welcome back</h1>
        <p className="auth-card__subtitle">Log in to access your dashboard</p>

        {error && <div className="auth-card__error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </label>

          <button type="submit" className="btn-primary auth-btn" disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="auth-card__footer">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
