# drawdock — Product Requirements Document

> **Version 0.2** · Status: Draft (locked for system design) · Owner: [Mohammed]
>
> A whiteboard for developers that doesn't just let you draw — it reviews what you drew against how real companies actually build that kind of system.

---

## 1. Problem Statement

Developers regularly sketch system architectures — to plan features, prep for design reviews, study for interviews, or think through side projects. Today they have two bad options:

1. **Generic whiteboards** (Excalidraw, Miro, draw.io) let you draw shapes, but a box is just a box. The tool has no idea you sketched a web crawler with no queue, or a chat app with no pub-sub. There's no feedback loop. You finish drawing and you're alone with your assumptions.
2. **LLM chat interfaces** (ChatGPT, Claude) will give you architectural advice, but the advice is unanchored. It's the model's averaged opinion from training data, not grounded in how real systems are actually built today. And you can't *show* it your diagram — you have to describe it in text, which loses everything.

**The gap:** there's no tool where you can sketch a system *and* get feedback that's both grounded in your specific diagram *and* grounded in real-world implementations.

drawdock closes that gap.

## 2. Goals

**Primary goal.** A developer sketches a rough system, clicks **Review**, and within ~10 seconds sees concrete, sourced suggestions about what their architecture is missing — drawn from real engineering blog posts, docs, and known patterns, not from the LLM's imagination.

