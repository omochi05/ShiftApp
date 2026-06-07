from pydantic import BaseModel
from datetime import datetime, date, time


# =========================
# Users
# =========================

class UserCreate(BaseModel):
    name: str
    email: str
    password: str = "password"
    role: str = "employee"
    hourly_wage: int = 0


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    hourly_wage: int
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


# =========================
# Shifts
# =========================

class ShiftCreate(BaseModel):
    user_id: int
    work_date: date
    start_time: time
    end_time: time
    break_minutes: int = 0
    created_by: int | None = None


class ShiftResponse(BaseModel):
    id: int
    user_id: int
    work_date: date
    start_time: time
    end_time: time
    break_minutes: int
    created_by: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


# =========================
# Salary
# =========================

class SalaryMonthlyResponse(BaseModel):
    user_id: int
    year: int
    month: int
    total_work_hours: float
    total_normal_hours: float
    total_night_hours: float
    total_salary_target_amount: int


# =========================
# Sales
# =========================

class SaleCreate(BaseModel):
    sale_date: date
    amount: int
    customer_count: int = 0
    memo: str | None = None


class SaleResponse(BaseModel):
    id: int
    sale_date: date
    amount: int
    customer_count: int | None = 0
    memo: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


# =========================
# Owner Dashboard
# =========================

class OwnerDashboardMonthlyResponse(BaseModel):
    year: int
    month: int
    total_sales: int
    total_labor_cost: int
    labor_cost_rate: float


class OwnerDashboardWeeklyResponse(BaseModel):
    year: int
    week: int
    start_date: date
    end_date: date
    total_sales: int
    total_labor_cost: int
    profit: int
    status: str
    labor_cost_rate: float

class OwnerDashboardWeekdayResponse(BaseModel):
    weekday: str
    total_sales: int
    total_labor_cost: int
    labor_cost_rate: float