# AI Triage Tool

A small internal tool for capturing inbound project requests and enriching them
with a structured AI triage result. It uses FastAPI, React/Vite,
SQLite/SQLAlchemy, and the OpenAI API.

## A. How to run

### Prerequisites

- Python 3.8 or newer
- Node.js 20.19 or newer
- npm
- An OpenAI API key

The commands below use Windows PowerShell and assume the terminal starts in the
repository root.

### Install the backend

Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install the application dependencies:

```powershell
python -m pip install -r backend\requirements.txt
```

To run the test suite later, install the development dependencies instead:

```powershell
python -m pip install -r backend\requirements-dev.txt
```

### Install the frontend

```powershell
cd frontend
npm install
cd ..
```

### Configure environment variables

Create `.env` in the repository root:

```dotenv
OPENAI_API_KEY=your-api-key
LLM_MODEL=your-structured-output-capable-model
```

- `OPENAI_API_KEY` authenticates server-side OpenAI requests. Never expose it
  through the frontend or commit `.env`.
- `LLM_MODEL` selects the model used for intake analysis. It must support the
  structured output requested by the service.

### Start the backend

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --env-file .env --log-level info
```

The backend initializes or upgrades `backend/triage.db` during startup.

Backend URLs:

- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json

### Start the frontend

In a second terminal:

```powershell
cd frontend
npm run dev
```

Open http://localhost:5173.

### Run on macOS

From the repository root, create the Python environment and install backend
dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
```

Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

Create `.env` in the repository root:

```dotenv
OPENAI_API_KEY=your-api-key
LLM_MODEL=your-structured-output-capable-model
```

Start the backend:

```bash
.venv/bin/python -m uvicorn app.main:app --app-dir backend --reload --env-file .env --log-level info
```

In a second terminal, start the frontend:

```bash
cd frontend
npm run dev
```

Open http://localhost:5173. Swagger UI is available at
http://localhost:8000/docs.

## B. What was built

### Product overview

- Capture structured project requests with required project, budget, timeline,
  and industry information.
- Analyze every new request synchronously with an LLM to produce a summary,
  exactly three tags, and a risk checklist.
- Review persisted requests in a newest-first list and open a durable detail
  page containing the original request and its AI result.

### Components

- **FastAPI API:** create, list, and detail endpoints under `/api/intakes`.
- **SQLAlchemy and SQLite:** local persistence for original intake fields, AI
  output, AI status, and backend-generated timestamps.
- **AI service layer:** an isolated OpenAI client using Pydantic structured
  output validation.
- **React/Vite frontend:** list, create, and detail pages using React Router.
- **Workflow observability:** standard Python logs for persistence, AI status,
  analysis result metadata, failures, and total duration.

### Implemented flow

1. The user opens the create form and enters all required fields.
2. Budget min/max must be non-negative, and max must be at least min.
3. Timeline min/max must be non-negative, max must be at least min, and the
   unit must be weeks, months, or years.
4. The frontend validates fields, disables submission, and displays
   `Saving intake and running AI analysis...`.
5. The backend validates and persists the original intake first with
   `ai_status=pending`.
6. The synchronous AI service analyzes the persisted intake.
7. On success, the backend stores the summary, three tags, risks, and changes
   the status to `complete`.
8. The frontend navigates to the durable detail page. The intake also appears
   at the top of the newest-first list.

### AI feature behavior

The AI service returns a validated structure containing:

- A two-to-three-sentence summary
- Exactly three unique, concise tags
- A non-empty risk checklist

If the model output violates this contract, the validation fails. The original
intake remains persisted, its AI fields remain empty, and `ai_status` becomes
`failed`. No retries or background processing are currently implemented.

### UX states

- List loading, empty, error, and populated states
- Create-form field-level required and range validation
- Disabled form controls and explicit saving/analysis progress copy
- Safe creation error messaging
- Saved-but-AI-failed recovery with a link to the persisted intake
- Detail loading and error states
- Clear pending, complete, and failed AI status badges
- Complete summary, tag, and risk-checklist presentation

### Error handling

The application distinguishes between three failure classes:

1. **Invalid user input**
2. **LLM/provider failure**
3. **Invalid LLM output**

This keeps failures explicit and prevents AI issues from corrupting or deleting
the original customer request.

#### Invalid user input

- Invalid API input returns `422`.
- Invalid requests are rejected before persistence.
- Frontend validation catches required fields and invalid budget/timeline ranges
  before submission where possible.
- Backend validation remains authoritative and independently enforces the same
  constraints.
- Missing intake IDs return `404`.

#### LLM/provider failure

The original intake is persisted **before** AI enrichment begins.

