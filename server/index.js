import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'drawdock server is running' })
})

// Placeholder Review route
app.post('/api/review', (req, res) => {
  const { canvas } = req.body
  console.log('Received canvas with', Object.keys(canvas || {}).length, 'keys')
  res.json({ message: 'Review endpoint reached. Pipeline coming soon.' })
})

app.listen(PORT, () => {
  console.log(`drawdock server running on http://localhost:${PORT}`)
})