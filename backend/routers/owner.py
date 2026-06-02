import calendar
from datetime import date,timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from models import Sale, ShiftSalaryView
from schemas import OwnerDashboardMonthlyResponse, OwnerDashboardWeeklyResponse

router = APIRouter(
    prefix="/owner",
    tags=["owner"]
)


@router.get("/dashboard/month", response_model=OwnerDashboardMonthlyResponse)
def get_owner_dashboard_month(
    year: int,
    month: int,
    db: Session = Depends(get_db)
):
    last_day = calendar.monthrange(year, month)[1]

    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)

    total_sales = (
        db.query(func.coalesce(func.sum(Sale.amount), 0))
        .filter(Sale.sale_date >= start_date)
        .filter(Sale.sale_date <= end_date)
        .scalar()
    )

    total_labor_cost = (
        db.query(func.coalesce(func.sum(ShiftSalaryView.salary_target_amount), 0))
        .filter(ShiftSalaryView.work_date >= start_date)
        .filter(ShiftSalaryView.work_date <= end_date)
        .scalar()
    )

    total_sales = int(total_sales)
    total_labor_cost = int(total_labor_cost)

    if total_sales == 0:
        labor_cost_rate = 0.0
    else:
        labor_cost_rate = round(total_labor_cost / total_sales * 100, 2)

    return {
        "year": year,
        "month": month,
        "total_sales": total_sales,
        "total_labor_cost": total_labor_cost,
        "labor_cost_rate": labor_cost_rate,
    }

@router.get("/dashboard/week", response_model=OwnerDashboardWeeklyResponse)
def get_owner_dashboard_week(
    year: int,
    week: int,
    db: Session = Depends(get_db)
):
    # ISO週番号から月曜日を取得
    start_date = date.fromisocalendar(year, week, 1)
    end_date = start_date + timedelta(days=6)

    total_sales = (
        db.query(func.coalesce(func.sum(Sale.amount), 0))
        .filter(Sale.sale_date >= start_date)
        .filter(Sale.sale_date <= end_date)
        .scalar()
    )

    total_labor_cost = (
        db.query(func.coalesce(func.sum(ShiftSalaryView.salary_target_amount), 0))
        .filter(ShiftSalaryView.work_date >= start_date)
        .filter(ShiftSalaryView.work_date <= end_date)
        .scalar()
    )

    total_sales = int(total_sales)
    total_labor_cost = int(total_labor_cost)

    profit = total_sales - total_labor_cost

    if profit >= 0:
        status = "黒字"
    else:
        status = "赤字"

    if total_sales == 0:
        labor_cost_rate = 0.0
    else:
        labor_cost_rate = round(total_labor_cost / total_sales * 100, 2)

    return {
        "year": year,
        "week": week,
        "start_date": start_date,
        "end_date": end_date,
        "total_sales": total_sales,
        "total_labor_cost": total_labor_cost,
        "profit": profit,
        "status": status,
        "labor_cost_rate": labor_cost_rate,
    }