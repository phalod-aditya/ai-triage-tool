from pathlib import Path
from typing import Dict, Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base, get_db
from app.main import app
from app.services.ai_triage import AITriageResult, get_ai_triage_service


class SuccessfulAITriageService:
    def analyze_intake(self, intake):
        return AITriageResult(
            summary=(
                "The project requests a customer self-service portal redesign. "
                "Its healthcare context makes scope and compliance alignment important."
            ),
            tags=["Healthcare", "Portal", "UX redesign"],
            risks=["Confirm regulatory requirements", "Validate the delivery scope"],
        )


@pytest.fixture
def intake_payload() -> Dict[str, str]:
    return {
        "title": "Customer portal redesign",
        "description": "Redesign the customer self-service portal.",
        "budget_min": 25000,
        "budget_max": 50000,
        "timeline_min": 8,
        "timeline_max": 12,
        "timeline_unit": "weeks",
        "industry": "Healthcare",
    }


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    database_directory = Path(__file__).parent / ".test-dbs"
    database_directory.mkdir(exist_ok=True)
    database_path = database_directory / f"{uuid4()}.db"
    test_engine = create_engine(
        f"sqlite:///{database_path.as_posix()}",
        connect_args={"check_same_thread": False},
    )
    testing_session = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine,
    )
    Base.metadata.create_all(bind=test_engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_ai_triage_service] = SuccessfulAITriageService
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=test_engine)
        test_engine.dispose()
        database_path.unlink(missing_ok=True)
