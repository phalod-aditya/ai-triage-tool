from datetime import datetime
from typing import List, Optional

from sqlalchemy import JSON, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Intake(Base):
    __tablename__ = "intakes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    # Kept for compatibility with existing local SQLite databases.
    budget_range: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    budget_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    budget_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Kept for compatibility with existing local SQLite databases.
    timeline: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    timeline_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    timeline_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    timeline_unit: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    industry: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
    )

    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_tags: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    ai_risks: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    ai_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
    )
