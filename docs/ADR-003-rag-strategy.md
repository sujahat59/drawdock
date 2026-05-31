# ADR-003 — RAG Strategy

**Status:** Accepted
**Date:** 2026-05-31
**Deciders:** [You]

---

## Context

Review's core promise is: *"suggestions grounded in how real companies actually build this kind of system."* That promise requires the AI to reason over real, current, external information — not just its training data.

This ADR documents why we use RAG to fulfill that promise, how RAG is split across the pipeline, and why we made the specific retrieval and generation choices we did.

Most of the individual decisions (which search API, which model, pipeline shape) are already locked in ADR-002, ADR-005, and ADR-007. This ADR connects those decisions into one coherent RAG strategy and documents the reasoning.

## What RAG means in drawdock

RAG = Retrieval-Augmented Generation. Two steps, two tools, neither alone is RAG:

**Retrieval (Tavily):** After the classifier confirms what the user drew, the backend sends the classifier's search query to Tavily. Tavily fetches real engineering content from the web — blog posts, docs, GitHub READMEs — and returns cleaned snippets with source URLs. Tavily does not understand the content. It just finds and returns it.

**Augmented Generation (Claude Sonnet 4.6):** The backend assembles a critique prompt containing the canvas JSON, the system description from the classifier, and the Tavily snippets. Sonnet reads all of it and generates 3–7 suggestions grounded in both the user's actual diagram and the retrieved real-world sources. Each suggestion cites at least one source URL.

The combination of both steps is RAG. Tavily alone is just search. Claude alone is just training-data advice. Together they produce grounded, citable, specific feedback.

## Why RAG and not training-data-only

The simplest version of Review would be: send the canvas to Claude and ask for suggestions. No search. One call.

This was considered and rejected for one reason: **training-data advice is generic.**

When Claude answers from training data alone, it produces suggestions that could apply to any system of that type. "Consider adding a cache." "You might want a load balancer." "Think about error handling." These suggestions are not wrong — but they're not specific to *this* diagram, and they're not grounded in *real* examples. They sound like the advice any LLM chatbot would give.

The product promise of drawdock is different: *"here's how Cloudflare actually handles this, and your diagram is missing X."* That requires real sources retrieved at the moment of the question. That's RAG.

## Why not a vector database for retrieval

An alternative RAG approach: instead of searching the live web, maintain a curated collection of high-quality architecture articles embedded in a vector database (pgvector in Supabase). Retrieve by semantic similarity at query time.

**Why we didn't do this for v1:**
- Requires curating, embedding, and maintaining a knowledge base — weeks of work before a single suggestion can be generated
- A static knowledge base goes stale; the web is always current
- pgvector is available in Supabase (noted in ADR-006) and this pattern is the documented v2 path — a hybrid approach where both live web search and a curated knowledge base contribute to retrieval

**v2 plan:** combine Tavily (live web) with pgvector (curated, high-quality sources). The live search handles novelty; the curated base handles quality. For v1, live search alone is sufficient.

## The critique prompt structure

The critique prompt is the most important prompt in drawdock. Its shape directly determines the quality of Review's output.

Structure:

```
SYSTEM:
You are an expert software architect reviewing a developer's system diagram.
Your job is to identify what is missing, what is risky, and what could be
improved — grounded in the provided reference sources.
Every suggestion must cite at least one source from the references below.
Do not make suggestions that are not supported by the references.
Respond with a JSON array of 3-7 suggestion objects.

USER:
System description: [description from classifier]

The developer's diagram:
[canvas JSON]

Reference sources:
[Tavily result 1 — title, URL, snippet]
[Tavily result 2 — title, URL, snippet]
[Tavily result 3 — title, URL, snippet]
[up to 5 results]

Based on the diagram and the reference sources above, what is missing,
risky, or could be improved?
```

Three design decisions in that prompt worth noting:

**1. "Do not make suggestions not supported by the references."** This is the constraint that prevents hallucinated citations. If Claude can't point to a source for a suggestion, it doesn't make the suggestion. This is what makes drawdock's output feel grounded rather than generic.

**2. JSON array output.** Structured output lets the frontend render each suggestion as a card with a clickable source link. Unstructured prose would make that impossible.

**3. The canvas JSON is included in the critique prompt.** Not just the description — the full JSON. This lets Sonnet reason about specific parts of the diagram ("your diagram shows an API server connecting directly to the database — the referenced article recommends an ORM layer here"). The description alone would lose that specificity.

## What is RAG and what is not in this pipeline

This is documented explicitly because it matters for interviews:

| Step | RAG? | Why |
|---|---|---|
| Canvas → JSON | No | App code, no AI |
| Classifier (Haiku) | No | Pure LLM call, no retrieval |
| Tavily search | R only | Retrieval with no generation |
| Critique (Sonnet) | Full RAG | Generation augmented by retrieved sources |

The classifier is not RAG. It uses Claude's training knowledge to understand the diagram and write a search query. No external sources are retrieved for that step — nor do they need to be. Claude's training knowledge is sufficient for "describe this diagram and write a search query."

## Consequences

### Positive
- Suggestions cite real sources — output feels grounded, not generic
- Live web search means sources are current, not frozen at training cutoff
- The "no suggestions without citations" constraint prevents hallucination
- v2 vector-RAG path is open via pgvector in Supabase

### Negative
- Review quality depends on Tavily result quality — bad search results produce weak suggestions
- The "citations required" constraint means Claude may produce fewer suggestions if sources are thin
- Slightly more latency than training-data-only (one extra Tavily call)

### Mitigations
- Fix C classifier produces specific, high-quality search queries — reduces bad-result risk
- If Tavily returns fewer than 3 results, we show the user a warning and offer to retry
- Latency is mitigated by streaming — user sees first suggestions within ~3 seconds

## Interview Defense

> *"RAG in drawdock is split across two tools. Tavily handles the retrieval — it fetches real engineering content from the web based on the classifier's search query and returns cleaned snippets with source URLs. Those snippets go into the critique prompt alongside the user's canvas JSON. Claude Sonnet then generates suggestions grounded in both — that's the augmented generation step. The two together is what makes it RAG. I considered a vector database approach — embedding a curated knowledge base in pgvector — but for v1 live web search is simpler and always current. The pgvector path is available in Supabase when I want to add a hybrid approach in v2. The key design constraint in the critique prompt is 'no suggestion without a citation' — that's what prevents the output from feeling like generic ChatGPT advice."*

## Related ADRs

- ADR-002 (pipeline) — the pipeline shape this RAG strategy runs inside
- ADR-005 (Tavily) — the retrieval provider
- ADR-006 (Supabase) — pgvector available for v2 vector RAG
- ADR-007 (LLM provider) — Sonnet 4.6 as the generation model
