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

- Invalid API input returns `422` and is not persisted.
- Missing intake IDs return a clear `404`.
- An LLM failure returns `502`, but the original intake stays saved with
  `ai_status=failed`.
- Frontend messages do not display raw stack traces or backend internals.
- Logs exclude API keys, prompts, complete customer descriptions, raw model
  responses, and rejected values. Pydantic failures log only sanitized field,
  type, and message details.

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
