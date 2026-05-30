# ADR-001 — Authentication

**Status:** Accepted (resolved via ADR-006)
**Date:** 2026-05-30

---

## Decision

**Use Supabase Auth.** Enable magic-link (email) and Google OAuth as sign-in providers for v1.

## Context

This decision was implicitly resolved by ADR-006 when Supabase was chosen as the database. Supabase bundles a production-grade authentication system (magic link, OAuth, email/password, JWT-based sessions) with its Postgres offering, and adopting Supabase Auth saves roughly a week of implementation time compared to wiring up a separate auth library.

## Options Considered (briefly)

- **NextAuth.js / Auth.js** — most flexible, requires more setup, would have been the choice if we'd picked Neon for the database.
- **Clerk** — excellent DX, generous free tier, but adds a second third-party platform alongside Supabase, doubling vendor exposure.
- **Roll our own (JWTs, password hashing, session store)** — meaningful learning, but no resume payoff at the level drawdock targets.
- **Supabase Auth (chosen)** — already part of the platform we picked for the database.

## Rationale

See ADR-006 §Rationale. The short version: collapsing the database and auth decisions into one platform saves a week of build time and provides a cleaner mental model. Supabase Auth is JWT-based under the hood, so the skills are not throwaway.

## Provider Choices for v1

- **Magic link (email):** primary path. Frictionless, modern, demoable in interviews.
- **Google OAuth:** secondary path. Most developers have a Google account; reduces sign-up friction further.
- **Password-based auth:** intentionally not enabled in v1. Avoids password reset flows, password storage concerns, and "forgot password" UX work.

## Consequences

- Auth migration cost is non-trivial if Supabase is ever replaced. Mitigation: keep all auth-protected logic in the application layer, avoid heavy use of Supabase RLS, so the auth boundary stays at one well-defined interface.
- The "I built my own auth" resume line is unavailable from this project. Considered and accepted.

## Interview Defense

> *"Auth is Supabase Auth, configured for magic-link and Google OAuth. I chose it because the database is Supabase — collapsing those two decisions saved a week I redirected to the AI work. It's JWT-based under the hood, so the skills are portable. If I'd picked Neon for the database, I would have used Auth.js — I looked at both."*

## Related ADRs

- ADR-006 (database) — drove this decision
