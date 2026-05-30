# ADR-006 — Database

**Status:** Accepted
**Date:** 2026-05-30
**Deciders:** [You]

---

## Context

drawdock needs to persist:
- **Users** — identity and authentication state
- **Boards** — title, owner, timestamps, and a single JSON blob holding the entire tldraw canvas state (the tldraw library serializes canvases as JSON)
- **Review history** (should-have) — per-board record of past Review runs, retrieved sources, and generated suggestions

The data shape is small, relational at the edges (a user has boards, a board has reviews), and JSON-heavy at the center (canvas state and AI outputs). The expected scale for v1 is small enough that any database would work technically; the deciding factors are therefore:

1. **Time-to-ship.** With ~5 weeks total budget, days saved on infrastructure are days available for AI work.
2. **Free-tier viability.** drawdock will be deployed on free tiers throughout v1.
3. **Future-proofing.** Specifically: room to add a curated-knowledge-base vector RAG layer in v2 without re-platforming.
4. **Interview defensibility.** The choice has to be justifiable, not just convenient.

## Decision

**Use Supabase** — managed Postgres with bundled authentication, file storage, and `pgvector` available out of the box.

This decision also resolves **ADR-001 (auth)** by adopting Supabase Auth (magic link + Google OAuth) rather than rolling a separate auth stack.

## Options Considered

### Option A — SQLite

A file-based relational database with zero setup.

- **Pros:** Trivial to start; same SQL skills as Postgres; fast at this scale.
- **Cons:** Most serverless and free-tier hosting wipes the disk between deploys or restarts, which would silently destroy data. Doesn't pair well with the hosting options we're likely to pick in ADR-008. Polarizing in interviews.
- **Rejected:** the hosting risk is real and the operational story is weak.

### Option B — Neon (managed Postgres, database-only)

Serverless Postgres with branching and scale-to-zero. Great pure-Postgres experience.

- **Pros:** Wakes from idle in ~500ms; clean Postgres-only mental model; no vendor lock-in beyond a connection string.
- **Cons:** Auth is not included — would require building an auth stack (NextAuth, Auth.js, Clerk, or custom). That's a week of work that doesn't add resume value at the level drawdock targets.
- **Rejected for v1:** the auth work is a week we cannot afford to spend on a problem that's already solved by mature platforms.

### Option C — MongoDB Atlas

Document database with generous free tier.

- **Pros:** Schema-less storage of JSON-shaped data.
- **Cons:** drawdock's data has real relationships (user → boards → reviews) that document databases handle awkwardly. The "schema-less" advantage is largely neutralized by Postgres's `jsonb` columns, which give us schema-flexibility within a relational model. Interview perception has shifted away from MongoDB for use cases that don't justify it.
- **Rejected:** wrong tool for this data shape.

### Option D — Supabase (chosen)

Managed Postgres with auth, file storage, real-time, edge functions, and pgvector bundled.

- **Pros:**
  - Postgres underneath — production-grade, no exotic-skill investment.
  - **Auth included.** Magic link, Google OAuth, email/password — configured rather than coded.
  - `jsonb` columns native — the tldraw canvas state stores as one column without serialization layers.
  - `pgvector` extension available — future-proofs a v2 vector-RAG path (curated knowledge base) without changing infrastructure.
  - File storage available if we revisit the v1 scope around uploads.
  - Generous free tier (500 MB DB, 50K MAU, 2 projects).
- **Cons:**
  - Vendor coupling — auth migration cost is real if we ever leave Supabase.
  - Free-tier projects pause after 7 days of inactivity; first-load after long idle takes 2–3 seconds. Acceptable for a portfolio project.
  - Less depth of "I built every layer myself" — a minor mark against the resume story compared to self-hosted Postgres + custom auth.

## Rationale

The decision pivot was speed. Picking Neon would have forced a parallel auth decision (ADR-001) that costs roughly a week of build time on a problem with no resume upside — nobody is hired in 2026 for writing their own JWT middleware. Supabase collapses the database and auth decisions into one and gives back that week to the AI layer, which is the project's actual value proposition.

