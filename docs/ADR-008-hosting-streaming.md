# ADR-008 — Hosting and Streaming Protocol

**Status:** Accepted
**Date:** 2026-05-31
**Deciders:** [You]

---

## Context

Two connected decisions need resolving before we can deploy drawdock:

1. **Where does the app live?** drawdock has a frontend (React + tldraw) and a backend (Node.js Review pipeline). Both need public hosting on free or near-free tiers.
2. **How do suggestions stream to the browser?** The critique call (Sonnet 4.6) takes 5–10 seconds. Without streaming, the user stares at a blank panel for 10 seconds — unacceptable UX for the hero feature.

These two decisions are connected: the hosting choice must support streaming (not all platforms do), and the streaming protocol choice affects which hosting options work cleanly.

## Decision

**Frontend:** Vercel
**Backend:** Railway
**Streaming protocol:** Server-Sent Events (SSE) via Vercel AI SDK

## Hosting — Why Split Frontend and Backend

The simplest approach would be hosting everything in one place. This was considered and rejected for one reason: **the best free frontend host (Vercel) has a 10-second timeout on serverless functions**, and our Review pipeline takes 5–10 seconds under normal conditions — right at or over the limit every time.

Splitting frontend and backend is a one-line environment variable change (`VITE_API_URL=https://drawdock-backend.railway.app`). The frontend doesn't care where the backend lives as long as it has a URL.

## Frontend — Vercel

Vercel is purpose-built for React frontends. Automatic deploys on every GitHub push. Global CDN. Free. The React + tldraw client is a static build — it has no server-side logic of its own. Vercel is the default correct answer for this deployment profile.

- **Free tier:** unlimited static deployments
- **Deploy:** push to GitHub → live in 30 seconds
- **No serverless functions used** — all API calls go to the Railway backend

## Backend — Railway

Railway runs Node.js as a persistent process (not serverless functions), which means:
- No timeout ceiling — Review calls can take as long as they need
- Streaming connections stay open for the full duration of the critique call
- WebSocket and SSE connections are natively supported

**Free tier:** $5 trial credit for new accounts; at our traffic level this covers weeks of development.

**Known tradeoffs (documented honestly):**
- Railway disabled their CDN in May 2026 — assets are served from origin region only. Doesn't affect our API backend.
- Railway has had intermittent platform reliability issues in 2026. Acceptable for a portfolio project with low traffic; would be a concern for production SaaS.
- Cold starts on Railway are ~300ms — barely noticeable.

**Why not Render:** Render's free tier cold starts are 10–30 seconds after 15 minutes of inactivity. A recruiter visiting the portfolio project after days of inactivity would wait up to 30 seconds for the first request. That's a worse first impression than Railway's occasional reliability issues.

**Why not Fly.io:** More powerful but requires learning their CLI and Docker config. Higher setup cost than Railway for a portfolio project that needs to ship quickly.

**Why not Vercel serverless for the backend:** 10-second function timeout kills the Review feature. Streaming responses from Vercel functions are also limited on the free tier.

## Streaming Protocol — SSE

The critique call streams tokens from Sonnet 4.6 back to the browser as they're generated. Three options were considered:

### Polling — rejected
Frontend asks backend "are you done yet?" every second. Simple but wasteful (10 HTTP requests to deliver one streaming response) and produces chunky, janky UX. Not appropriate for text streaming.

### WebSockets — rejected
Bidirectional persistent connection. Powerful — but designed for two-way real-time communication (chat apps, collaborative drawing). Review streaming is one-directional: server pushes tokens to browser. WebSockets add complexity that buys us nothing here.

### Server-Sent Events (SSE) — chosen
Standard browser API for one-directional server-to-browser streaming over HTTP. The server keeps the connection open and pushes data as it becomes available. The browser renders each token immediately as it arrives.

**Why SSE is the correct choice:**
- One-directional by design — matches our use case exactly
- Standard HTTP — works through proxies, CDNs, and standard infrastructure without special configuration
- **Vercel AI SDK has SSE streaming built in** — we call `streamText()` and the SDK handles the rest. Near-zero implementation cost.
- This is the same pattern claude.ai and ChatGPT use for their streaming responses. Industry standard for LLM output.

## How Streaming Works End to End

1. Frontend sends POST to `/api/review` on Railway backend
2. Backend starts the pipeline (classifier → Tavily → critique)
3. When the critique call begins, backend opens an SSE connection back to the browser
4. As Sonnet generates each token, it flows: Anthropic → Railway backend → SSE stream → browser
5. Browser renders tokens in the side panel as they arrive
6. When the stream ends, the connection closes naturally

The user sees the first suggestion token within ~3 seconds of clicking Review (classifier + Tavily takes ~2s, critique starts streaming immediately after).

## What This Means for the User

Without streaming: user clicks Review, waits 10 seconds, sees all suggestions appear at once. Feels broken.

With SSE streaming: user clicks Review, sees a classification confirmation (~1s), then suggestions begin appearing word by word within ~3 seconds. Total time is identical — but *perceived* time is much faster because something is always happening.

## Consequences

### Positive
- Frontend deploys automatically on every GitHub push (Vercel)
- Backend supports long-running Review calls without timeout (Railway)
- Streaming is near-free to implement via Vercel AI SDK
- First suggestion token appears within ~3 seconds of clicking Review

### Negative
- Two platforms to manage (Vercel + Railway) instead of one
- Railway's free credit runs out eventually — need to monitor spend
- Railway's 2026 reliability issues are a known risk for a portfolio project
- SSE connections don't support bi-directional communication — if we ever add real-time collab (v2), we'd add WebSockets alongside SSE, not replace it

### Mitigations
- Set Railway spend alerts at $4/month (80% of the $5 credit) so we're never surprised
- README documents the two-platform split so future maintainers understand the architecture
- If Railway becomes unreliable, Render on the $7/month Starter tier (always-on, no cold starts) is the migration path — one environment variable change on Vercel

## Surprises Uncovered During the Decision

- **Railway disabled their CDN in May 2026.** Not relevant for an API backend, but worth knowing if we ever served static assets from Railway.
- **Render's cold start is 10–30 seconds, not ~5 seconds as commonly assumed.** This disqualified Render's free tier for portfolio use — a recruiter waiting 30 seconds on first load is a failed demo.
- **The 10-second Vercel serverless timeout is a hard limit**, not a soft one. This was the forcing function for the split-hosting decision.

## Interview Defense

> *"drawdock is split across two hosts — Vercel for the React frontend and Railway for the Node.js backend. The reason for the split is that Vercel's serverless functions have a 10-second timeout on the free tier, and the Review pipeline takes 5–10 seconds under normal load. Railway runs Node.js as a persistent process with no timeout ceiling, which is what streaming requires. For streaming specifically, I used Server-Sent Events via Vercel AI SDK — SSE is one-directional server-to-browser, which matches Review's communication pattern exactly. WebSockets would have been overkill since we don't need the browser to send data back mid-stream. The Vercel AI SDK has SSE built in via streamText(), so it was near-zero implementation cost. The tradeoff I accepted on Railway is that it had some platform reliability issues in 2026 — acceptable for a portfolio project with low traffic, but I'd move to Render's paid tier for a production workload."*

## Related ADRs

- ADR-007 (Vercel AI SDK) — `streamText()` provides the SSE implementation
- ADR-002 (pipeline) — the Review pipeline that runs on the Railway backend
- ADR-009 — this ADR subsumes ADR-009 (streaming protocol). ADR-009 is marked closed.
