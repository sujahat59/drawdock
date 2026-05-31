# ADR-007 Amendment A — Classifier Design: Fix C + User Confirmation

**Status:** Accepted
**Date:** 2026-05-31
**Amends:** ADR-007 (LLM Provider and Access Pattern)

---

## What triggered this amendment

Two things happened during ADR-005 discussion that changed the classifier design:

**1.** The fixed 7-category list (`web-crawler`, `chat-app`, `rest-api`, etc.) was found to be broken — most real developers draw systems that don't fit predefined buckets. A Netflix clone, Telegram bot, Chrome extension, or custom CLI tool all hit `"unknown"` and the pipeline fails.

**2.** A question surfaced: *why not just ask the user to label their own system instead of running a classifier at all?* This was partially right — the concern was real — but replacing the classifier with a user form inverts the product's value. drawdock is supposed to help developers understand their architecture, not make them name it upfront.

The resolution is Fix C.

## The Fix C Classifier

**Old classifier job:** pick one label from a fixed list of 7.

**New classifier job:** describe what the system does, and write a web search query for it.

**Old output:**
```
"web-crawler"
```

**New output:**
```json
{
  "description": "A Telegram bot that receives user messages and responds via the Telegram API",
  "search_query": "Telegram bot architecture best practices webhook polling Node.js"
}
```

The `search_query` field goes directly to Tavily. No intermediate assembly step. No fixed categories. Works for any system a developer can draw.

## Why Claude writes the query instead of us

Fix B (tags + description, we assemble the query) was considered. Rejected because assembling a good search query from tags is a language task — Claude is better at it than pattern-matching code. Asking Claude to write the query directly produces more natural, higher-quality searches and removes assembly logic from our codebase.

## Validation before Tavily

The classifier output is validated before the search runs:
- `search_query` must be 4–20 words
- Must contain at least one recognizable technical term
- Must not be a generic phrase ("system architecture", "software design")

If validation fails → user is prompted to add labels to their shapes.

## The user confirmation step

After the classifier runs, the UI shows:

> *"I think you drew: [description from classifier]. Sound right?"*

Options: **Yes** → proceed to Tavily + critique / **No** → user corrects the description

With Fix C, the confirmation shows a full human-readable sentence instead of a category label. This is more informative and more correctable. The user can say "actually it's a Discord bot, not Telegram" and we update both the description and search query before the expensive Sonnet call runs.

This step costs nothing in API calls and recovers gracefully from the ~10% of cases where the classifier misreads a vague diagram.

## What did NOT change

- Still Haiku 4.5 for the classifier — cheap, fast, right for the job
- Still two LLM calls total
- Still Vercel AI SDK as the abstraction layer
- The critique prompt and Sonnet 4.6 are unaffected

## Interview Defense

> *"The classifier uses what I call Fix C — instead of picking from a fixed category list, it outputs two things: a plain-English description of what the user drew, and a web search query tuned to find how real engineers build that kind of system. I started with a fixed list of 7 categories but scrapped it because real developers draw systems that don't fit predefined buckets — a Telegram bot, a Chrome extension, a recommendation engine. Fix C means the classifier handles anything. We show the description to the user before running the critique so they can correct it if Claude misread the diagram — that confirmation step costs nothing in API calls but saves wasting a Sonnet call on a wrong classification."*

## Related ADRs

- ADR-002 (pipeline) — pipeline shape is built around this classifier design
- ADR-005 (Tavily) — receives the search_query field from Fix C
