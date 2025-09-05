
from sqlalchemy import Column, Integer, String
from app.database import Base
from sqlalchemy.orm import relationship

class Gewerk(Base):
    __tablename__ = "gewerke"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    color = Column(String)  # HEX kod ili naziv boje

    aktivitaeten = relationship("Aktivitaet", back_populates="gewerk", cascade="all, delete-orphan")
    process_steps = relationship("ProcessStep", back_populates="gewerk")
