from sqlalchemy import Column, Integer, String, Table, Date
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.associations import user_project
from app.models.structure import Bauteil

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    start_date = Column(Date, nullable=True)
    image_url = Column(String, nullable=True)

    
    users = relationship("User", secondary=user_project, back_populates="projects")
    bauteile = relationship(
        "Bauteil",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
