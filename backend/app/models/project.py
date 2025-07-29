from sqlalchemy import Column, Integer, String, Table
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.associations import user_project

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)

    users = relationship("User", secondary=user_project, back_populates="projects")
