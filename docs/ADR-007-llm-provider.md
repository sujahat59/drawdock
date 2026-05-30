# ADR-007 — LLM Provider and Access Pattern

**Status:** Accepted
**Date:** 2026-05-30
**Deciders:** [You]

---

## Context

The Review feature requires two LLM calls per invocation, with very different requirements:

| Call | Purpose | Volume | Latency need | Reasoning need |
|---|---|---|---|---|
| **Classifier** | Categorize the user's diagram into a system archetype (`web-crawler`, `chat-app`, `rest-api`, `data-pipeline`, `unknown`) | High | Critical (gates the next call) | Pattern matching only |
| **Critique** | Given the diagram + classification + retrieved sources, produce 3–7 grounded suggestions with citations | Lower | Less critical (streamed to the user) | Structured reasoning |

This ADR resolves two questions in one:
1. **Which model(s) and provider(s) do we use?**
2. **How do we structure the code that calls them — direct vendor SDK, or an abstraction layer?**

The two questions are linked: the abstraction choice determines how painful future provider changes will be, and our long-term flexibility depends on that.

## Decision

**Use Vercel AI SDK as the abstraction layer, with Anthropic as the primary provider:**
- **Classifier call:** Claude Haiku 4.5
- **Critique call:** Claude Sonnet 4.6

All LLM access in the codebase flows through a single `src/llm/` module that wraps the Vercel AI SDK. The rest of the application is unaware of which provider is in use.

## Options Considered

### Option A — Native Anthropic SDK only, no abstraction

Direct calls to `@anthropic-ai/sdk` from wherever LLM access is needed.

- **Pros:** Simplest. Native access to every Anthropic feature (prompt caching, extended thinking, tool calling) the moment it ships. Smallest dependency footprint.
- **Cons:** Every file that calls the LLM is locked to Anthropic's API shape. Switching providers later would require touching every call site. No fallback option if Anthropic has an outage.
- **Rejected:** the lock-in is irreversible by the time it matters.

### Option B — Build our own provider abstraction

Write a small `llm/` module that defines a common interface and implements it for one provider initially (Anthropic), with the structure ready to add more.

- **Pros:** Full control. Deep learning. No third-party abstraction to debug. Resume line: "I built a provider abstraction from scratch."
- **Cons:** 100–200 lines of code that essentially recreate what Vercel AI SDK already provides. Time spent here is time not spent on RAG, prompt design, or the Review UX — which are drawdock's actual differentiators.
- **Rejected:** the engineering effort goes into infrastructure that already exists, not into the parts of the project that matter.

### Option C — Mixed providers (e.g., Groq Llama for classifier, Anthropic Sonnet for critique)

Use the cheapest/fastest service for each call.

- **Pros:** Optimal cost-per-call. Strongest "right tool for the job" narrative.
- **Cons:** Two vendors, two auth flows, two failure modes, two billing dashboards. The cost savings at drawdock's v1 scale are negligible (fractions of a cent per call) and not worth the operational complexity.
- **Rejected for v1:** real optimization, wrong moment. Revisit at scale.

### Option D — Vercel AI SDK + Anthropic (chosen)

Vercel AI SDK provides a unified interface across 25+ providers. Anthropic backs the v1 implementation; switching to another provider is a one-line config change.

- **Pros:**
  - Provider-abstraction pattern (the architectural goal) without writing the abstraction ourselves.
  - Anthropic provides Haiku 4.5 and Sonnet 4.6 — the two tiers drawdock needs — under one vendor relationship.
  - Streaming, structured output, and error handling are normalized across providers, so swapping is a config change rather than a rewrite.
  - The pattern matches what production teams use in 2026.
- **Cons:**
  - Abstraction layer can leak — vendor-specific features (Anthropic prompt caching, OpenAI structured-output guarantees, provider-specific error shapes) sometimes need native-SDK access alongside the abstraction.
  - Extra dependency: tied to Vercel AI SDK's release cycle for new provider features.
  - "Switching providers" is mechanically one line but operationally still requires testing — different models behave differently regardless of how clean the API surface looks.

## Rationale

Three things drove this:

**1. The architectural pattern matters more than the model pick.** Whatever model we choose for v1, prices and capabilities will shift over the next year. The decision that survives that change is *how the code is organized to absorb a swap* — not which model is best today. Vercel AI SDK gives us that survival path without writing it ourselves.

