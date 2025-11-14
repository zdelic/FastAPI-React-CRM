@echo off
cd /d C:\DATA\FastAPI-React-CRM\backend

C:\DATA\FastAPI-React-CRM\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001
