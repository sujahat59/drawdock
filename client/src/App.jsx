import { Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import { loadBoard, saveBoard } from './lib/boards'
import Login from './components/Login'

function Canvas({ session }) {
  const editor = useEditor()
  const boardIdRef = useRef(null)
  const lastSaveRef = useRef(null)

  // Load board on mount
  useEffect(() => {
    async function load() {
      const board = await loadBoard(session.user.id)
      if (board) {
        boardIdRef.current = board.id
        editor.loadSnapshot(board.canvas)
      }
    }
    load()
  }, [editor, session])

  // Auto-save every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const snapshot = editor.getSnapshot()
      const snapshotStr = JSON.stringify(snapshot)

      // Only save if something changed
      if (snapshotStr === lastSaveRef.current) return
      lastSaveRef.current = snapshotStr

      const saved = await saveBoard(
        session.user.id,
        snapshot,
        boardIdRef.current
      )

      if (saved && !boardIdRef.current) {
        boardIdRef.current = saved.id
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [editor, session])

  async function handleReview() {
    const snapshot = editor.getSnapshot()

    const response = await fetch('http://localhost:3001/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: snapshot })
    })

    const data = await response.json()
    alert(data.message)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <>
      <button
        onClick={handleReview}
        style={{
          position: 'fixed', top: 16, right: 16,
          zIndex: 1000, padding: '10px 20px',
          background: '#2563eb', color: 'white',
          border: 'none', borderRadius: 8,
          fontSize: 14, fontWeight: 600, cursor: 'pointer'
        }}
      >
        Review
      </button>

      <button
        onClick={handleSignOut}
        style={{
          position: 'fixed', top: 16, right: 110,
          zIndex: 1000, padding: '10px 20px',
          background: '#1a1a1a', color: '#888',
          border: '1px solid #2a2a2a', borderRadius: 8,
          fontSize: 14, cursor: 'pointer'
        }}
      >
        Sign out
      </button>
    </>
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
        <Canvas session={session} />
      </Tldraw>
    </div>
  )
}