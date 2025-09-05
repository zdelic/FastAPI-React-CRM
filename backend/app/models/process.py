
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class ProcessModel(Base):
    __tablename__ = "process_models"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)

    steps = relationship(
        "ProcessStep",
        back_populates="model",
        cascade="all, delete-orphan",
        order_by="ProcessStep.order"
    )

class ProcessStep(Base):
    __tablename__ = "process_steps"

    id = Column(Integer, primary_key=True)
    model_id = Column(Integer, ForeignKey("process_models.id", ondelete="CASCADE"))
    gewerk_id = Column(Integer, ForeignKey("gewerke.id"))
    activity = Column(String)
    duration_days = Column(Integer)
    parallel = Column(Boolean, default=False)
    order = Column(Integer)

    model = relationship("ProcessModel", back_populates="steps")
    gewerk = relationship("Gewerk", back_populates="process_steps")
