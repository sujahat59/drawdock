# drawdock

An AI whiteboard for developers. Draw a system, click Review, and get architectural feedback grounded in how real companies actually build that kind of system.

🚧 In active development.

## What it does

1. Draw a system architecture on the canvas
2. Click **Review** — drawdock classifies what you drew and searches the web for how real engineers build that kind of system
3. Get 3–7 grounded suggestions with citations, streamed back in seconds

## Stack

| Layer | Technology |
|---|---|
| Canvas | tldraw + @tldraw/ai |
| Frontend | React, Vercel |
| Backend | Node.js, Railway |
| Database + Auth | Supabase (Postgres) |
| AI | Anthropic Claude (Haiku 4.5 + Sonnet 4.6) via Vercel AI SDK |
| Search (RAG) | Tavily |

## Docs

### Product
- [Product Requirements (PRD)](docs/PRD.md)

### Architecture Decisions
- [ADR-001](docs/decisions/ADR-001-auth.md) — Auth: Supabase Auth, magic link + Google OAuth
- [ADR-002](docs/decisions/ADR-002-pipeline.md) — Pipeline: two-stage classifier + critique
- [ADR-003](docs/decisions/ADR-003-rag-strategy.md) — RAG: Tavily retrieval + Claude generation
- [ADR-004](docs/decisions/ADR-004-canvas-library.md) — Canvas: tldraw + @tldraw/ai
- [ADR-005](docs/decisions/ADR-005-search-api.md) — Search: Tavily
- [ADR-006](docs/decisions/ADR-006-database.md) — Database: Supabase (Postgres + pgvector)
- [ADR-007](docs/decisions/ADR-007-llm-provider.md) — LLM: Vercel AI SDK + Anthropic
- [ADR-007-A](docs/decisions/ADR-007-amendment-A.md) — Classifier: Fix C + user confirmation
- [ADR-008](docs/decisions/ADR-008-hosting-streaming.md) — Hosting: Vercel + Railway, SSE streaming