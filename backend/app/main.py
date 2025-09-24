from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import ORJSONResponse
from starlette.middleware.gzip import GZipMiddleware

from app.database import Base, engine
from app.models.user import User
from app.models.project import Project
from app.models.structure import Bauteil, Stiege, Ebene, Top
from app.models.associations import user_project
from app.server_timing import TimingMiddleware


# API rute
from app.routes import (
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

# Inicijalizacija aplikacije (brži JSON encoder)
app = FastAPI(default_response_class=ORJSONResponse)

# Kompresija odgovora (manji download velikih payload-a)
app.add_middleware(GZipMiddleware, minimum_size=1024)

# Inicijalizacija baze (kreira tablice ako ne postoje)
Base.metadata.create_all(bind=engine)

# CORS za frontend (prilagodi origin ako treba)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files (npr. /static/…)
BASE_DIR = Path(__file__).resolve().parents[1]  # .../backend
STATIC_DIR = BASE_DIR / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Uključivanje API ruta
app.include_router(auth.router)
app.include_router(project.router)
app.include_router(structure.router)
app.include_router(process.router)
app.include_router(gewerk.router)
app.include_router(aktivitaet.router)
app.include_router(task.router)
app.include_router(generate_tasks.router)
app.include_router(user.router)

app.add_middleware(TimingMiddleware)
