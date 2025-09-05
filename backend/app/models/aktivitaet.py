from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Aktivitaet(Base):
    __tablename__ = "aktivitaeten"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    gewerk_id = Column(Integer, ForeignKey("gewerke.id", ondelete="CASCADE"))

    gewerk = relationship("Gewerk", back_populates="aktivitaeten")
