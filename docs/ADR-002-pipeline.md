# ADR-002 — Two-Stage LLM Pipeline (Classifier → Critique)

**Status:** Accepted
**Date:** 2026-05-31
**Deciders:** [You]

---

## Context

Review is drawdock's hero feature. When a user clicks Review, the backend needs to:
1. Understand what the user drew
2. Find real-world references for that kind of system
3. Generate grounded suggestions based on both

The question this ADR answers: **how do we structure the LLM calls to make that happen?**

## Decision

**Use a two-stage pipeline:**
- **Stage 1 — Classifier:** one fast, cheap LLM call (Haiku 4.5) that reads the canvas JSON and outputs a description of the system plus a web search query
- **Stage 2 — Critique:** one slower, deeper LLM call (Sonnet 4.6) that reads the canvas JSON + classification + Tavily search results and outputs 3–7 grounded suggestions with citations

Between the two stages, the backend runs a Tavily search using the query from Stage 1.

## Why two calls instead of one

The single-call alternative — send the canvas to Sonnet and ask it to classify, search, and critique all at once — fails for two reasons:

**1. The LLM cannot search the web mid-call.** When we call the Anthropic API directly, we get a text-in-text-out function. It cannot reach the internet. Retrieval must happen between calls, orchestrated by our backend. A single LLM call with no retrieval step is just training-data advice — generic, unanchored, the problem drawdock exists to solve.

**2. Splitting the jobs makes each call sharper.** A prompt that says "classify this system AND critique it AND cite sources" dilutes all three. A prompt that says only "describe this system and write a search query" is focused and fast. The critique prompt can then be entirely focused on "reason over this diagram and these sources."

## The Classifier — what it does and how

The classifier receives:
- The canvas JSON from tldraw (shapes, labels, arrows)
- A system prompt instructing it to describe the system and write a search query

It outputs a JSON object with two fields:

```json
{
  "description": "A Telegram bot that receives user messages and responds via the Telegram API",
  "search_query": "Telegram bot architecture best practices webhook polling Node.js"
}
```

**Why no fixed category list:** an earlier design used a fixed list of 7 categories (web-crawler, chat-app, rest-api, etc.). This was rejected because most real developers draw systems that don't fit any pre-defined list — Netflix clones, Chrome extensions, React component libraries, custom tooling. Forcing everything into 7 buckets means most users hit "unknown" and the pipeline fails. Fix C (this design) gives Claude the freedom to describe anything while keeping it responsible for producing a usable search query.

**Why Claude writes the search query instead of us:** building the query from tags or labels (Fix B) makes our code responsible for assembly quality. Claude is better at natural language assembly than pattern-matching code. Asking Claude to write the query directly produces more human-sounding, higher-quality searches.

**Validation before Tavily:** the classifier output is validated before the search runs:
- `search_query` must be between 4 and 20 words
- Must contain at least one recognizable technical term
- Must not be a generic phrase like "system architecture" or "software design"

If validation fails, the user is prompted to add more labels to their shapes before Review runs again.

## The user confirmation step (from ADR-007 Amendment A)

After the classifier runs, the UI shows the user:

> *"I think you drew: [description]. Sound right?"*

With options: **Yes, looks right** → proceed / **No, let me clarify** → user edits description

This catches classifier errors before the expensive Sonnet critique call runs. It also surfaces a small "the AI understood my diagram" moment that builds trust in the product.

When the user sees Fix C's output, the confirmation is richer than a category label — they see a full sentence description, which is more informative and more correctable than "chat-app."

## The Critique — what it receives

The critique prompt contains:
1. The canvas JSON
2. The confirmed description from the classifier
3. The search query that was used
4. 3–5 Tavily snippets with their source URLs
5. Instructions to produce 3–7 suggestions, each citing at least one source

The critique is the only step that is RAG. The classifier is a pure LLM call with no retrieval.

## Why not RAG the classifier too

The classifier's job is to understand the diagram — that's pure reasoning over structured data. It doesn't need external sources to do that. Adding retrieval to the classifier would add latency and cost for no quality benefit. The classifier uses Claude's training knowledge (which is extensive for software architecture) and that's sufficient for the narrow job of "describe this and write a search query."

## Pipeline summary

```
User clicks Review
        ↓
Canvas → JSON (tldraw, no LLM)
        ↓
Classifier call (Haiku 4.5)
→ output: description + search_query
        ↓
Validation (our code)
        ↓
User confirmation UI
        ↓
Tavily search (search_query)
→ output: 5 snippets + source URLs
        ↓
Critique call (Sonnet 4.6)
→ input: canvas JSON + description + snippets
→ output: 3-7 suggestions with citations (streamed)
        ↓
Side panel in browser
```

## Consequences

### Positive
- Each LLM call has exactly one job — easier to prompt, easier to debug, easier to improve independently
- The classifier is cheap enough ($0.00035/call) that cost is never a concern
- The pipeline handles any system a developer can draw — no "unknown" failure mode
- The user confirmation step recovers gracefully from classifier errors

### Negative
- Two LLM calls + one search call adds latency vs a single call
- The classifier can write poor search queries for vague diagrams — mitigated by validation + user confirmation
- More moving parts = more places to debug when something goes wrong

### Mitigations
- Classifier runs fast (Haiku 4.5, small output) — adds ~500ms at most
- Validation catches bad queries before they waste a Tavily credit
- Each stage is isolated in its own module — a failure in the classifier doesn't crash the critique

## Interview Defense

> *"Review uses a two-stage pipeline. The first stage is a cheap classifier call on Haiku 4.5 — it reads the canvas JSON and outputs two things: a plain-English description of what the user drew, and a web search query tuned to find how real engineers build that kind of system. We don't use a fixed category list because most developers draw things that don't fit predefined buckets — a Telegram bot, a Chrome extension, a recommendation engine. Fix C lets Claude describe anything and write the query itself, which is a language task Claude is better at than pattern-matching code. The second stage is the critique on Sonnet 4.6 — it receives the canvas, the description, and the Tavily search results, and produces grounded suggestions with citations. Only the critique is RAG — the classifier is a pure LLM call, no retrieval needed there. Between the two stages we show the user what the classifier understood and let them correct it before the expensive call runs."*

## Related ADRs

- ADR-004 (tldraw) — provides the canvas JSON that enters the pipeline
- ADR-005 (Tavily) — the search step between classifier and critique
- ADR-007 (LLM provider) — specifies Haiku 4.5 and Sonnet 4.6 as the models
- ADR-007 Amendment A — the user confirmation step between classifier and critique
- ADR-009 (streaming) — how the critique output reaches the browser
