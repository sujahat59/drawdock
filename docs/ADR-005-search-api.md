# ADR-005 — Web Search API for RAG Retrieval

**Status:** Accepted
**Date:** 2026-05-31
**Deciders:** [You]

---

## Context

Review's RAG pipeline needs to fetch real web content about how the user's system type is actually built in production — engineering blog posts, architecture docs, GitHub READMEs, official documentation — and feed that content to the critique LLM call as grounded context.

This requires a web search API. The classifier (ADR-002) produces a natural-language search query like `"Telegram bot architecture best practices webhook polling Node.js"` and we pass it directly to a search provider. The provider returns snippets we feed into the critique prompt.

Constraints:
- Free tier must cover v1 development and demo traffic
- Returns clean JSON with snippets ready for LLM consumption — no raw HTML to parse
- Good result quality for technical/architecture queries
- Adds under ~1–2 seconds to Review's total latency

This is the lowest-lock-in decision in the stack. All search APIs answer the same question (send query, get snippets back), so switching providers is a one-file change as long as calls are wrapped behind `src/search/`.

## Decision

**Use Tavily** as the search provider for v1.

All search calls flow through `src/search/` so the underlying provider can be swapped without touching Review's pipeline code.

## Options Considered

### Option A — Tavily (chosen)

Purpose-built search API for AI/RAG use cases.

- **Pros:** Designed for "feed results to an LLM as context." Pre-ranked, pre-cleaned snippets. 1,000 free calls/month. Native integrations with Vercel AI SDK. LLM-ready output.
- **Cons:** Smaller company. Credit-based pricing gets expensive at high scale — irrelevant at v1 volume.
- **Chosen because:** shortest path from search query to LLM-ready snippets. Free tier comfortably covers v1.

### Option B — Brave Search API

Independent search index, lowest published latency (~669ms).

- **Pros:** Fastest. Not Google/Bing rewrapped.
- **Cons:** Moved off its perpetual free tier in February 2026. Now $5/month minimum. drawdock targets free tiers throughout v1.
- **Rejected:** violates free-tier constraint.

### Option C — Exa (formerly Metaphor)

Semantic search using embeddings.

- **Pros:** Strong for discovery-style queries.
- **Cons:** The classifier produces specific keyword-rich queries — keyword search fits better than semantic. Results unpredictable for technical queries.
- **Rejected:** wrong paradigm for our query shape.

### Option D — Firecrawl

Search + full-page extraction.

- **Pros:** Returns full cleaned page content.
- **Cons:** Overkill. Full-page extraction uses more credits and adds latency. Snippet-level context is sufficient.
- **Rejected for v1.**

### Option E — Serper / SerpAPI

Google results in JSON.

- **Pros:** Real Google quality.
- **Cons:** SerpAPI free tier is 100 searches/month — too small for active development.
- **Rejected:** free tier too small.

## How Tavily fits the Fix C classifier

The classifier (ADR-002) outputs a `search_query` field directly. That goes to Tavily unchanged. Response comes back as clean snippets that go straight into the critique prompt as grounded sources.

## Limits and what happens when we hit them

1,000 free calls/month. At 5 Reviews/day during demos = ~150/month, fine. At 30/day during heavy development = ~900/month, tight. Per-user rate limiting prevents a single user exhausting quota. If we hit the cap: upgrade Tavily or swap to Brave — one file change.

## Interview Defense

> *"I used Tavily for the retrieval step because it's purpose-built for AI/RAG consumption — pre-ranked, pre-cleaned snippets ready to feed into the critique prompt without writing fetch-and-parse code. The classifier writes a natural-language search query itself, so Tavily just receives something like 'Telegram bot architecture best practices webhook polling Node.js' and returns relevant engineering content. 1,000 free calls a month covered v1 easily. I considered Brave which has the lowest published latency, but it moved off its perpetual free tier in early 2026. Swapping providers is a one-file change because all search calls are isolated behind a src/search/ module — same provider-abstraction pattern as the LLM layer."*

## Related ADRs

- ADR-002 (pipeline) — classifier produces the search_query Tavily receives
- ADR-007 (LLM provider) — same provider-abstraction pattern applied to search
