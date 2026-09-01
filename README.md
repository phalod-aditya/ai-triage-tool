# AI Triage Tool

Minimal FastAPI, React/Vite, and SQLite/SQLAlchemy scaffold for the project
intake triage tool described in `REQUIREMENTS.md`.

## Start the backend

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn app.main:app --reload --app-dir backend
```

The API is available at `http://localhost:8000`. Its root endpoint returns a
small status response, and interactive API docs are at `http://localhost:8000/docs`.

## Start the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The Vite development server is available at `http://localhost:5173`.
