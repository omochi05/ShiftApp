from sqlalchemy import Column, Integer, String, Date, Time, TIMESTAMP, ForeignKey, Numeric
from sqlalchemy.sql import func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    hourly_wage = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now())


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    work_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    break_minutes = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)


class ShiftSalaryView(Base):
    __tablename__ = "shift_salary_view"

    shift_id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    name = Column(String)
    work_date = Column(Date)
    start_time = Column(Time)
    end_time = Column(Time)
    break_minutes = Column(Integer)
    hourly_wage = Column(Integer)
    work_hours = Column(Numeric)
    normal_hours = Column(Numeric)
    night_hours = Column(Numeric)
    night_rate = Column(Numeric)
    salary_target_amount = Column(Numeric)

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    sale_date = Column(Date, nullable=False, unique=True)
    amount = Column(Integer, nullable=False)
    customer_count = Column(Integer, default=0)
    memo = Column(String)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now())