Three secondary factors supported the choice:

1. **`jsonb` for canvas state.** tldraw's persistence model is "one large JSON blob per board." Postgres's `jsonb` column stores it natively and lets us query inside it later if we ever need to. No ORM-induced serialization complexity.
2. **`pgvector` as a v2 hedge.** v1 Review uses web-search RAG (live retrieval from Tavily/Brave/Exa). v2 may add a curated knowledge base — embedded architecture write-ups stored locally for faster, cheaper retrieval. pgvector is the natural place to hold those embeddings, and it's already part of Supabase. The v1 choice doesn't paint us into a corner.
3. **Honest interview framing.** "I picked Supabase to ship faster on a tight timeline; it's Postgres underneath, and I'd swap it for self-hosted Postgres + Auth.js if I ever needed to" is a confident, mature answer.

## Consequences

### Positive
- ADR-001 (auth) is implicitly resolved — Supabase Auth, magic link + Google OAuth.
- Single dashboard, single SDK, single set of credentials.
- v2 vector-RAG path remains open without re-platforming.
- File uploads are available as a near-zero-cost feature if v1 scope is revised.

### Negative
- All-eggs-in-one-basket risk if Supabase changes pricing or has an outage.
- Auth migration cost is non-trivial if we ever leave.
- Database pauses after 7 days of inactivity on free tier; first load after a long idle is slow.

### Mitigations
- Keep schema migrations in SQL files in the repo — not buried in the Supabase dashboard. If we ever migrate to raw Postgres, the schema is portable.
- Avoid Supabase Row Level Security policies that don't translate to plain Postgres — keep authorization logic in the application layer where possible.
- Note the free-tier pause in the README so reviewers aren't surprised by a 2-second first-load.

## Surprises Uncovered During the Decision

- **pgvector inclusion shifted the long-term calculus.** Going in, the choice felt like "speed vs. depth." pgvector being part of Supabase means we don't have to sacrifice the depth path — the v2 vector-RAG layer is reachable without infrastructure change.
- **The file-uploads question reopened.** v1 PRD currently has file uploads as won't-have because storage was assumed to be expensive plumbing. With Supabase Storage available essentially for free, this assumption no longer holds. A separate scope-revision decision is needed (tracked in `BACKLOG.md`) — *not* automatically reopened by this ADR.
- **Free-tier pause behavior is sharper than expected.** 7 days of inactivity is short for a portfolio project that a recruiter might look at months after a job application. Worth a one-line mention in the README so the cold start is expected.

## Interview Defense

> *"I chose Supabase because it collapses two decisions — database and auth — into one, and on a 5-week budget that's a week I get back for the AI work, which is the actual product. It's Postgres underneath, so I'm not learning a throwaway skill — I could lift the schema and queries to self-hosted Postgres in an afternoon if I had to. Two specific things sealed it: tldraw's canvas state is a JSON blob, and Postgres's jsonb column stores it natively; and Supabase includes pgvector, which means when I add a curated-knowledge-base RAG layer in v2, the vector store is already there. The tradeoff I accept is vendor coupling for auth — if I ever needed to migrate, I'd swap to Auth.js or Clerk, both of which I considered."*

## Related ADRs

- ADR-001 (auth) — implicitly resolved by this ADR; will be documented as "Supabase Auth, magic link + Google OAuth"
- ADR-003 (RAG strategy) — v1 web-search RAG remains the plan; pgvector keeps the v2 vector-RAG path open
- ADR-008 (hosting) — Supabase decouples DB hosting from app hosting; ADR-008 now only needs to pick a frontend/backend host

## References

- Supabase free tier specs: https://supabase.com/pricing
- pgvector docs: https://github.com/pgvector/pgvector
- Supabase Auth providers: https://supabase.com/docs/guides/auth
