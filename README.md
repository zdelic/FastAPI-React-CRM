# FastAPI + PostgreSQL / SQLite + React

Monorepo: `backend/` (FastAPI) , `frontend/` (React).

## Backend (FastAPI)
```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
