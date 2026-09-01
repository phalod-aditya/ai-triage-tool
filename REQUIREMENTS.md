Build a small internal tool that helps triage inbound projects requests quickly and consistently.

## Required Stack

- FASTAPI backend
- React/Vite Front end
- SQLite Database
- sqlalchemy or sqlmodel

## Core requirements

1. An intake MUST include:

- title
- description
- budget range
- timeline
- industry
- created_at timestamp

1. Persist intakes to a local database
2. Frontend must include:

- intake list view 
- intake detail view
- create intake form

1. On intake creation, call an LLM to generate:

- a 2-3 sentences summary
- exactly 3 tags
- a risk checklist as bullets

1. Store the AI outputs and show them in the UI
2. include this for UX States:

- loading state
- empty state
- error state (at least one clear user-visible error state)

## Evaluation Priorities

- coherent end to end slice
- UX empathy and product sense
- verification mindset
- judgement and prioritization of tasks

## Do NOT optimize for:

- pixel perfect UI
- unnecessary framework complexity

## Optional only

- Docker
- Typescript
- background/aysnc AI processing
- dashboards/csv exports
- better ai readability

Keep the intentionally small and don't add unnecessary features unless asked