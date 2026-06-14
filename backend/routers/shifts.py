import calendar
from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth_deps import get_current_user, require_manager_or_owner, require_self_or_manager_or_owner
from database import get_db
from models import Notification, Shift, User
from schemas import ShiftCreate, ShiftResponse, ShiftUpdate


router = APIRouter(
    prefix="/shifts",
    tags=["shifts"],
)


def format_time(value):
    return str(value)[:5]


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str,
    related_shift_id: int | None = None,
    created_by: int | None = None,
):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        related_shift_id=related_shift_id,
        is_read=False,
    )

    if hasattr(notification, "created_by"):
        notification.created_by = created_by

    db.add(notification)


@router.get("/", response_model=List[ShiftResponse])
def get_shifts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Shift)
        .order_by(Shift.work_date, Shift.start_time, Shift.user_id)
        .all()
    )


@router.post("/", response_model=ShiftResponse)
def create_shift(
    shift: ShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_owner),
):
    try:
        db_shift = Shift(
            user_id=shift.user_id,
            work_date=shift.work_date,
            start_time=shift.start_time,
            end_time=shift.end_time,
            break_minutes=shift.break_minutes,
            created_by=current_user.id,
        )

        db.add(db_shift)
        db.flush()

        create_notification(
            db=db,
            user_id=db_shift.user_id,
            title="新しいシフトが登録されました",
            message=(
                f"{db_shift.work_date} "
                f"{format_time(db_shift.start_time)}〜{format_time(db_shift.end_time)} "
                "のシフトが登録されました。"
            ),
            notification_type="shift_confirmed",
            related_shift_id=db_shift.id,
            created_by=current_user.id,
        )

        db.commit()
        db.refresh(db_shift)

        return db_shift

    except Exception as error:
        db.rollback()
        print("シフト作成または通知作成に失敗しました:", error)
        raise HTTPException(
            status_code=500,
            detail="シフト作成に失敗しました",
        )


@router.put("/{shift_id}", response_model=ShiftResponse)
def update_shift(
    shift_id: int,
    shift: ShiftUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_owner),
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

    try:
        db_shift.user_id = shift.user_id
        db_shift.work_date = shift.work_date
        db_shift.start_time = shift.start_time
        db_shift.end_time = shift.end_time
        db_shift.break_minutes = shift.break_minutes
        db_shift.created_by = current_user.id

        db.flush()

        create_notification(
            db=db,
            user_id=db_shift.user_id,
            title="シフトが変更されました",
            message=(
                f"{db_shift.work_date} "
                f"{format_time(db_shift.start_time)}〜{format_time(db_shift.end_time)} "
                "のシフトに変更されました。"
            ),
            notification_type="shift_changed",
            related_shift_id=db_shift.id,
            created_by=current_user.id,
        )

        if old_user_id != db_shift.user_id:
            create_notification(
                db=db,
                user_id=old_user_id,
                title="シフト担当が変更されました",
                message=(
                    f"{old_work_date} "
                    f"{format_time(old_start_time)}〜{format_time(old_end_time)} "
                    "のシフト担当から外れました。"
                ),
                notification_type="shift_changed",
                related_shift_id=db_shift.id,
                created_by=current_user.id,
            )

        db.commit()
        db.refresh(db_shift)

        return db_shift

    except Exception as error:
        db.rollback()
        print("シフト更新または通知作成に失敗しました:", error)
        raise HTTPException(
            status_code=500,
            detail="シフト更新に失敗しました",
        )


@router.delete("/{shift_id}")
def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_owner),
):
    db_shift = db.query(Shift).filter(Shift.id == shift_id).first()

    if db_shift is None:
        raise HTTPException(
            status_code=404,
            detail="シフトが見つかりません",
        )

    try:
        create_notification(
            db=db,
            user_id=db_shift.user_id,
            title="シフトが削除されました",
            message=(
                f"{db_shift.work_date} "
                f"{format_time(db_shift.start_time)}〜{format_time(db_shift.end_time)} "
                "のシフトが削除されました。"
            ),
            notification_type="shift_deleted",
            related_shift_id=None,
            created_by=current_user.id,
        )

        db.delete(db_shift)
        db.commit()

        return {
            "message": "シフトを削除しました",
            "shift_id": shift_id,
        }

    except Exception as error:
        db.rollback()
        print("シフト削除または通知作成に失敗しました:", error)
        raise HTTPException(
            status_code=500,
            detail="シフト削除に失敗しました",
        )


@router.get("/user/{user_id}", response_model=List[ShiftResponse])
def get_shifts_by_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_self_or_manager_or_owner),
):
    return (
        db.query(Shift)
        .filter(Shift.user_id == user_id)
        .order_by(Shift.work_date, Shift.start_time)
        .all()
    )


@router.get("/user/{user_id}/month", response_model=List[ShiftResponse])
def get_shifts_by_user_and_month(
    user_id: int,
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_self_or_manager_or_owner),
):
    last_day = calendar.monthrange(year, month)[1]

    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)

    return (
        db.query(Shift)
        .filter(Shift.user_id == user_id)
        .filter(Shift.work_date >= start_date)
        .filter(Shift.work_date <= end_date)
        .order_by(Shift.work_date, Shift.start_time)
        .all()
    )