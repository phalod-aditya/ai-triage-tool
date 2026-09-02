# AI Triage Tool — Decisions

## Plan

- Build the smallest runnable **FastAPI + React/Vite + SQLite** foundation first, then add one coherent layer at a time: persistence, API, frontend workflow, and AI enrichment.
- Get the core **create → list → detail** flow working and durable before introducing the LLM, so the product remains useful even if AI is unavailable.
- Add AI behind an isolated service boundary, then finish with explicit failure handling, required UX states, observability, focused verification, and documentation.

## Key decisions and why

- **Persist the intake before calling the LLM.** The customer-submitted request is the source of truth; AI is enrichment. If the model provider times out, returns invalid output, or is unavailable, the original intake should not be lost. This also gives the system explicit `pending`, `complete`, and `failed` AI states.

- **Keep LLM integration behind a dedicated service layer.** API routes remain focused on request handling and orchestration, while provider-specific prompting, structured output, and AI validation live behind one boundary. This makes the AI behavior easier to test and replace independently.

- **Use structured LLM output and validate it before persistence.** The model returns a defined summary, exactly three tags, and a risk list. Structured output reduces parsing ambiguity, while application-level validation catches responses that are structurally valid but do not satisfy the product contract.

- **Keep AI enrichment synchronous for this timeboxed build.** A synchronous request keeps the implementation and user flow simple. A queue, worker, polling mechanism, or background-job system would add significant complexity before the core workflow demonstrated a need for it.

- **Use structured budget fields rather than free-form text.** Minimum and maximum budget values allow clearer validation and more consistent presentation. Since this changed during development, I used a lightweight compatibility path for the local SQLite schema rather than introducing a full migration framework.

## How I verified it works

- I manually exercised the full product flow with real persisted data: **create an intake → AI enrichment → list → detail → browser refresh**, verifying that both the original intake and AI results survive reloads.

- I tested both **successful and failed LLM paths**. A successful call persists the summary, three tags, risks, timing metadata, and `complete` status. A failed call preserves the original intake, records `failed`, and exposes a sanitized user-facing error rather than losing the request.

- I added **44 backend tests** covering schema validation, budget/range validation, API behavior, persistence, newest-first ordering, AI success and failure behavior, and sanitized logging. The measured backend coverage was **93%**.

- I repeatedly ran the Vite production build and manually checked required UX behavior including loading, empty, validation/error, complete AI analysis, and saved-but-AI-failed states.

## Deliberate tradeoffs

- **No retries or background processing.** I preferred an explicit failed state over hidden automatic retries for the take-home. In production, transient failures would likely warrant bounded retries and asynchronous execution.

- **No update, delete, search, filtering, authentication, dashboard, or export functionality.** These could all be useful later, but none were necessary to prove the required intake-triage workflow.

- **No full migration framework.** For a single local SQLite application, a lightweight compatibility initializer was enough. I would use a real migration tool such as Alembic before evolving this into a shared or production database.

- **No dedicated LLM tracing platform.** I used application logs plus persisted AI status/timing metadata. That provides enough visibility for a single model interaction without introducing LangChain, LangSmith, OpenTelemetry infrastructure, or another operational dependency.

- **Strict AI-output validation.** I chose to surface malformed model output as a failed enrichment rather than silently accepting incomplete or incorrect AI results. This favors predictable application behavior over maximizing apparent success rate.

## What I learned / what I would do differently

- **Model structured business fields earlier.** Budget and timeline started closer to the brief's free-form representation, but the UI benefited from stronger structure. If starting again, I would decide those field semantics before creating the database schema.

- **Structured output solves syntax, not quality.** A model can return valid JSON while still violating product expectations, such as producing the wrong number of tags or a poor summary. The application still needs explicit semantic validation.

- **Design the AI failure state at the same time as the happy path.** Once the intake was treated as durable and AI as enrichment, error handling, UI messaging, testing, and observability all became much clearer.

- **Introduce frontend tests earlier.** Backend verification is strong, but automated component tests would make loading, validation, failure, and rendering states easier to verify repeatedly.

## If I had one more day

- **Move AI enrichment to a background job.** Intake creation could return immediately, while the UI represents `pending` and updates when analysis completes. This would remove LLM latency from the core save operation.

- **Add a user-triggered `Retry AI analysis` action.** Failed intakes could be re-enriched explicitly and idempotently rather than relying on hidden automatic retries.

- **Strengthen the API contract for partial success.** Return structured information such as `intake_id`, `ai_status`, and a machine-readable failure reason so the frontend never needs to infer state from error text.

- **Add focused React tests.** I would cover required-field validation, loading, empty state, successful analysis, saved-but-AI-failed behavior, and detail rendering.

- **Add basic CI.** Run backend tests and the frontend production build automatically on every change.