from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Intake
from ..schemas import IntakeCreate, IntakeRead


router = APIRouter(prefix="/api/intakes", tags=["intakes"])


@router.post("", response_model=IntakeRead, status_code=status.HTTP_201_CREATED)
def create_intake(payload: IntakeCreate, db: Session = Depends(get_db)) -> Intake:
    intake = Intake(**payload.model_dump())
    db.add(intake)
    db.commit()
    db.refresh(intake)
    return intake


@router.get("", response_model=List[IntakeRead])
def list_intakes(db: Session = Depends(get_db)) -> List[Intake]:
    return list(db.scalars(select(Intake).order_by(Intake.id)).all())


@router.get("/{intake_id}", response_model=IntakeRead)
def get_intake(intake_id: int, db: Session = Depends(get_db)) -> Intake:
    intake = db.get(Intake, intake_id)
    if intake is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intake not found",
        )
    return intake
