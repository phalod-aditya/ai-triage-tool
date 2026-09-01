import json
import logging
from time import perf_counter

from pydantic import ValidationError
from sqlalchemy.orm import Session

from ..models import Intake
from ..schemas import IntakeCreate
from .ai_triage import AITriageInput, AITriageService


logger = logging.getLogger("app.intake_creation")
logger.setLevel(logging.INFO)


class IntakeAnalysisError(Exception):
    def __init__(self, intake_id: int) -> None:
        self.intake_id = intake_id
        super().__init__(f"AI analysis failed for intake {intake_id}")


def _sanitized_validation_errors(error: ValidationError):
    return [
        {
            "field": ".".join(str(part) for part in item["loc"]),
            "type": item["type"],
            "message": item["msg"],
        }
        for item in error.errors(include_input=False)
    ]


def create_and_analyze_intake(
    db: Session,
    payload: IntakeCreate,
    ai_service: AITriageService,
) -> Intake:
    started_at = perf_counter()
    logger.info("intake_create_started ai_status=pending")

    intake = Intake(
        **payload.model_dump(),
        budget_range=f"{payload.budget_min}-{payload.budget_max}",
        timeline=(
            f"{payload.timeline_min}-{payload.timeline_max} "
            f"{payload.timeline_unit}"
        ),
        ai_status="pending",
    )
    db.add(intake)
    db.commit()
    db.refresh(intake)
    intake_id = intake.id
    logger.info(
        "intake_persisted intake_id=%s ai_status=%s",
        intake_id,
        intake.ai_status,
    )

    try:
        logger.info("ai_analysis_started intake_id=%s", intake_id)
        result = ai_service.analyze_intake(AITriageInput(**payload.model_dump()))
        logger.info(
            "ai_analysis_returned intake_id=%s tags=%s summary_chars=%s risk_count=%s",
            intake_id,
            result.tags,
            len(result.summary),
            len(result.risks),
        )

        intake.ai_summary = result.summary
        intake.ai_tags = result.tags
        intake.ai_risks = result.risks
        intake.ai_status = "complete"
        db.commit()
        db.refresh(intake)
        logger.info(
            "intake_ai_status_updated intake_id=%s ai_status=complete",
            intake_id,
        )
        logger.info(
            "intake_create_finished intake_id=%s ai_status=complete duration_ms=%.2f",
            intake_id,
            (perf_counter() - started_at) * 1000,
        )
        return intake
    except Exception as error:
        db.rollback()
        persisted_intake = db.get(Intake, intake_id)
        persisted_intake.ai_summary = None
        persisted_intake.ai_tags = None
        persisted_intake.ai_risks = None
        persisted_intake.ai_status = "failed"
        db.commit()
        logger.error(
            "ai_analysis_failed intake_id=%s ai_status=failed error_type=%s",
            intake_id,
            type(error).__name__,
        )
        if isinstance(error, ValidationError):
            logger.error(
                "validation_errors=%s",
                json.dumps(_sanitized_validation_errors(error)),
            )
        logger.info(
            "intake_create_finished intake_id=%s ai_status=failed duration_ms=%.2f",
            intake_id,
            (perf_counter() - started_at) * 1000,
        )
        raise IntakeAnalysisError(intake_id) from error
