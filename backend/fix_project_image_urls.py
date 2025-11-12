import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Učitaj PG_DATABASE_URL iz .env.migrate
load_dotenv(".env.migrate")

DATABASE_URL = os.getenv("PG_DATABASE_URL") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit("Nema PG_DATABASE_URL/DATABASE_URL u .env.migrate")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

print("Popravljam image_url u tabeli projects...")

with engine.connect() as conn:
    # 1) localhost bez https
    conn.execute(
        text("""
            UPDATE projects
            SET image_url = REPLACE(image_url, 'http://localhost:8000', '')
            WHERE image_url LIKE 'http://localhost:8000/%';
        """)
    )

    # 2) 127.0.0.1 bez https
    conn.execute(
        text("""
            UPDATE projects
            SET image_url = REPLACE(image_url, 'http://127.0.0.1:8000', '')
            WHERE image_url LIKE 'http://127.0.0.1:8000/%';
        """)
    )

    # 3) localhost sa https (za svaki slučaj)
    conn.execute(
        text("""
            UPDATE projects
            SET image_url = REPLACE(image_url, 'https://localhost:8000', '')
            WHERE image_url LIKE 'https://localhost:8000/%';
        """)
    )

    # 4) 127.0.0.1 sa https (za svaki slučaj)
    conn.execute(
        text("""
            UPDATE projects
            SET image_url = REPLACE(image_url, 'https://127.0.0.1:8000', '')
            WHERE image_url LIKE 'https://127.0.0.1:8000/%';
        """)
    )

    conn.commit()

print("✅ Gotovo. Sada image_url u projects treba da izgleda kao '/uploads/...'")
