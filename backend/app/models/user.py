from sqlalchemy import Column, Integer, String, Table, ForeignKey
from app.database import Base
from sqlalchemy.orm import relationship
from app.models.associations import user_project


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="user")
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    name = Column(String, nullable=True)

    projects = relationship("Project", secondary=user_project, back_populates="users")
