from calendar import monthrange
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth_deps import require_owner
from database import get_db
from models import Sale, Shift, User


router = APIRouter(
    prefix="/owner",
    tags=["owner"],
)


def parse_time_to_minutes(value):
    if value is None:
        return 0

    if isinstance(value, str):
        parts = value.split(":")
        hour = int(parts[0])
        minute = int(parts[1])
        return hour * 60 + minute

    return value.hour * 60 + value.minute


def calculate_work_hours(start_time, end_time, break_minutes):
    start_minutes = parse_time_to_minutes(start_time)
    end_minutes = parse_time_to_minutes(end_time)

    if end_minutes <= start_minutes:
        end_minutes += 24 * 60

    total_minutes = end_minutes - start_minutes - int(break_minutes or 0)

    if total_minutes < 0:
        total_minutes = 0

    return total_minutes / 60


def calculate_shift_labor_cost(shift: Shift, user: User):
    hourly_wage = float(user.hourly_wage or 0)
    work_hours = calculate_work_hours(
        shift.start_time,
        shift.end_time,
        shift.break_minutes,
    )

    return work_hours * hourly_wage


def get_labor_cost_between(
    db: Session,
    start_date: date,
    end_date: date,
):
    shifts = (
        db.query(Shift, User)
        .join(User, Shift.user_id == User.id)
        .filter(Shift.work_date >= start_date)
        .filter(Shift.work_date <= end_date)
        .all()
    )

    total_labor_cost = 0

    for shift, user in shifts:
        total_labor_cost += calculate_shift_labor_cost(shift, user)

    return total_labor_cost


def get_sales_between(
    db: Session,
    start_date: date,
    end_date: date,
):
    sales = (
        db.query(Sale)
        .filter(Sale.sale_date >= start_date)
        .filter(Sale.sale_date <= end_date)
        .all()
    )

    total_sales = sum(float(sale.amount or 0) for sale in sales)

    return total_sales


def calculate_labor_cost_rate(total_sales: float, total_labor_cost: float):
    if total_sales <= 0:
        return 0

    return round((total_labor_cost / total_sales) * 100, 1)


@router.get("/dashboard/month")
def get_owner_month_dashboard(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    last_day = monthrange(year, month)[1]

    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)

    total_sales = get_sales_between(db, start_date, end_date)
    total_labor_cost = get_labor_cost_between(db, start_date, end_date)

    return {
        "year": year,
        "month": month,
        "start_date": start_date,
        "end_date": end_date,
        "total_sales": round(total_sales, 0),
        "total_labor_cost": round(total_labor_cost, 0),
        "labor_cost_rate": calculate_labor_cost_rate(
            total_sales,
            total_labor_cost,
        ),
    }


@router.get("/dashboard/week")
def get_owner_week_dashboard(
    year: int,
    week: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    first_day = date(year, 1, 1)

    start_date = first_day + timedelta(days=(week - 1) * 7)
    end_date = start_date + timedelta(days=6)

    total_sales = get_sales_between(db, start_date, end_date)
    total_labor_cost = get_labor_cost_between(db, start_date, end_date)
    profit = total_sales - total_labor_cost

    return {
        "year": year,
        "week": week,
        "start_date": start_date,
        "end_date": end_date,
        "total_sales": round(total_sales, 0),
        "total_labor_cost": round(total_labor_cost, 0),
        "labor_cost_rate": calculate_labor_cost_rate(
            total_sales,
            total_labor_cost,
        ),
        "profit": round(profit, 0),
        "status": "ok",
    }


@router.get("/dashboard/weekday")
def get_owner_weekday_dashboard(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    last_day = monthrange(year, month)[1]

    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)

    weekday_labels = ["月", "火", "水", "木", "金", "土", "日"]

    result = []

    for weekday_index, weekday_label in enumerate(weekday_labels):
        current_date = start_date

        weekday_sales = 0
        weekday_labor_cost = 0

        while current_date <= end_date:
            if current_date.weekday() == weekday_index:
                daily_sales = get_sales_between(db, current_date, current_date)
                daily_labor_cost = get_labor_cost_between(
                    db,
                    current_date,
                    current_date,
                )

                weekday_sales += daily_sales
                weekday_labor_cost += daily_labor_cost

            current_date += timedelta(days=1)

        result.append(
            {
                "weekday": weekday_label,
                "total_sales": round(weekday_sales, 0),
                "total_labor_cost": round(weekday_labor_cost, 0),
                "labor_cost_rate": calculate_labor_cost_rate(
                    weekday_sales,
                    weekday_labor_cost,
                ),
            }
        )

    return result