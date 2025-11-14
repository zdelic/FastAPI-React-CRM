# app/main.py
from pathlib import Path
import os

from fastapi import FastAPI, Depends
from fastapi.responses import ORJSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from sqlalchemy import text

from app.database import Base, engine
from app.deps import bind_user
from app import models  # Ovaj import mora povući sve modele da bi Base znao za tabele

# --- Kreiraj tabele u bazi (SQLite lokalno ili Postgres na Railway-u) ---
Base.metadata.create_all(bind=engine)

# --- DB URL za provjeru da li smo na Postgresu ili SQLite-u ---
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)


# --- AUTO RESET POSTGRES SEQUENCE-EVA NAKON MIGRACIJE ---
def reset_all_sequences():
    """
    Resetuje sequence-e za sve tabele koje imaju 'id' kolonu,
    ali samo ako radimo protiv PostgreSQL baze.
    """
    if not SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
        # Lokalno na SQLite-u ne radimo ništa
        return

    try:
        with engine.connect() as conn:
            # Nađi sve tabele koje imaju kolonu 'id'
            result = conn.execute(
                text(
                    "SELECT table_name "
                    "FROM information_schema.columns "
                    "WHERE column_name = 'id';"
                )
            )
            tables = [row[0] for row in result]

            for table_name in tables:
                print(f"Resetujem sequence za {table_name}...")
                conn.execute(
                    text(
                        f"""
                        SELECT setval(
                          pg_get_serial_sequence('"{table_name}"', 'id'),
                          COALESCE((SELECT MAX(id) FROM "{table_name}"), 0) + 1,
                          false
                        );
                        """
                    )
                )

            conn.commit()
            print("✅ Sequence reset kompletan.")
    except Exception as e:
        # Ako nešto krene po zlu, samo ispiši poruku u log,
        # ali nemoj srušiti aplikaciju
        print("⚠️ Greška pri resetovanju sequence-a:", e)


# Pokreni reset sequence-a odmah kad se app podigne (na Railway-u)
reset_all_sequences()


# --- App (NAPOMENA: kreiraj SAMO JEDNOM) ---
app = FastAPI(default_response_class=ORJSONResponse)

# --- Putanje (konzistentne) ---
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

STATIC_DIR = BASE_DIR.parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)

# --- Middleware ---
origins = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://172.20.1.25:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip može ostati POSLIJE CORS-a
app.add_middleware(GZipMiddleware, minimum_size=1024)

# --- Static mounts (MONTAJ SAMO JEDNOM) ---
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# --- Routers ---
from app.routes import (
    protocol,
    auth,
    project,
    structure,
    process,
    gewerk,
    aktivitaet,
    task,
    generate_tasks,
    user,
)

from app.routes.task_structure import router as structure_router

# Protokol (bez bindera)
app.include_router(protocol.router)

# Ostale rute – binder da puni request.state.user
app.include_router(project.router,        dependencies=[Depends(bind_user)])
app.include_router(structure.router,      dependencies=[Depends(bind_user)])
app.include_router(process.router,        dependencies=[Depends(bind_user)])
app.include_router(gewerk.router,         dependencies=[Depends(bind_user)])
app.include_router(aktivitaet.router,     dependencies=[Depends(bind_user)])
app.include_router(task.router,           dependencies=[Depends(bind_user)])
app.include_router(generate_tasks.router, dependencies=[Depends(bind_user)])
app.include_router(user.router,           dependencies=[Depends(bind_user)])

# Auth rute (bez bindera)
app.include_router(auth.router, tags=["auth"])

# Task structure rute
app.include_router(structure_router, dependencies=[Depends(bind_user)])

# Omogući import UPLOAD_DIR iz drugih modula
__all__ = ["app", "UPLOAD_DIR"]
