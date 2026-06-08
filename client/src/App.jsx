import { Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import { loadBoard, saveBoard } from './lib/boards'
import Login from './components/Login'
import ReviewPanel from './components/ReviewPanel'

function Canvas({ session, onPanelChange }) {
  const editor = useEditor()
  const boardIdRef = useRef(null)
  const lastSaveRef = useRef(null)
  const [reviewResult, setReviewResult] = useState(null)
  const [reviewLoading, setReviewLoading] = useState(false)

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

  useEffect(() => {
    const interval = setInterval(async () => {
      const snapshot = editor.getSnapshot()
      const snapshotStr = JSON.stringify(snapshot)
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
    setReviewLoading(true)
    setReviewResult(null)
    onPanelChange(true)

    try {
      const snapshot = editor.getSnapshot()
      const response = await fetch('http://localhost:3001/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvas: snapshot })
      })
      const data = await response.json()
      setReviewResult(data)
    } catch (error) {
      console.error('Review failed:', error)
    } finally {
      setReviewLoading(false)
    }
  }

  function handleClose() {
    setReviewResult(null)
    onPanelChange(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <>
      <button
        onClick={handleReview}
        disabled={reviewLoading}
        style={{
          position: 'fixed', top: 16, right: 16,
          zIndex: 3000, padding: '10px 20px',
          background: reviewLoading ? '#1a1a1a' : '#2563eb',
          color: reviewLoading ? '#666' : 'white',
          border: 'none', borderRadius: 8,
          fontSize: 14, fontWeight: 600,
          cursor: reviewLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {reviewLoading ? 'Reviewing...' : 'Review'}
      </button>

      <button
        onClick={handleSignOut}
        style={{
          position: 'fixed', top: 16, right: 110,
          zIndex: 3000, padding: '10px 20px',
          background: '#1a1a1a', color: '#888',
          border: '1px solid #2a2a2a', borderRadius: 8,
          fontSize: 14, cursor: 'pointer'
        }}
      >
        Sign out
      </button>

      <ReviewPanel
        result={reviewResult}
        loading={reviewLoading}
        onClose={handleClose}
      />
    </>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)

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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      right: panelOpen ? '420px' : '0',
      transition: 'right 0.2s ease'
    }}>
      <Tldraw>
        <Canvas session={session} onPanelChange={setPanelOpen} />
      </Tldraw>
    </div>
  )
}