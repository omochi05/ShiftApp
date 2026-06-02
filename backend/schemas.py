from pydantic import BaseModel
from datetime import datetime, date, time


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    hourly_wage: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


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


class ShiftCreate(BaseModel):
    user_id: int
    work_date: date
    start_time: time
    end_time: time
    break_minutes: int = 0
    created_by: int | None = None


class SalaryMonthlyResponse(BaseModel):
    user_id: int
    year: int
    month: int
    total_work_hours: float
    total_normal_hours: float
    total_night_hours: float
    total_salary_target_amount: int

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


class SaleCreate(BaseModel):
    sale_date: date
    amount: int
    customer_count: int = 0
    memo: str | None = None

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