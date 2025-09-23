
from sqlalchemy import Column, Integer, Date, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True)
    top_id = Column(Integer, ForeignKey("tops.id", ondelete="CASCADE"))
    process_step_id = Column(Integer, ForeignKey("process_steps.id", ondelete="CASCADE"))
    start_soll = Column(Date)
    end_soll = Column(Date)
    start_ist = Column(Date, nullable=True)
    end_ist = Column(Date, nullable=True)
    status = Column(String, default="offen")
    project_id = Column(Integer, ForeignKey("projects.id"))
    beschreibung = Column(Text, nullable=True)
    sub_id = Column(Integer, ForeignKey("users.id"), nullable=True)  
    
    sub = relationship("User", lazy="joined") 
    top = relationship("Top")
    process_step = relationship("ProcessStep")
    project = relationship("Project")
