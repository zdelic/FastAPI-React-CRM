from pathlib import Path
from app.models import process
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine

from app.models.user import User
from app.models.project import Project
from app.models.structure import Bauteil, Stiege, Ebene, Top
from app.models.associations import user_project
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


# Uvozimo rute
from app.routes import auth, project, structure, process, gewerk, aktivitaet, task, generate_tasks, user

# Inicijalizacija aplikacije
app = FastAPI()


# Inicijalizacija baza podataka (kreira sve tablice)
Base.metadata.create_all(bind=engine)

# CORS konfiguracija za frontend
app.add_middleware(
    CORSMiddleware,    
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# absolutna putanja do backend/static
BASE_DIR = Path(__file__).resolve().parents[1]   # .../backend/app -> parents[1] = .../backend
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


