import calendar
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import ShiftSalaryView
from schemas import SalaryMonthlyResponse

router = APIRouter(
    prefix="/salary",
    tags=["salary"]
)


@router.get("/user/{user_id}/month", response_model=SalaryMonthlyResponse)
def get_monthly_salary(
    user_id: int,
    year: int,
    month: int,
    db: Session = Depends(get_db)
):
    last_day = calendar.monthrange(year, month)[1]

    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)

    result = (
        db.query(
            func.coalesce(func.sum(ShiftSalaryView.work_hours), 0).label("total_work_hours"),
            func.coalesce(func.sum(ShiftSalaryView.normal_hours), 0).label("total_normal_hours"),
            func.coalesce(func.sum(ShiftSalaryView.night_hours), 0).label("total_night_hours"),
            func.coalesce(func.sum(ShiftSalaryView.salary_target_amount), 0).label("total_salary_target_amount"),
        )
        .filter(ShiftSalaryView.user_id == user_id)
        .filter(ShiftSalaryView.work_date >= start_date)
        .filter(ShiftSalaryView.work_date <= end_date)
        .first()
    )

    return SalaryMonthlyResponse(
        user_id=user_id,
        year=year,
        month=month,
        total_work_hours=float(result.total_work_hours),
        total_normal_hours=float(result.total_normal_hours),
        total_night_hours=float(result.total_night_hours),
        total_salary_target_amount=int(result.total_salary_target_amount),
    )