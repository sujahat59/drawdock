export async function search(query) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
    },
    body: JSON.stringify({
      query,
      max_results: 5,
      search_depth: 'advanced',
      include_answer: false,
      include_raw_content: false
    })
  })

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.statusText}`)
  }

  const data = await response.json()

  // Return only what we need — title, url, snippet
  return data.results.map(r => ({
    title: r.title,
    url: r.url,
    snippet: r.content
  }))
}