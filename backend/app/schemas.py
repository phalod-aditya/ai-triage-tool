from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class IntakeCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    description: str
    budget_min: int = Field(ge=0)
    budget_max: int = Field(ge=0)
    timeline_min: int = Field(ge=0)
    timeline_max: int = Field(ge=0)
    timeline_unit: Literal["weeks", "months", "years"]
    industry: str

    @model_validator(mode="after")
    def budget_max_is_not_less_than_min(self):
        if self.budget_max < self.budget_min:
            raise ValueError("budget max must be greater than or equal to budget min")
        if self.timeline_max < self.timeline_min:
            raise ValueError("timeline max must be greater than or equal to timeline min")
        return self


class IntakeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    timeline_min: Optional[int] = None
    timeline_max: Optional[int] = None
    timeline_unit: Optional[Literal["weeks", "months", "years"]] = None
    industry: str
    created_at: datetime
    ai_summary: Optional[str] = None
    ai_tags: Optional[List[str]] = None
    ai_risks: Optional[List[str]] = None
    ai_status: str
