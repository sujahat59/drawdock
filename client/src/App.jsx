import { Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'

function ReviewButton() {
  const editor = useEditor()

  async function handleReview() {
    const snapshot = editor.getSnapshot()

    const response = await fetch('http://localhost:3001/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: snapshot })
    })

    const data = await response.json()
    console.log('Server response:', data)
    alert(data.message)
  }

  return (
    <button
      onClick={handleReview}
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1000,
        padding: '10px 20px',
        background: '#2563eb',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer'
      }}
    >
      Review
    </button>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  if (!session) return <Login />

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw>
        <ReviewButton />
      </Tldraw>
    </div>
  )
}