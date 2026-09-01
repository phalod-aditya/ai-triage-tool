from datetime import datetime

import pytest


def test_create_intake_persists_backend_defaults(client, intake_payload):
    response = client.post("/api/intakes", json=intake_payload)

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 1
    assert {field: body[field] for field in intake_payload} == intake_payload
    assert datetime.fromisoformat(body["created_at"])
    assert body["ai_summary"] is None
    assert body["ai_tags"] is None
    assert body["ai_risks"] is None
    assert body["ai_status"] == "pending"

    stored = client.get(f"/api/intakes/{body['id']}")
    assert stored.status_code == 200
    assert stored.json() == body


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
        pytest.param({"remove": "budget_range"}, id="missing-budget-range"),
        pytest.param({"remove": "timeline"}, id="missing-timeline"),
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
