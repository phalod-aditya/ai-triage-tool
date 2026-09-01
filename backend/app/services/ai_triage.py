import os
import re
from typing import List

from openai import OpenAI
from pydantic import BaseModel, ConfigDict, Field, field_validator


class AITriageInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    description: str
    budget_range: str
    timeline: str
    industry: str


class AITriageResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str
    tags: List[str] = Field(min_length=3, max_length=3)
    risks: List[str] = Field(min_length=1)

    @field_validator("summary")
    @classmethod
    def summary_has_two_or_three_sentences(cls, value: str) -> str:
        sentence_count = len(re.findall(r"[.!?](?:\s|$)", value.strip()))
        if sentence_count not in (2, 3):
            raise ValueError("summary must contain 2 or 3 sentences")
        return value.strip()

    @field_validator("tags")
    @classmethod
    def tags_are_concise(cls, value: List[str]) -> List[str]:
        cleaned = [tag.strip() for tag in value]
        if any(not tag or len(tag) > 30 for tag in cleaned):
            raise ValueError("tags must be non-empty and at most 30 characters")
        if len({tag.casefold() for tag in cleaned}) != 3:
            raise ValueError("tags must be unique")
        return cleaned

    @field_validator("risks")
    @classmethod
    def risks_are_non_empty(cls, value: List[str]) -> List[str]:
        cleaned = [risk.strip() for risk in value]
        if any(not risk for risk in cleaned):
            raise ValueError("risk items must be non-empty")
        return cleaned


class AITriageService:
    def __init__(self) -> None:
        api_key = os.getenv("OPENAI_API_KEY")
        model = os.getenv("LLM_MODEL")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        if not model:
            raise ValueError("LLM_MODEL environment variable is required")

        self._client = OpenAI(api_key=api_key)
        self._model = model

    def analyze_intake(self, intake: AITriageInput) -> AITriageResult:
        response = self._client.responses.parse(
            model=self._model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You triage inbound project requests. Produce a clear 2-3 "
                        "sentence summary, exactly 3 concise and distinct tags, and "
                        "a practical risk checklist. Each risk must be a standalone "
                        "checklist item without a bullet prefix. Base the analysis "
                        "only on the supplied intake."
                    ),
                },
                {
                    "role": "user",
                    "content": intake.model_dump_json(),
                },
            ],
            text_format=AITriageResult,
        )

        if response.output_parsed is None:
            raise ValueError("The model did not return a triage result")
        return AITriageResult.model_validate(response.output_parsed)
