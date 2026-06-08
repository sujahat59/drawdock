import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { runReview } from './src/review/index.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '10mb' }))

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'drawdock server is running' })
})

app.post('/api/review', async (req, res) => {
  try {
    const { canvas } = req.body

    if (!canvas) {
      return res.status(400).json({ error: 'No canvas data provided' })
    }

    const result = await runReview(canvas)
    res.json(result)

  } catch (error) {
    console.error('Review pipeline error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`drawdock server running on http://localhost:${PORT}`)
})