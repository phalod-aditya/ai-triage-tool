from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.services.ai_triage import AITriageInput, AITriageResult, AITriageService


SAMPLE_INPUT = {
    "title": "Customer portal redesign",
    "description": "Redesign the customer self-service portal.",
    "budget_min": 25000,
    "budget_max": 50000,
    "timeline_min": 8,
    "timeline_max": 12,
    "timeline_unit": "weeks",
    "industry": "Healthcare",
}


def test_service_returns_validated_structured_result(monkeypatch):
    expected = AITriageResult(
        summary=(
            "The team wants to redesign its healthcare customer portal. "
            "The proposed budget and timeline require a focused delivery scope."
        ),
        tags=["Healthcare", "Portal", "UX redesign"],
        risks=["Confirm regulatory requirements", "Validate the delivery scope"],
    )
    parse_calls = []

    class FakeResponses:
        def parse(self, **kwargs):
            parse_calls.append(kwargs)
            return SimpleNamespace(output_parsed=expected)

    class FakeOpenAI:
        def __init__(self, api_key):
            assert api_key == "test-key"
            self.responses = FakeResponses()

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("LLM_MODEL", "test-model")
    monkeypatch.setattr("app.services.ai_triage.OpenAI", FakeOpenAI)

    result = AITriageService().analyze_intake(AITriageInput(**SAMPLE_INPUT))

    assert result == expected
    assert parse_calls[0]["model"] == "test-model"
    assert parse_calls[0]["text_format"] is AITriageResult


@pytest.mark.parametrize("missing_name", ["OPENAI_API_KEY", "LLM_MODEL"])
def test_service_requires_environment_configuration(monkeypatch, missing_name):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("LLM_MODEL", "test-model")
    monkeypatch.delenv(missing_name)

    with pytest.raises(ValueError, match=missing_name):
        AITriageService()


@pytest.mark.parametrize(
    "field,value",
    [
        pytest.param("summary", "Only one sentence.", id="one-sentence-summary"),
        pytest.param("tags", ["one", "two"], id="fewer-than-three-tags"),
        pytest.param("tags", ["same", "same", "other"], id="duplicate-tags"),
        pytest.param("risks", [], id="empty-risk-checklist"),
    ],
)
def test_result_rejects_invalid_llm_output(field, value):
    payload = {
        "summary": "Sentence one. Sentence two.",
        "tags": ["one", "two", "three"],
        "risks": ["Confirm scope"],
    }
    payload[field] = value

    with pytest.raises(ValidationError):
        AITriageResult.model_validate(payload)
