import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { runReview } from './src/review/index.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://drawdock-green.vercel.app'
  ]
}))
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

    // MOCK MODE — remove this block when testing real pipeline
    if (process.env.NODE_ENV !== 'production') {
      return res.json({
        description: 'A REST API system with a user-facing frontend, backend API server, and database layer.',
        search_query: 'REST API architecture best practices scalability',
        sources: [
          { title: 'REST API Design Best Practices', url: 'https://stackoverflow.com/questions/rest-api-design' },
          { title: 'Scaling REST APIs', url: 'https://martinfowler.com/articles/rest-api-scaling' },
          { title: 'API Gateway Pattern', url: 'https://microservices.io/patterns/apigateway.html' },
        ],
        suggestions: `## Suggestions for your architecture\n\n**1. Add an API Gateway**\nYour diagram shows users hitting the API directly. Consider adding an API Gateway layer to handle authentication, rate limiting, and routing. This is standard practice for production systems.\n\n**2. Add a caching layer**\nThere is no cache between your API and Database. A Redis cache would reduce database load by 60-80% for read-heavy workloads.\n\n**3. Consider a load balancer**\nA single API server is a single point of failure. Add a load balancer in front of multiple API instances for high availability.\n\n**4. Database connection pooling**\nDirect database connections from the API can exhaust connection limits under load. Use a connection pooler like PgBouncer.\n\n**5. Add authentication middleware**\nNo auth layer is visible in your diagram. JWT or OAuth2 should sit between the user and API layer.`
      })
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