# backend/migrate_sqlite_to_postgres.py

import os
from dotenv import load_dotenv

from sqlalchemy import create_engine, select, insert
from sqlalchemy.orm import sessionmaker

# 1) Učitaj .env.migrate da dobijemo PG_DATABASE_URL
load_dotenv(".env.migrate")

# 2) Uvezi Base i SVE MODELE iz aplikacije
from app.database import Base

from app.models.user import User
from app.models.project import Project
from app.models.structure import Bauteil, Stiege, Ebene, Top
from app.models.task import Task
from app.models.gewerk import Gewerk
from app.models.aktivitaet import Aktivitaet
from app.models.process import ProcessModel, ProcessStep
from app.models.protocol import ProtocolEntry
from app.models.associations import user_project


# 3) Definiši konekcije

# Lokalni SQLite fajl (tvoj stari test.db u backend folderu)
SQLITE_URL = "sqlite:///./test.db"

# Postgres URL iz .env.migrate
POSTGRES_URL = os.getenv("PG_DATABASE_URL")
if not POSTGRES_URL:
    raise RuntimeError("PG_DATABASE_URL nije definisan u .env.migrate")

# Engine-i za SQLite i Postgres
sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
pg_engine = create_engine(POSTGRES_URL)

SQLiteSession = sessionmaker(bind=sqlite_engine)
PGSession = sessionmaker(bind=pg_engine)


def copy_table(sqlite_session, pg_session, model):
    """Kopira ORM model (klasu) iz SQLite u Postgres."""
    rows = sqlite_session.query(model).all()
    print(f"Kopiram {len(rows)} redova iz tabele {model.__tablename__}...")

    for row in rows:
        data = row.__dict__.copy()
        data.pop("_sa_instance_state", None)  # SQLAlchemy interno polje

        obj = model(**data)
        pg_session.merge(obj)  # upsert po primarnom ključu

    pg_session.commit()
    print(f"Gotovo: {model.__tablename__}")


def copy_association_table():
    """Kopira many-to-many tabelu user_project koristeći SQLAlchemy Core."""
    with sqlite_engine.connect() as src_conn, pg_engine.connect() as dst_conn:
        result = src_conn.execute(select(user_project))
        rows = result.fetchall()

        if not rows:
            print("Nema redova u user_project, preskačem.")
            return

        print(f"Kopiram {len(rows)} redova iz tabele {user_project.name}...")

        payload = [dict(r._mapping) for r in rows]
        dst_conn.execute(insert(user_project), payload)
        dst_conn.commit()

        print(f"Gotovo: {user_project.name}")


def main():
    print("Kreiram tabele u Postgresu (ako treba)...")
    Base.metadata.create_all(bind=pg_engine)

    sqlite_db = SQLiteSession()
    pg_db = PGSession()

    try:
        # Redoslijed je bitan zbog FK veza:

        # 1. Gewerk i Aktivitaet
        copy_table(sqlite_db, pg_db, Gewerk)
        copy_table(sqlite_db, pg_db, Aktivitaet)

        # 2. Procesni modeli i koraci
        copy_table(sqlite_db, pg_db, ProcessModel)
        copy_table(sqlite_db, pg_db, ProcessStep)

        # 3. Useri i projekti
        copy_table(sqlite_db, pg_db, User)
        copy_table(sqlite_db, pg_db, Project)

        # 4. many-to-many user_project
        copy_association_table()

        # 5. Struktura zgrade
        copy_table(sqlite_db, pg_db, Bauteil)
        copy_table(sqlite_db, pg_db, Stiege)
        copy_table(sqlite_db, pg_db, Ebene)
        copy_table(sqlite_db, pg_db, Top)

        # 6. Taskovi
        copy_table(sqlite_db, pg_db, Task)

        # 7. Protocol (logovi)
        copy_table(sqlite_db, pg_db, ProtocolEntry)

        print("✅ Migracija završena bez grešaka.")
    finally:
        sqlite_db.close()
        pg_db.close()


if __name__ == "__main__":
    main()
