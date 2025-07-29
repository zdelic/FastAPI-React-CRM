from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Bauteil(Base):
    __tablename__ = "bauteile"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    project_id = Column(Integer, ForeignKey("projects.id"))

    stiegen = relationship("Stiege", back_populates="bauteil")


class Stiege(Base):
    __tablename__ = "stiegen"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    bauteil_id = Column(Integer, ForeignKey("bauteile.id"))

    bauteil = relationship("Bauteil", back_populates="stiegen")
    ebenen = relationship("Ebene", back_populates="stiege")


class Ebene(Base):
    __tablename__ = "ebenen"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    stiege_id = Column(Integer, ForeignKey("stiegen.id"))

    stiege = relationship("Stiege", back_populates="ebenen")
    tops = relationship("Top", back_populates="ebene")


class Top(Base):
    __tablename__ = "tops"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    ebene_id = Column(Integer, ForeignKey("ebenen.id"))

    ebene = relationship("Ebene", back_populates="tops")
