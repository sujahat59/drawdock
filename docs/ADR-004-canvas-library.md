# ADR-004 — Canvas Library

**Status:** Accepted
**Date:** 2026-05-30
**Deciders:** [You]

---

## Context

drawdock is a whiteboard-first product. The canvas is the entire user surface — everything else (Tidy, Review, save/load, sharing) operates on or around what the user draws.

Beyond standard whiteboard requirements (draw shapes, click-drag, select, resize, undo), drawdock has one non-standard requirement: the canvas state must be cleanly extractable as structured data that an LLM can reason over, and the LLM's output must be cleanly applicable back to the canvas. This bidirectional canvas-LLM bridge is the core mechanism behind the Review feature.

The canvas library choice therefore affects:
- Time spent on drawing-app plumbing vs. time spent on AI integration
- The shape of the canvas → LLM → canvas pipeline
- How much customization is possible without learning library internals
- Bundle size, performance, and feel
- The story we tell about this project in interviews

This decision is foundational: every later technical choice (state management, persistence, streaming, etc.) sits on top of it.

## Decision

**Use tldraw as the canvas library, with `@tldraw/ai` as the LLM integration layer.**

## Options Considered

### Option A — Raw HTML `<canvas>` element

Build everything from primitives. No drawing library.

- **Pros:** Total control. Zero dependencies. Deepest learning.
- **Cons:** 2–3 weeks of work reimplementing solved problems (hit-detection on rotated shapes, resize handles, undo stack, JSON serialization). Time spent here is time not spent on the AI layer, which is the actual product.
- **Rejected:** the canvas isn't where this project's engineering should live.

### Option B — Fabric.js

A mature object-oriented canvas library with built-in JSON serialization via `canvas.toJSON()`.

- **Pros:** Stable, widely used, lots of documentation, `toJSON` works out of the box.
- **Cons:** No official React bindings — has to be glued into React with refs and `useEffect`. Imperative API feels old in a modern React codebase. No AI-specific integration layer; we'd build the canvas-LLM bridge ourselves.
- **Rejected:** the React friction is a daily tax for the duration of the project.

### Option C — react-konva

A React wrapper around the Konva 2D canvas library. Shapes are React components: `<Rect x={50} y={50} fill="red" />`.

- **Pros:** Idiomatic React. Performant. Active maintenance. Full ownership of the schema we design — including the JSON representation sent to the LLM.
- **Cons:** No AI integration layer; we build canvas-LLM bridge from scratch. More upfront work on standard whiteboard features (toolbar, selection UX, undo). Less time on the differentiating AI work.
- **Rejected:** the upfront investment is large and the AI bridge would replicate what `@tldraw/ai` already provides.

### Option D — tldraw + `@tldraw/ai` (chosen)

tldraw is a batteries-included React whiteboard SDK. `@tldraw/ai` is an official companion package that provides a `transformPrompt` / `transformChange` pipeline for sending canvas state to an LLM and applying generated changes back to the canvas.

- **Pros:**
  - Full whiteboard (shapes, arrows, text, freehand, selection, undo) working in ~1 day.
  - `@tldraw/ai` provides the exact bidirectional canvas-LLM bridge pattern Review needs — built and battle-tested by the library's authors.
  - The interesting engineering work (RAG, classification, prompt design, streaming) sits at a higher layer where we can spend our time well.
  - Industry-aligned: `@tldraw/ai` is the pattern real production teams use for canvas-AI integration.
- **Cons:**
  - tldraw is opinionated — customizing past surface level (e.g. adding custom shapes, replacing the toolbar, building Tidy) requires learning tldraw's internals.
  - Bundle is heavy (~500 KB).
  - "Made with tldraw" watermark required for non-commercial use under the tldraw SDK license. Acceptable for a portfolio project; would require a business license for commercial deployment.
  - Less canvas-internals learning compared to react-konva or raw canvas.

## Rationale

drawdock's value lives in the AI layer, not the canvas layer. A user opening drawdock is paying attention to Review's output, not the polish of the rectangle tool. Time spent reinventing canvas drawing is time stolen from the work that makes the product interesting.

`@tldraw/ai` shifts the project's engineering surface upward. Instead of building "canvas state → JSON → LLM → JSON → canvas mutations" from scratch, we get that pipeline as primitives and spend our cycles on:
- Designing the prompt-extraction transforms (what part of the canvas does Review see?)
- Designing the change-application transforms (how do suggestions appear on the canvas?)
- The RAG architecture (classifier, retrieval, generation)
- Prompt engineering and streaming UX

These are the skills that matter for the kind of internship drawdock is meant to unlock. Building a hit-detection algorithm in week 1 does not move that needle.

The cost — less canvas-internals knowledge, opinionated library, watermark — is acceptable given the scope and goals.

## Consequences

### Positive
- Working whiteboard usable from day 1; AI work can begin in week 1.
- Canvas-LLM integration follows an established pattern with documentation and an example template.
- Total project surface shrinks; we own less code, which makes everything more maintainable.

### Negative
- We are coupled to tldraw's release cycle and breaking changes.
- Heavy customizations (custom shape types for Context Layer, Tidy as a non-trivial layout pass) will require studying tldraw's internals — adds friction in weeks 4–5.
- "Made with tldraw" watermark visible on canvas in v1.
- We don't build canvas math ourselves, so that's not part of our interview material.

### Mitigations
- Lock to a specific tldraw and `@tldraw/ai` version in `package.json` and update deliberately, not automatically.
- Budget time in week 3 to read tldraw's docs deeply before attempting customization.
- Watermark policy: keep it visible, mention it in the README as an honest note about the SDK's license terms.

## Interview Defense

> *"I chose tldraw plus @tldraw/ai because the canvas isn't where I wanted my engineering time to go — the AI integration was. tldraw gave me a production-quality whiteboard in a day, and @tldraw/ai provided the exact bidirectional pipeline pattern I needed for Review: canvas state out as structured prompt input, AI-generated changes back as canvas mutations. That let me spend the bulk of my time on the RAG pipeline, prompt design, and streaming UX — which is the actual product. I considered react-konva, which would have given me more ownership of the canvas internals, but I'd have been reimplementing the canvas-LLM bridge that @tldraw/ai already provides, and the upfront cost of building basic whiteboard features would have eaten into the AI work. The tradeoff is that I don't have canvas-math depth in this project; I'd build that elsewhere if I wanted that specific skill on display."*

## Related ADRs

- ADR-002 (two-stage LLM pipeline) — depends on canvas → JSON extraction provided here
- ADR-003 (RAG vs. training-data-only) — depends on this canvas-LLM bridge
- ADR-009 (streaming protocol) — affects how `@tldraw/ai`'s `stream` method is wired

## References

- tldraw SDK: https://tldraw.dev
- @tldraw/ai on npm: https://www.npmjs.com/package/@tldraw/ai
- @tldraw/ai starter template: https://github.com/tldraw/ai-template
- tldraw SDK license (watermark requirement): https://tldraw.dev
