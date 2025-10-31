🏗️ FastAPI + React CRM

A full-stack CRM web application built with FastAPI (Python) for the
backend and React + TypeScript (Vite) for the frontend.
This project allows you to manage projects, structures, tasks, and
progress statistics through a modern and responsive interface.

------------------------------------------------------------------------

🚀 Quick Start

1️⃣ Clone the repository

    git clone https://github.com/zdelic/FastAPI-React-CRM.git
    cd FastAPI-React-CRM

------------------------------------------------------------------------

2️⃣ Backend Setup (FastAPI)

📁 Navigate to the backend folder

    cd backend

🐍 Create and activate a virtual environment (PowerShell)

    python -m venv venv
    .env\Scripts\Activate.ps1

📦 Install dependencies

    pip install -r requirements.txt

▶️ Run the backend server

    uvicorn app.main:app --reload

Backend will be available at:
👉 http://127.0.0.1:8000

API documentation:
📄 http://127.0.0.1:8000/docs

------------------------------------------------------------------------

3️⃣ Frontend Setup (React + Vite)

📁 Navigate to the frontend folder

    cd ../frontend

📦 Install dependencies

    npm install

▶️ Run the development server

    npm run dev

Frontend will be available at:
👉 http://localhost:3000

------------------------------------------------------------------------

🗃️ Database Configuration

-   Default database: SQLite
-   Configuration file: backend/app/database.py
-   When running the backend for the first time, a test.db file will be
    automatically created in the backend folder.

To start with a clean database:

    Remove-Item test.db

(or rm test.db on Linux/Mac)

------------------------------------------------------------------------

🔑 Default Admin Login

If you used the included seed_admin.py script, you can log in with:

    Email: admin@example.com
    Password: admin

------------------------------------------------------------------------

🧱 Project Structure

    FastAPI-React-CRM/
    │
    ├── backend/
    │   ├── app/
    │   │   ├── routes/
    │   │   ├── models/
    │   │   ├── schemas/
    │   │   └── main.py
    │   ├── requirements.txt
    │   └── test.db
    │
    ├── frontend/
    │   ├── src/
    │   ├── package.json
    │   └── vite.config.ts
    │
    └── README.md

------------------------------------------------------------------------

🧰 Main Technologies

  Layer      Technology
  ---------- ------------------------------------------
  Backend    FastAPI, SQLAlchemy, Pydantic
  Frontend   React, TypeScript, Vite, TailwindCSS
  Database   SQLite (default) / PostgreSQL (optional)

------------------------------------------------------------------------

👤 Author

Zlatan Delić
🔗 https://github.com/zdelic

------------------------------------------------------------------------

📜 License

MIT License © 2025 Zlatan Delić
