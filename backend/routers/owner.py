import calendar
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from database import get_db
from models import Sale, ShiftSalaryView
from schemas import (
    OwnerDashboardMonthlyResponse,
    OwnerDashboardWeeklyResponse,
    OwnerDashboardWeekdayResponse,
)

router = APIRouter(
    prefix="/owner",
    tags=["owner"],
)


@router.get("/dashboard/month", response_model=OwnerDashboardMonthlyResponse)
def get_owner_dashboard_month(
    year: int,
    month: int,
    db: Session = Depends(get_db),
):
    """
    月ごとの売上・人件費・人件費率を取得
    """
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

    total_sales = int(total_sales or 0)
    total_labor_cost = int(total_labor_cost or 0)

    labor_cost_rate = 0.0
    if total_sales > 0:
        labor_cost_rate = round(total_labor_cost / total_sales * 100, 2)

    return OwnerDashboardMonthlyResponse(
        year=year,
        month=month,
        total_sales=total_sales,
        total_labor_cost=total_labor_cost,
        labor_cost_rate=labor_cost_rate,
    )


@router.get("/dashboard/week", response_model=OwnerDashboardWeeklyResponse)
def get_owner_dashboard_week(
    year: int,
    week: int,
    db: Session = Depends(get_db),
):
    """
    ISO週番号ごとの売上・人件費・利益・黒字/赤字判定を取得
    """
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

    total_sales = int(total_sales or 0)
    total_labor_cost = int(total_labor_cost or 0)

    profit = total_sales - total_labor_cost
    status = "黒字" if profit >= 0 else "赤字"

    labor_cost_rate = 0.0
    if total_sales > 0:
        labor_cost_rate = round(total_labor_cost / total_sales * 100, 2)

    return OwnerDashboardWeeklyResponse(
        year=year,
        week=week,
        start_date=start_date,
        end_date=end_date,
        total_sales=total_sales,
        total_labor_cost=total_labor_cost,
        profit=profit,
        status=status,
        labor_cost_rate=labor_cost_rate,
    )


@router.get(
    "/dashboard/weekday",
    response_model=list[OwnerDashboardWeekdayResponse],
)
def get_owner_dashboard_weekday(
    year: int,
    month: int,
    db: Session = Depends(get_db),
):
    """
    月内の曜日ごとの売上・人件費・人件費率を取得

    PostgreSQL の extract('dow') は以下の形式:
    0 = 日曜
    1 = 月曜
    2 = 火曜
    3 = 水曜
    4 = 木曜
    5 = 金曜
    6 = 土曜
    """
    last_day = calendar.monthrange(year, month)[1]

    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)

    weekday_labels = {
        0: "日",
        1: "月",
        2: "火",
        3: "水",
        4: "木",
        5: "金",
        6: "土",
    }

    sales_rows = (
        db.query(
            extract("dow", Sale.sale_date).label("weekday"),
            func.coalesce(func.sum(Sale.amount), 0).label("total_sales"),
        )
        .filter(Sale.sale_date >= start_date)
        .filter(Sale.sale_date <= end_date)
        .group_by("weekday")
        .all()
    )

    labor_rows = (
        db.query(
            extract("dow", ShiftSalaryView.work_date).label("weekday"),
            func.coalesce(
                func.sum(ShiftSalaryView.salary_target_amount), 0
            ).label("total_labor_cost"),
        )
        .filter(ShiftSalaryView.work_date >= start_date)
        .filter(ShiftSalaryView.work_date <= end_date)
        .group_by("weekday")
        .all()
    )

    sales_by_weekday = {
        int(row.weekday): int(row.total_sales or 0)
        for row in sales_rows
    }

    labor_by_weekday = {
        int(row.weekday): int(row.total_labor_cost or 0)
        for row in labor_rows
    }

    result = []

    for weekday_number in range(7):
        total_sales = sales_by_weekday.get(weekday_number, 0)
        total_labor_cost = labor_by_weekday.get(weekday_number, 0)

        labor_cost_rate = 0.0
        if total_sales > 0:
            labor_cost_rate = round(total_labor_cost / total_sales * 100, 2)

        result.append(
            OwnerDashboardWeekdayResponse(
                weekday=weekday_labels[weekday_number],
                total_sales=total_sales,
                total_labor_cost=total_labor_cost,
                labor_cost_rate=labor_cost_rate,
            )
        )

    return result