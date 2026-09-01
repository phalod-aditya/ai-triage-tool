# AI Triage Tool — Decisions

## Plan

- Build the smallest runnable FastAPI, React/Vite, and SQLite foundation first,
  then add one coherent layer at a time: persistence, API, frontend flow, and AI.
- Implement the create → newest-first list → durable detail flow before adding
  AI so the core product remained useful and testable independently.
- Isolate the LLM service, then integrate it with explicit status transitions,
  failure handling, observability, UX states, tests, and documentation.

## Key decisions and rationale

- Persist the original intake before calling the LLM. This protects customer
  requests from provider or validation failures and makes `pending`, `complete`,
  and `failed` durable states.
- Keep OpenAI access in a service layer and use a Pydantic structured-output
  model. Routes stay small, and summary, tag-count, and risk-list contracts are
  enforced at one boundary.
- Keep AI processing synchronous for this small local tool. It provides a clear
  implementation and UX without introducing a queue, worker, or polling model
  before those are necessary.
- Use lightweight SQLite startup compatibility migrations for evolving budget
  and timeline fields. This preserved existing local records without adding a
  migration framework to an intentionally small application.

## Verification

- Built and started both applications, exercised real create/list/detail and
  refresh flows, and made live OpenAI calls to confirm structured enrichment and
  persistence.
- Added 44 backend tests covering schemas, range validation, API behavior,
  newest-first ordering, AI success/failure persistence, and sanitized logs;
  the latest measured backend coverage was 93%.
- Repeatedly ran the Vite production build and manually checked persisted
  complete and failed records, SQLite columns, friendly range formatters, and
  user-visible error copy.

## Deliberate trade-offs

- No retries, background jobs, queues, or provider tracing were added. They
  would increase operational complexity beyond the current synchronous scope.
- No update, delete, search, filtering, authentication, dashboards, or exports
  were added because they were not required for the core triage slice.
- No Alembic migration setup was introduced. A small compatibility initializer
  was sufficient for one local SQLite database, though it is not a long-term
  production migration strategy.
- AI output validation is intentionally strict. Invalid output marks enrichment
  failed instead of silently storing malformed tags, summaries, or risks.

## Lessons and what to do differently

- Define structured budget and timeline fields at the start. Evolving from free
  text required compatibility columns and startup schema changes.
- Treat valid JSON and valid product output as different guarantees. Structured
  output enforces shape, while sentence-count and quality rules still need
  explicit validation and observable failures.
- Add frontend component tests earlier. Backend coverage is strong, but browser
  availability limited repeatable visual verification of every UX state.

## If we had one more day

- Add focused React tests for field-level validation, loading, saved-but-AI-
  failed recovery, empty lists, and complete detail rendering.
- Return a structured failure body containing `intake_id` and `ai_status` so the
  frontend does not need to extract the saved ID from error copy.
- Add an explicit user-triggered “Retry AI analysis” action for failed intakes,
  with idempotent persistence and tests, rather than automatic hidden retries.
- Add a small CI workflow that runs backend tests and the frontend production
  build on every change.