**Secondary goals.**
- The canvas itself feels good to use — fast, responsive, doesn't fight the user.
- Messy sketches can be tidied to a presentable layout in one click (so Review doesn't operate on visual garbage).
- Boards persist. A developer can come back to a sketch the next day and pick up where they left off.

**Non-goals (v1).** We explicitly do not:
- Support multi-user real-time collaboration. (See `docs/v2-roadmap.md` — Yjs + WebSocket plan is documented.)
- Replace Figma, Lucidchart, or any formal diagramming tool.
- Try to be a general AI chat tool. drawdock only speaks through the canvas.
- Support mobile or tablet. Desktop browsers only.

## 3. Target User

**Primary user: the working/aspiring developer who needs architectural feedback on something they're actually building or studying.**

Not "students practicing for class." Not "designers wireframing." Specifically: someone who has a concrete system in mind — a crawler, a chat app, a job queue, a REST service — and wants a second opinion before they write code or before they walk into a design review.

### Jobs-to-be-done

| When the user is... | They want to... | So that... |
|---|---|---|
| Building a side project | Sketch the architecture and find out what's missing before writing code | They don't refactor everything in week 2 |
| Prepping for a system design interview | Practice designing systems and get feedback that mirrors real-world patterns | They walk into the interview having seen how real companies actually solve the problem |
| About to propose a design at work | Pressure-test their architecture privately before showing teammates | They don't get publicly torn apart for missing the obvious |

### Why these users, why now

LLMs gave everyone instant architectural advice — but unanchored advice is white noise. The next product wave is *grounded* AI: tools that combine retrieval with generation so the advice cites real sources. drawdock is that wave applied to a visual medium developers already think in.

## 4. User Stories

### Must-have (v1 ships without these = failure)

1. As a developer, I can sign up / log in (magic link or Google OAuth) so my boards persist.
2. As a developer, I can create a new blank board and draw rectangles, arrows, freehand strokes, and text labels.
3. As a developer, I can save my board and reload it later with everything intact.
4. As a developer, I can click **Tidy** to snap my messy shapes into an aligned, grid-based layout.
5. As a developer, I can click **Review** and receive 3–7 grounded architectural suggestions within ~10 seconds, each citing a real source URL.
6. As a developer, I can see the AI's suggestions stream in (not wait blankly for 10 seconds with no feedback).
7. As a developer, I can see *why* each suggestion was made — which part of my diagram triggered it, and which source backs it up.

### Should-have (v1 ships with these if time permits)

8. As a developer, I can attach a short note or link to any shape (the "Context Layer," lighter version).
9. As a developer, I can see a list of my recent boards on a dashboard.
10. As a developer, I can export my board as a PNG.

### Won't-have (explicitly out of v1)

- Real-time multi-user collaboration → **v2 roadmap.**
- File uploads on shapes (storage rabbit hole on free tiers).
- Version history / undo beyond the current session.
- Comments / threaded discussion on shapes.
- Pre-built templates ("AWS stack template", "MERN template").
- Mobile or tablet support.
- Voice/video collaboration.
- The user editing the AI's prompts directly.

## 5. The Two Core Features — what they actually do

### Tidy (geometry, no AI)

The user has drawn messy shapes — uneven sizes, misaligned, overlapping. Click **Tidy** and the canvas:
- Snaps shape centers to a grid.
- Normalizes shape sizes within a tolerance (so all "service boxes" are roughly the same size).
- Re-routes arrows so they don't cross unnecessarily.
- Adjusts spacing so the diagram has breathing room.

No AI. This is a deterministic geometry algorithm. Why: it's cheap to build, it works every time, and it makes the canvas look professional *before* Review runs — so Review's suggestions land on something that already looks credible.

### Review (RAG-powered)

The user clicks **Review** and:

1. **Canvas → JSON.** We convert the canvas to a structured representation: `[{id: 1, type: "rectangle", label: "API Server"}, {id: 2, type: "arrow", from: 1, to: 3}, ...]`. The LLM never sees pixels.
2. **Classify.** A small fast LLM call: "What kind of system is this?" — returns a tag like `web-crawler`, `chat-app`, `rest-api`, `data-pipeline`.
3. **Retrieve.** That classification becomes a search query against a web search API (Tavily / Brave / Exa — TBD in system design). We retrieve 3–5 high-quality sources about how real systems of that type are built.
4. **Generate.** A second LLM call gets: the user's diagram (JSON), the classification, and the retrieved sources. It produces 3–7 suggestions, each citing a source.
5. **Stream.** Suggestions stream into a side panel as they're generated. Each suggestion highlights the relevant part of the diagram and links to its source.

**Why two LLM calls instead of one:** the classifier prompt and the critique prompt have different jobs. One call for both dilutes both. Splitting them lets the classifier be small/fast/cheap and the critique be sharp and focused. (Documented in `docs/decisions/ADR-002.md`.)

**Why RAG instead of training-data alone:** anyone can call an LLM. The differentiator is grounding suggestions in *real, citable sources* so the output doesn't feel like generic ChatGPT advice. (Documented in `docs/decisions/ADR-003.md`.)

## 6. Edge Cases (we will hit these)

Captured here so they don't disappear. Real answers go in the System Design doc.

- **The user draws unlabeled boxes.** What does the classifier do? (Likely: ask the user to label or refuse to review.)
- **The web search returns nothing useful.** Do we fall back to LLM-only? Do we tell the user? (Probably: tell the user, offer LLM-only as opt-in.)
- **Review takes longer than 10s.** What's the UX? (Streaming + skeleton states — see story #6.)
- **The user spams Review repeatedly.** Rate limiting per user.
- **The LLM hallucinates a citation.** We must verify URLs in retrieved set exist in our search results before exposing them.
- **The user draws something that isn't a system at all** (e.g., a flowchart for a recipe). The classifier should detect "not-a-system" and respond accordingly.
- **A board has 200+ shapes.** Does the canvas still feel smooth? Does the JSON payload to the LLM still fit in context?

## 7. Success Criteria

drawdock v1 is "done" when all three pass:

1. **The first-time-user test.** A developer friend who has never seen drawdock can sign up, draw a rough crawler, click Tidy, click Review, and read three suggestions that they agree are useful — all without me touching their keyboard.
2. **The latency test.** From Review-click to first streamed suggestion: under 3 seconds. From click to complete output: under 10 seconds on a normal connection.
3. **The interview test.** I can answer, on the spot, 15 randomly-chosen "why did you build it this way" questions without saying "I don't know" or "ChatGPT told me to." See `docs/interview-prep.md`.

If all three pass → ship. If any fails → that's the next milestone, not "polish the UI."

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Review suggestions feel generic or wrong | High | Project-killing | Strong RAG: real sources, narrow classifier categories first, expand later. Hide the feature behind a "beta" label so expectations are calibrated. |
| LLM API costs blow past free credits during dev | Medium | Annoying | Aggressive caching of classifications; use smaller model for classifier; rate-limit per user; track spend daily. |
| Web search API free tier is too restrictive | Medium | Forces architecture change | Evaluate Tavily, Brave, Exa at system design phase; pick one with most generous free tier. Have a fallback plan to pure-LLM if quota dies. |
| Canvas implementation is slower / harder than expected | Medium | Slips timeline | Use a proven library (tldraw, react-konva, or fabric.js) rather than raw HTML canvas. Decision in `docs/decisions/ADR-004.md`. |
| Scope creep ("wouldn't it be cool if…") kills the project | High | Project-killing | This PRD is the contract. New ideas go in `BACKLOG.md`. Not built in v1. No exceptions. |
| Auth/deploy/infra eats weeks I should be spending on the AI | High | Demo doesn't land | Use the most boring, most done-before stack for auth and deploy. Save creativity for the AI layer where it matters. |

## 9. Open Questions (resolved in System Design)

These become ADRs (Architecture Decision Records) — one per question — so each tradeoff is documented and defendable.

- **Q1.** Auth — magic link, email/password, or Google OAuth? → ADR-001
- **Q2.** Two-stage LLM (classify → critique) vs single call — confirmed via this PRD, formalized in ADR-002
- **Q3.** RAG over web search vs RAG over a curated knowledge base — ADR-003
- **Q4.** Canvas library — tldraw vs react-konva vs fabric.js vs raw HTML canvas → ADR-004
- **Q5.** Which web search API (Tavily / Brave / Exa / Serper) → ADR-005
- **Q6.** Database — Postgres vs SQLite vs MongoDB → ADR-006
- **Q7.** LLM provider — Anthropic vs OpenAI vs both → ADR-007
- **Q8.** Hosting — Vercel + Railway? Render? Fly.io? → ADR-008
- **Q9.** Streaming protocol — Server-Sent Events vs WebSockets vs polling → ADR-009

---

## Changelog

- **v0.2** — Renamed Clean-Up → Tidy and Suggest → Review. Switched primary user from "CS student" to "working developer." Made RAG the heart of Review. Cut real-time collaboration to v2 roadmap. Named the project drawdock.
- **v0.1** — Initial draft.
