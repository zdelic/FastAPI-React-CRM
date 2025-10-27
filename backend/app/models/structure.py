from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Bauteil(Base):
    __tablename__ = "bauteile"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    process_model_id = Column(Integer, ForeignKey("process_models.id"), nullable=True)
    project = relationship("Project", back_populates="bauteile")

    stiegen = relationship(
        "Stiege",
        back_populates="bauteil",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Stiege(Base):
    __tablename__ = "stiegen"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    bauteil_id = Column(Integer, ForeignKey("bauteile.id", ondelete="CASCADE"), nullable=False)
    process_model_id = Column(Integer, ForeignKey("process_models.id"), nullable=True)


    bauteil = relationship("Bauteil", back_populates="stiegen")
    ebenen = relationship(
        "Ebene",
        back_populates="stiege",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Ebene(Base):
    __tablename__ = "ebenen"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    stiege_id = Column(Integer, ForeignKey("stiegen.id", ondelete="CASCADE"), nullable=False)
    process_model_id = Column(Integer, ForeignKey("process_models.id"), nullable=True)


    stiege = relationship("Stiege", back_populates="ebenen")
    tops = relationship(
        "Top",
        back_populates="ebene",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Top(Base):
    __tablename__ = "tops"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    ebene_id = Column(Integer, ForeignKey("ebenen.id", ondelete="CASCADE"), nullable=False)
    process_model_id = Column(Integer, ForeignKey("process_models.id"), nullable=True)


    ebene = relationship("Ebene", back_populates="tops")
