from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class IntakeCreate(BaseModel):
    title: str
    description: str
    budget_range: str
    timeline: str
    industry: str


class IntakeRead(IntakeCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    ai_summary: Optional[str] = None
    ai_tags: Optional[List[str]] = None
    ai_risks: Optional[List[str]] = None
    ai_status: str
