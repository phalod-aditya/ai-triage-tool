from datetime import datetime

import pytest

from app.main import app
from app.services.ai_triage import AITriageResult, get_ai_triage_service


def test_create_intake_persists_ai_enrichment(client, intake_payload, caplog):
    caplog.set_level("INFO", logger="uvicorn.error")
    response = client.post("/api/intakes", json=intake_payload)

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 1
    assert {field: body[field] for field in intake_payload} == intake_payload
    assert datetime.fromisoformat(body["created_at"])
    assert body["ai_summary"].startswith("The project requests")
    assert body["ai_tags"] == ["Healthcare", "Portal", "UX redesign"]
    assert body["ai_risks"] == [
        "Confirm regulatory requirements",
        "Validate the delivery scope",
    ]
    assert body["ai_status"] == "complete"

    stored = client.get(f"/api/intakes/{body['id']}")
    assert stored.status_code == 200
    assert stored.json() == body
    assert "intake_create_started ai_status=pending" in caplog.text
    assert "intake_persisted intake_id=1 ai_status=pending" in caplog.text
    assert "ai_analysis_started intake_id=1" in caplog.text
    assert "ai_analysis_returned intake_id=1" in caplog.text
    assert "ai_status=complete" in caplog.text
    assert "duration_ms=" in caplog.text
    assert intake_payload["description"] not in caplog.text


def test_create_intake_keeps_failed_analysis_record(client, intake_payload, caplog):
    class FailingAITriageService:
        def analyze_intake(self, intake):
            raise RuntimeError("simulated provider failure")

    app.dependency_overrides[get_ai_triage_service] = FailingAITriageService
    caplog.set_level("INFO", logger="uvicorn.error")

    response = client.post("/api/intakes", json=intake_payload)

    assert response.status_code == 502
    assert response.json() == {
        "detail": "Intake 1 was saved, but AI analysis failed."
    }

    stored = client.get("/api/intakes/1")
    assert stored.status_code == 200
    body = stored.json()
    assert {field: body[field] for field in intake_payload} == intake_payload
    assert body["ai_summary"] is None
    assert body["ai_tags"] is None
    assert body["ai_risks"] is None
    assert body["ai_status"] == "failed"
    assert "intake_persisted intake_id=1 ai_status=pending" in caplog.text
    assert "ai_analysis_started intake_id=1" in caplog.text
    assert "error_type=RuntimeError" in caplog.text
    assert "ai_status=failed" in caplog.text
    assert "duration_ms=" in caplog.text
    assert "simulated provider failure" not in caplog.text
    assert intake_payload["description"] not in caplog.text


def test_create_intake_logs_sanitized_validation_details(
    client,
    intake_payload,
    caplog,
):
    invalid_summary = "Sensitive invalid output with only one sentence."

    class InvalidAITriageService:
        def analyze_intake(self, intake):
            return AITriageResult(
                summary=invalid_summary,
                tags=["Healthcare", "Portal", "Scheduling"],
                risks=["Confirm regulatory requirements"],
            )

    app.dependency_overrides[get_ai_triage_service] = InvalidAITriageService
    caplog.set_level("INFO", logger="uvicorn.error")

    response = client.post("/api/intakes", json=intake_payload)

    assert response.status_code == 502
    assert "error_type=ValidationError" in caplog.text
    assert '"field": "summary"' in caplog.text
    assert '"type": "value_error"' in caplog.text
    assert "summary must contain 2 or 3 sentences" in caplog.text
    assert invalid_summary not in caplog.text

    stored = client.get("/api/intakes/1").json()
    assert stored["ai_status"] == "failed"
    assert stored["ai_summary"] is None


def test_list_intakes_returns_all_in_creation_order(client, intake_payload):
    first = client.post("/api/intakes", json=intake_payload).json()
    second_payload = {
        **intake_payload,
        "title": "Analytics implementation",
    }
    second = client.post("/api/intakes", json=second_payload).json()

    response = client.get("/api/intakes")

    assert response.status_code == 200
    assert response.json() == [first, second]


def test_list_intakes_returns_empty_list_when_no_records_exist(client):
    response = client.get("/api/intakes")

    assert response.status_code == 200
    assert response.json() == []


def test_get_intake_returns_clear_404(client):
    response = client.get("/api/intakes/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Intake not found"}


@pytest.mark.parametrize(
    "invalid_change",
    [
        pytest.param({"remove": "title"}, id="missing-title"),
        pytest.param({"remove": "description"}, id="missing-description"),
        pytest.param({"remove": "budget_min"}, id="missing-budget-min"),
        pytest.param({"remove": "budget_max"}, id="missing-budget-max"),
        pytest.param({"remove": "timeline_min"}, id="missing-timeline-min"),
        pytest.param({"remove": "timeline_max"}, id="missing-timeline-max"),
        pytest.param({"remove": "timeline_unit"}, id="missing-timeline-unit"),
        pytest.param({"remove": "industry"}, id="missing-industry"),
        pytest.param(
            {"add": {"created_at": "2000-01-01T00:00:00"}},
            id="client-created-at",
        ),
    ],
)
def test_create_intake_rejects_invalid_payloads(
    client,
    intake_payload,
    invalid_change,
):
    if "remove" in invalid_change:
        intake_payload.pop(invalid_change["remove"])
    else:
        intake_payload.update(invalid_change["add"])

    response = client.post("/api/intakes", json=intake_payload)

    assert response.status_code == 422
    assert client.get("/api/intakes").json() == []


def test_create_intake_rejects_budget_max_below_min(client, intake_payload):
    intake_payload["budget_min"] = 30000
    intake_payload["budget_max"] = 15000

    response = client.post("/api/intakes", json=intake_payload)

    assert response.status_code == 422
    assert "budget max must be greater than or equal to budget min" in str(
        response.json()
    )
    assert client.get("/api/intakes").json() == []


def test_create_intake_rejects_timeline_max_below_min(client, intake_payload):
    intake_payload["timeline_min"] = 12
    intake_payload["timeline_max"] = 8

    response = client.post("/api/intakes", json=intake_payload)

    assert response.status_code == 422
    assert "timeline max must be greater than or equal to timeline min" in str(
        response.json()
    )
    assert client.get("/api/intakes").json() == []
