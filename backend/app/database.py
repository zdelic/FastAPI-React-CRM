import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

Base = declarative_base()

DATABASE_URL = os.getenv("DATABASE_URL")  # Railway postavlja ovo
if DATABASE_URL:
    # Railway/Prod — često treba sslmode=require
    # Ako koristiš psycopg2: postavi "?sslmode=require" ako nije već tu
    if "sslmode" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL + "?sslmode=require"
else:
    # Lokalno: SQLite
    DATABASE_URL = "sqlite:///./test.db"

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()