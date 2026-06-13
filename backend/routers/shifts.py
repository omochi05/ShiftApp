import calendar
from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Shift, Notification
from schemas import ShiftCreate, ShiftUpdate, ShiftResponse


router = APIRouter(
    prefix="/shifts",
    tags=["shifts"],
)


def format_time(value):
    """
    time型でも文字列でも HH:MM 表示にそろえる
    """
    return str(value)[:5]


def create_shift_notification(
    db: Session,
    user_id: int,
    shift_id: int,
    title: str,
    message: str,
    notification_type: str,
):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        related_shift_id=shift_id,
        is_read=False,
    )

    db.add(notification)


@router.get("/", response_model=List[ShiftResponse])
def get_shifts(db: Session = Depends(get_db)):
    shifts = (
        db.query(Shift)
        .order_by(Shift.work_date, Shift.start_time, Shift.user_id)
        .all()
    )

    return shifts


@router.post("/", response_model=ShiftResponse)
def create_shift(shift: ShiftCreate, db: Session = Depends(get_db)):
    db_shift = Shift(
        user_id=shift.user_id,
        work_date=shift.work_date,
        start_time=shift.start_time,
        end_time=shift.end_time,
        break_minutes=shift.break_minutes,
    )

    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)

    create_shift_notification(
        db=db,
        user_id=db_shift.user_id,
        shift_id=db_shift.id,
        title="新しいシフトが登録されました",
        message=(
            f"{db_shift.work_date} "
            f"{format_time(db_shift.start_time)}〜{format_time(db_shift.end_time)} "
            "のシフトが登録されました。"
        ),
        notification_type="shift_created",
    )

    db.commit()
    db.refresh(db_shift)

    return db_shift


@router.put("/{shift_id}", response_model=ShiftResponse)
def update_shift(
    shift_id: int,
    shift: ShiftUpdate,
    db: Session = Depends(get_db),
):
    db_shift = db.query(Shift).filter(Shift.id == shift_id).first()

    if db_shift is None:
        raise HTTPException(
            status_code=404,
            detail="シフトが見つかりません",
        )

    old_user_id = db_shift.user_id
    old_work_date = db_shift.work_date
    old_start_time = db_shift.start_time
    old_end_time = db_shift.end_time

    db_shift.user_id = shift.user_id
    db_shift.work_date = shift.work_date
    db_shift.start_time = shift.start_time
    db_shift.end_time = shift.end_time
    db_shift.break_minutes = shift.break_minutes

    db.commit()
    db.refresh(db_shift)

    create_shift_notification(
        db=db,
        user_id=db_shift.user_id,
        shift_id=db_shift.id,
        title="シフトが変更されました",
        message=(
            f"{db_shift.work_date} "
            f"{format_time(db_shift.start_time)}〜{format_time(db_shift.end_time)} "
            "のシフトに変更されました。"
        ),
        notification_type="shift_updated",
    )

    if old_user_id != db_shift.user_id:
        create_shift_notification(
            db=db,
            user_id=old_user_id,
            shift_id=db_shift.id,
            title="シフト担当が変更されました",
            message=(
                f"{old_work_date} "
                f"{format_time(old_start_time)}〜{format_time(old_end_time)} "
                "のシフト担当から外れました。"
            ),
            notification_type="shift_removed",
        )

    db.commit()
    db.refresh(db_shift)

    return db_shift


@router.delete("/{shift_id}")
def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db),
):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()

    if shift is None:
        raise HTTPException(
            status_code=404,
            detail="シフトが見つかりません",
        )

    db.query(Notification).filter(
        Notification.related_shift_id == shift_id
    ).delete()

    db.delete(shift)
    db.commit()

    return {
        "message": "シフトを削除しました",
        "shift_id": shift_id,
    }


@router.get("/user/{user_id}", response_model=List[ShiftResponse])
def get_shifts_by_user(
    user_id: int,
    db: Session = Depends(get_db),
):
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
    db: Session = Depends(get_db),
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