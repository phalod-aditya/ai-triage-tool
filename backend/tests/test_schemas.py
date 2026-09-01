from datetime import datetime

import pytest
from pydantic import ValidationError

from app.models import Intake
from app.schemas import IntakeCreate, IntakeRead


REQUIRED_FIELDS = [
    "title",
    "description",
    "budget_range",
    "timeline",
    "industry",
]


def test_intake_create_accepts_valid_input(intake_payload):
    intake = IntakeCreate.model_validate(intake_payload)

    assert intake.model_dump() == intake_payload


@pytest.mark.parametrize("missing_field", REQUIRED_FIELDS)
def test_intake_create_requires_every_input_field(intake_payload, missing_field):
    intake_payload.pop(missing_field)

    with pytest.raises(ValidationError) as error:
        IntakeCreate.model_validate(intake_payload)

    assert error.value.errors()[0]["loc"] == (missing_field,)
    assert error.value.errors()[0]["type"] == "missing"


@pytest.mark.parametrize("extra_field", ["id", "created_at", "ai_status"])
def test_intake_create_rejects_backend_owned_fields(intake_payload, extra_field):
    intake_payload[extra_field] = "client-supplied value"

    with pytest.raises(ValidationError) as error:
        IntakeCreate.model_validate(intake_payload)

    assert error.value.errors()[0]["loc"] == (extra_field,)
    assert error.value.errors()[0]["type"] == "extra_forbidden"


def test_intake_read_serializes_sqlalchemy_model(intake_payload):
    created_at = datetime(2026, 1, 2, 3, 4, 5)
    model = Intake(
        id=7,
        created_at=created_at,
        ai_summary="A concise project summary.",
        ai_tags=["design", "portal", "healthcare"],
        ai_risks=["Regulatory review required"],
        ai_status="complete",
        **intake_payload,
    )

    result = IntakeRead.model_validate(model)

    assert result.id == 7
    assert result.created_at == created_at
    assert result.ai_tags == ["design", "portal", "healthcare"]
    assert result.ai_risks == ["Regulatory review required"]
    assert result.ai_status == "complete"