If the OpenAI request fails because of a timeout, provider error, authentication
issue, network failure, or another model-call exception:

1. The original intake remains persisted.
2. `ai_status` transitions from `pending` to `failed`.
3. AI output fields remain empty rather than storing partial or misleading data.
4. A sanitized failure reason is recorded for debugging.
5. The API returns a failure response that allows the frontend to distinguish
   "intake was not saved" from "intake was saved but AI analysis failed".
6. The frontend tells the user that the request was saved and provides access
   to the persisted intake.

This behavior is intentional: the customer-submitted intake is the system of
record, while AI analysis is treated as enrichment. An external model failure
should therefore not cause valid user data to be lost.

No automatic retries are currently performed. For this timeboxed local
implementation, an explicit failed state was preferred over hidden retry
behavior. A production version would likely add bounded retries for transient
provider failures and/or move enrichment to a background job.

#### Invalid LLM output

A successful HTTP/model call is not considered sufficient on its own.

The AI response is validated against the product contract:

- summary must contain two to three sentences
- exactly three unique tags must be returned
- the risk checklist must be non-empty
- the response must conform to the structured Pydantic output model

If the model returns syntactically valid structured output that violates these
rules:

1. The enrichment is rejected.
2. No malformed AI fields are persisted.
3. The original intake remains saved.
4. `ai_status` becomes `failed`.
5. Sanitized validation details are logged.

This separates **provider success** from **product-valid AI output**.

#### Logging and observability

Workflow logs are emitted from the backend for the critical create and AI
enrichment path.

Successful requests include events such as:

- `intake_persisted`
- `ai_analysis_started`
- `ai_analysis_returned`
- `ai_status=complete`
- `duration_ms`

Failed requests include:

- `ai_analysis_failed`
- `ai_status=failed`
- sanitized validation or exception metadata

Logs intentionally exclude:

- API keys
- full prompts
- complete customer descriptions
- raw model responses
- rejected sensitive values
- stack traces in user-facing responses

The goal is to make the AI call diagnosable without unnecessarily duplicating
customer content into logs.

#### User-facing behavior

The frontend presents different messages depending on the failure:

- **Validation failure:** the user is shown field-level guidance and submission
  is blocked.
- **Save/API failure:** the user is told that the intake could not be saved.
- **AI failure after save:** the user is told that the intake was saved but AI
  analysis could not be completed.
- **Detail failure:** the user sees a clear error state rather than raw backend
  output.

Raw exception messages, provider payloads, and stack traces are never shown
directly to the user.

## C. Verification

### Automated verification

The backend suite covers:

- Pydantic create/read schemas and required fields
- Negative and reversed budget/timeline ranges
- Allowed timeline units
- Create, newest-first list, detail, empty-list, `404`, and `422` API behavior
- Successful AI persistence and failed-AI persistence
- Sanitized workflow logs
- Structured AI output validation and environment configuration

Run all backend tests:

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest tests
```

Run them with coverage:

```powershell
..\.venv\Scripts\python.exe -m pytest tests --cov=app --cov-report=term-missing
```

Run the focused API or AI service suites:

```powershell
..\.venv\Scripts\python.exe -m pytest tests\test_intakes_api.py -v
..\.venv\Scripts\python.exe -m pytest tests\test_ai_triage.py -v
```

Verify the frontend production build:

```powershell
cd ..\frontend
npm run build
```

### Manual verification checklist

With both applications running:

- [ ] Open http://localhost:5173 and confirm the empty or populated intake list.
- [ ] Open the create form and submit it empty; confirm field-level required
      messages appear and focus moves to the first invalid field.
- [ ] Enter a negative budget or timeline value and confirm the inline error.
- [ ] Enter a max below its min and confirm submission is blocked.
- [ ] Submit a valid intake and confirm the saving/analysis state disables the
      form and submit button.
- [ ] Confirm successful creation navigates to the detail page.
- [ ] Confirm the original fields, friendly budget/timeline ranges, AI summary,
      exactly three tags, risks, and `complete` status are visible.
- [ ] Return to the list and confirm the new intake appears first.
- [ ] Refresh the detail URL and confirm the same persisted data remains.
- [ ] If AI analysis fails, confirm the UI says the intake was saved and the
      detail page shows `failed` without incorrectly populated AI fields.

Inspect the local database without modifying it:

```powershell
cd ..
.\.venv\Scripts\python.exe backend\scripts\inspect_db.py --limit 5
```

Workflow logs appear in the backend terminal. Successful creation includes
`intake_persisted`, `ai_analysis_returned`, `ai_status=complete`, and
`duration_ms`; failures include `ai_analysis_failed` and sanitized validation
details when applicable.