**2. Anthropic's tier structure matches the two-call shape.** Haiku 4.5 is purpose-built for fast, cheap, simple-output calls. Sonnet 4.6 is purpose-built for structured reasoning. Using one vendor's two tiers is operationally simpler than mixing vendors for marginal cost savings.

**3. The engineering investment goes to the right place.** Time we don't spend building a provider abstraction is time we spend on RAG, prompt design, and Review UX — the things that actually differentiate drawdock and that interviewers will probe deepest on.

## The Abstraction's Known Limitations (and why we accept them)

This is documented explicitly so it doesn't surprise future-us in an interview:

- **Prompt caching:** Anthropic's prompt caching is exposed through the SDK but slightly less ergonomic than native. At v1 volume the cost difference is negligible.
- **Structured output reliability:** the SDK normalizes structured output across providers but the underlying *reliability* differs by provider. We'll add retry logic for the rare invalid-JSON case.
- **Error shapes:** uncommon errors can bubble up in vendor-specific shapes. Handled by enabling debug logging in development.
- **Feature lag:** brand-new provider features may take days/weeks to land in the SDK. drawdock uses only stable, mature features (text, structured output, streaming), so this doesn't bite us.

If any of these become real problems at scale, the documented mitigation is to use the native Anthropic SDK alongside the Vercel AI SDK for specific deep features — a pattern that's widely used in production.

## Consequences

### Positive
- One LLM access module for the whole codebase. Switching providers later is mechanical, not architectural.
- Streaming UX works the same regardless of which model is behind it.
- Resume story: "I used a provider-abstraction pattern via Vercel AI SDK" — recognized industry pattern with a recognized library.

### Negative
- Vercel AI SDK version drift becomes part of our maintenance burden.
- Debugging requires understanding both the abstraction layer *and* the underlying provider when something goes wrong.
- We don't get the resume line for "I built a custom abstraction from scratch" — we get "I used the industry-standard abstraction," which is different in tone.

### Mitigations
- Pin Vercel AI SDK version in `package.json`; update deliberately, not automatically.
- Enable debug logging in development so raw provider requests/responses are inspectable.
- Document the model choice and config in `src/llm/config.ts` so swapping providers is one obvious place to change.

## Surprises Uncovered During the Decision

- **The mixed-vendor argument was weaker than expected.** I came in thinking "use the cheapest model for each call" would be the smart move. At drawdock's v1 scale (fractions of a cent per call), the cost savings are real but invisible. The complexity cost of two vendors outweighs the dollar cost savings.
- **The honest "one-line swap" claim has a footnote.** Mechanically swapping providers is one line. But the models behave differently — response style, structured-output reliability, error patterns — so a real provider switch still requires testing. The SDK removes the friction, not the work.
- **The cost of the classifier call is essentially zero.** Even on the most expensive model, classifying a single canvas costs less than $0.001. This freed us from optimizing the classifier on cost and let us optimize it on simplicity (one vendor) instead.

## Interview Defense

> *"I used Vercel AI SDK as a provider abstraction layer with Anthropic as the primary backend — Haiku 4.5 for the classifier call, Sonnet 4.6 for the critique. The abstraction means swapping in OpenAI or Gemini is a one-line config change if pricing shifts or Anthropic has an outage. The two-tier model split is intentional: the classifier is a cheap, fast, single-label call that doesn't need a flagship model, and the critique needs Sonnet's reasoning depth for structured architectural feedback with citations. I considered mixing vendors — Groq for the classifier specifically — but at v1 volume the cost savings were negligible and one vendor was operationally simpler. The tradeoff I accept is that Vercel AI SDK doesn't expose every vendor-specific feature as cleanly as a native SDK would; if I needed Anthropic's prompt caching at scale, I'd add the native SDK alongside, which is the documented production pattern."*

## Related ADRs

- ADR-002 (two-stage LLM pipeline) — this ADR specifies which models implement each stage
- ADR-003 (RAG details) — the critique call's prompt will incorporate retrieved sources from the search API chosen in ADR-005
- ADR-009 (streaming protocol) — Vercel AI SDK's streaming output is what the frontend consumes

## References

- Vercel AI SDK: https://sdk.vercel.ai/docs
- Anthropic model lineup: https://docs.anthropic.com
- Law of Leaky Abstractions (Joel Spolsky, 2002): https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/
