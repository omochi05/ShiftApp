from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Shift
from schemas import ShiftResponse
from schemas import ShiftResponse, ShiftCreate
from typing import List
import calendar
from datetime import date

router = APIRouter(
    prefix="/shifts",
    tags=["shifts"]
)


@router.get("/", response_model=List[ShiftResponse])
def get_shifts(db: Session = Depends(get_db)):
    shifts = db.query(Shift).all()
    return shifts

@router.post("/", response_model=ShiftResponse)
def create_shift(shift: ShiftCreate, db: Session = Depends(get_db)):
    new_shift = Shift(
        user_id=shift.user_id,
        work_date=shift.work_date,
        start_time=shift.start_time,
        end_time=shift.end_time,
        break_minutes=shift.break_minutes,
        created_by=shift.created_by,
    )

    db.add(new_shift)
    db.commit()
    db.refresh(new_shift)

    return new_shift
@router.get("/user/{user_id}", response_model=List[ShiftResponse])
def get_shifts_by_user(user_id: int, db: Session = Depends(get_db)):
    shifts = (
        db.query(Shift)
        .filter(Shift.user_id == user_id)
        .order_by(Shift.work_date, Shift.start_time)
        .all()
    )
    return shifts

@router.get("/user/{user_id}/month", response_model=List[ShiftResponse])
def get_shifts_by_user_and_month(
    user_id: int,
    year: int,
    month: int,
    db: Session = Depends(get_db)
):
    last_day = calendar.monthrange(year, month)[1]

    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)

    shifts = (
        db.query(Shift)
        .filter(Shift.user_id == user_id)
        .filter(Shift.work_date >= start_date)
        .filter(Shift.work_date <= end_date)
        .order_by(Shift.work_date, Shift.start_time)
        .all()
    )

    return shifts