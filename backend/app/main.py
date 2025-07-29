from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine

# Obavezno direktno uvezimo sve modele, uključujući user_project
from app.models.user import User
from app.models.project import Project
from app.models.structure import Bauteil, Stiege, Ebene, Top
from app.models.associations import user_project

# Uvozimo rute
from app.routes import auth, project, structure

# Inicijalizacija aplikacije
app = FastAPI()

# Inicijalizacija baza podataka (kreira sve tablice)
Base.metadata.create_all(bind=engine)

# Uključivanje API ruta
app.include_router(auth.router)
app.include_router(project.router)
app.include_router(structure.router)

# CORS konfiguracija za frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
