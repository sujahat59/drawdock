import Groq from 'groq-sdk'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load .env from the server root
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../../.env') })

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

// Two models — one for each job
const MODELS = {
  classifier: 'llama-3.1-8b-instant',   // fast, cheap, simple output
  critique: 'llama-3.3-70b-versatile'   // powerful, structured reasoning
}

export async function complete(prompt, task = 'critique') {
  const model = MODELS[task]

  console.log(`Calling Groq model: ${model}, prompt length: ${prompt.length} chars`)

  const response = await groq.chat.completions.create({
    model,
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: task === 'classifier' ? 0.1 : 0.7,
    max_tokens: 1000
  })

  console.log('Groq response received')
  return response.choices[0].message.content
}

export async function completeJSON(prompt, task = 'classifier') {
  const model = MODELS[task]

  const response = await groq.chat.completions.create({
    model,
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' }
  })

  return JSON.parse(response.choices[0].message.content)
}