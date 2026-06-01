import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'http://localhost:5173'
      }
    })

    if (error) {
      alert(error.message)
    } else {
      setSent(true)
    }

    setLoading(false)
  }

  if (sent) {
    return (
      <div style={styles.container}>
        <div style={styles.box}>
          <h2 style={styles.title}>Check your email</h2>
          <p style={styles.subtitle}>
            We sent a magic link to <strong>{email}</strong>.
            Click it to sign in.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h1 style={styles.logo}>drawdock</h1>
        <p style={styles.subtitle}>
          AI-powered architecture review for developers
        </p>
        <form onSubmit={handleLogin}>
          <input
            style={styles.input}
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            style={styles.button}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send magic link'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#0f0f0f',
  },
  box: {
    background: '#1a1a1a',
    padding: '48px',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '400px',
    border: '1px solid #2a2a2a',
  },
  logo: {
    color: '#ffffff',
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '8px',
    fontFamily: 'monospace',
  },
  subtitle: {
    color: '#888',
    fontSize: '14px',
    marginBottom: '32px',
    lineHeight: '1.5',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: '#0f0f0f',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    marginBottom: '12px',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '12px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
}