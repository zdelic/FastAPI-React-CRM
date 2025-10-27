from passlib.hash import bcrypt
from app.database import SessionLocal

# ⬇️ VAŽNO: registruj modele koje User/Project referenciraju
from app.models import project as _project      # sadrži class Project
from app.models import associations as _assoc   # user_project tabela (opciono)

from app.models.user import User


def run():
    db = SessionLocal()
    try:
        email = "test@test.at"
        pwd   = "1234"   # promijeni poslije

        exists = db.query(User).filter_by(email=email).first()
        if exists:
            print(f"Već postoji: {email}")
            return

        u = User(email=email, hashed_password=bcrypt.hash(pwd),
                 role="admin", name="Admin")
        db.add(u)
        db.commit()
        print(f"Kreiran admin: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
