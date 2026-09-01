from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Intake
from ..schemas import IntakeCreate, IntakeRead
from ..services.ai_triage import AITriageService, get_ai_triage_service
from ..services.intake_creation import (
    IntakeAnalysisError,
    create_and_analyze_intake,
)


router = APIRouter(prefix="/api/intakes", tags=["intakes"])


@router.post("", response_model=IntakeRead, status_code=status.HTTP_201_CREATED)
def create_intake(
    payload: IntakeCreate,
    db: Session = Depends(get_db),
    ai_service: AITriageService = Depends(get_ai_triage_service),
) -> Intake:
    try:
        return create_and_analyze_intake(db, payload, ai_service)
    except IntakeAnalysisError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                f"Intake {error.intake_id} was saved, but AI analysis failed."
            ),
        ) from error


@router.get("", response_model=List[IntakeRead])
def list_intakes(db: Session = Depends(get_db)) -> List[Intake]:
    return list(
        db.scalars(
            select(Intake).order_by(Intake.created_at.desc(), Intake.id.desc())
        ).all()
    )


@router.get("/{intake_id}", response_model=IntakeRead)
def get_intake(intake_id: int, db: Session = Depends(get_db)) -> Intake:
    intake = db.get(Intake, intake_id)
    if intake is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intake not found",
        )
    return intake
