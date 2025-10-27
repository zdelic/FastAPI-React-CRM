# app/models/protocol.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON, Text
from sqlalchemy.sql import func
from app.database import Base  # ako ti je Base na drugoj putanji, prilagodi import

class ProtocolEntry(Base):
    __tablename__ = "protocol"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # ko/šta
    user_id = Column(String(128), index=True, nullable=True)
    user_name = Column(String(256), index=True, nullable=True)
    action = Column(String(128), index=True)     # npr. "auth.login", "task.update"
    ok = Column(Boolean, default=True, index=True)

    # http kontekst
    method = Column(String(8))
    path = Column(String(512), index=True)
    status_code = Column(Integer)
    ip = Column(String(64))
    user_agent = Column(Text)

    # sadržaj
    details = Column(JSON, nullable=True)        # payload/diff/meta (maskirano)
