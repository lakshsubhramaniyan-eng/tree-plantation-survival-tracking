import { useState, type FormEvent } from 'react'
import './AuthScreen.css'

type AuthResponse = {
  token: string
  user: { username: string }
}

type AuthScreenProps = {
  onAuthenticated: (token: string, username: string) => void
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const result = await response.json() as AuthResponse | { error: string }
      if (!response.ok || !('token' in result)) {
        setError('error' in result ? result.error : 'Unable to authenticate')
        return
      }

      onAuthenticated(result.token, result.user.username)
    } catch {
      setError('Could not reach the server. Check that the API is running and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-intro" aria-label="Treebase introduction">
        <div className="auth-brand"><span>TS</span><strong>Treebase</strong></div>
        <div className="auth-intro-copy">
          <p className="auth-kicker">Field intelligence, grounded in growth</p>
          <h1>Every tree tells a story.</h1>
          <p>Sign in to follow plantation health, spot change early, and guide the next field visit.</p>
        </div>
        <div className="auth-intro-footer"><span>01</span><span>Plantation survival tracking</span></div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <p className="auth-eyebrow">{mode === 'login' ? 'Welcome back' : 'Create your account'}</p>
          <h2>{mode === 'login' ? 'Sign in to Treebase' : 'Join your field team'}</h2>
          <p className="auth-subtitle">Use your username and password to continue.</p>

          <div className="auth-tabs" role="tablist" aria-label="Authentication method">
            <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => { setMode('login'); setError('') }}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => { setMode('register'); setError('') }}>Create account</button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            <label htmlFor="auth-username">Username</label>
            <input
              id="auth-username"
              autoComplete="username"
              minLength={3}
              maxLength={24}
              pattern="[A-Za-z0-9_]+"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. lakshmi_field"
            />
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'register' ? 8 : 1}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'}
            />
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="auth-note">Your password is stored securely as a one-way hash.</p>
        </div>
      </section>
    </main>
  )
}