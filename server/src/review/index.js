import { completeJSON, complete } from '../llm/index.js'
import { search } from '../search/index.js'

// Step 1 — Classify the canvas and generate a search query
async function classify(canvasJSON) {
  const prompt = `You are an expert software architect.

A developer has drawn a system architecture diagram. Here is the canvas data:
${JSON.stringify(canvasJSON, null, 2)}

Look at the shape labels and connections. Do two things:
1. Write one sentence describing what kind of system this is
2. Write a web search query (4-12 words) to find how real engineers build this kind of system

Respond with valid JSON only:
{
  "description": "one sentence describing the system",
  "search_query": "the search query here"
}`

  return await completeJSON(prompt, 'classifier')
}

// Step 2 — Generate grounded critique
async function critique(canvasJSON, description, sources) {
  const sourcesText = sources.map((s, i) =>
    `Source ${i + 1}: ${s.title}\nURL: ${s.url}\nContent: ${s.snippet}`
  ).join('\n\n')

  const prompt = `You are a senior software architect reviewing a developer's system design.

System description: ${description}

The developer's diagram (JSON):
${JSON.stringify(canvasJSON, null, 2)}

Real-world reference sources:
${sourcesText}

Based on the diagram AND the reference sources above, provide 3-5 specific suggestions.
Each suggestion must:
- Point to something specific in the diagram
- Be grounded in the reference sources
- Include the source URL it came from

Format your response as a clear numbered list.
Do not make suggestions that aren't supported by the sources.`

  return await complete(prompt, 'critique')
}

// Main Review function — runs the full pipeline
export async function runReview(canvasJSON) {
  console.log('Starting Review pipeline...')

  // Step 1 — Classify
  console.log('Step 1: Classifying canvas...')
  const classification = await classify(canvasJSON)
  console.log('Classification:', classification)

  // Step 2 — Search
  console.log('Step 2: Searching Tavily for:', classification.search_query)
  const sources = await search(classification.search_query)
  console.log('Found', sources.length, 'sources')

  // Step 3 — Critique
  console.log('Step 3: Generating critique...')
  const suggestions = await critique(canvasJSON, classification.description, sources)

  return {
    description: classification.description,
    search_query: classification.search_query,
    sources,
    suggestions
  }
}