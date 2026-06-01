import { Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

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
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw>
        <ReviewButton />
      </Tldraw>
    </div>
  )
}