from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth_deps import get_current_user, require_manager_or_owner
from database import get_db
from models import Shift, User
from schemas import ShiftCreate, ShiftUpdate


router = APIRouter(
    prefix="/shifts",
    tags=["shifts"],
)


def is_maintenance_user(user: User):
    return user.email == "9999"


def is_owner_or_maintenance(user: User):
    return user.role == "owner" or is_maintenance_user(user)


def is_manager(user: User):
    return user.role == "manager"


def serialize_shift(shift: Shift, user: User | None = None):
    return {
        "id": shift.id,
        "user_id": shift.user_id,
        "user_name": user.name if user else None,
        "user_role": user.role if user else None,
        "work_date": shift.work_date,
        "start_time": shift.start_time,
        "end_time": shift.end_time,
        "break_minutes": shift.break_minutes,
        "created_by": getattr(shift, "created_by", None),
        "created_at": getattr(shift, "created_at", None),
        "updated_at": getattr(shift, "updated_at", None),
    }


def get_target_user_or_404(db: Session, user_id: int):
    target_user = db.query(User).filter(User.id == user_id).first()

    if target_user is None:
        raise HTTPException(
            status_code=404,
            detail="シフト対象のユーザーが見つかりません",
        )

    return target_user


def check_manager_can_manage_target_user(current_user: User, target_user: User):
    """
    管理者は従業員のシフトだけ操作できる。
    管理者・オーナーのシフトは操作不可。
    """

    if is_owner_or_maintenance(current_user):
        return

    if is_manager(current_user) and target_user.role in ["manager", "owner"]:
        raise HTTPException(
            status_code=403,
            detail="管理者は管理者・オーナーのシフトを操作できません",
        )


@router.get("/")
def get_shifts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    シフト一覧取得。

    従業員画面でもシフト表を表示するため、
    ログイン済みユーザーなら閲覧可能。
    """

    shifts = db.query(Shift).order_by(Shift.work_date, Shift.start_time).all()

    result = []

    for shift in shifts:
        user = db.query(User).filter(User.id == shift.user_id).first()
        result.append(serialize_shift(shift, user))

    return result


@router.get("/user/{user_id}")
def get_user_shifts(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    特定ユーザーのシフト一覧取得。
    """

    target_user = get_target_user_or_404(db, user_id)

    shifts = (
        db.query(Shift)
        .filter(Shift.user_id == user_id)
        .order_by(Shift.work_date, Shift.start_time)
        .all()
    )

    return [serialize_shift(shift, target_user) for shift in shifts]


@router.get("/user/{user_id}/month")
def get_user_month_shifts(
    user_id: int,
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    特定ユーザーの月別シフト取得。
    """

    target_user = get_target_user_or_404(db, user_id)

    shifts = (
        db.query(Shift)
        .filter(Shift.user_id == user_id)
        .filter(Shift.work_date >= date(year, month, 1))
        .all()
    )

    filtered_shifts = [
        shift
        for shift in shifts
        if shift.work_date.year == year and shift.work_date.month == month
    ]

    filtered_shifts.sort(key=lambda shift: (shift.work_date, shift.start_time))

    return [serialize_shift(shift, target_user) for shift in filtered_shifts]


@router.get("/{shift_id}")
def get_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    シフト詳細取得。
    """

    shift = db.query(Shift).filter(Shift.id == shift_id).first()

    if shift is None:
        raise HTTPException(
            status_code=404,
            detail="シフトが見つかりません",
        )

    user = db.query(User).filter(User.id == shift.user_id).first()

    return serialize_shift(shift, user)


@router.post("/")
def create_shift(
    shift_data: ShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_owner),
):
    """
    シフト作成。

    owner / 9999:
      全員のシフトを作成可能

    manager:
      employee のシフトだけ作成可能
    """

    target_user = get_target_user_or_404(db, shift_data.user_id)

    check_manager_can_manage_target_user(current_user, target_user)

    try:
        new_shift = Shift(
            user_id=shift_data.user_id,
            work_date=shift_data.work_date,
            start_time=shift_data.start_time,
            end_time=shift_data.end_time,
            break_minutes=shift_data.break_minutes,
        )

        if hasattr(new_shift, "created_by"):
            new_shift.created_by = current_user.id

        db.add(new_shift)
        db.commit()
        db.refresh(new_shift)

        return serialize_shift(new_shift, target_user)

    except Exception as error:
        db.rollback()
        print("シフト作成に失敗しました:", repr(error))

        raise HTTPException(
            status_code=500,
            detail=f"シフト作成に失敗しました: {str(error)}",
        )


@router.put("/{shift_id}")
def update_shift(
    shift_id: int,
    shift_data: ShiftUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_owner),
):
    """
    シフト更新。

    owner / 9999:
      全員のシフトを編集可能

    manager:
      employee のシフトだけ編集可能
      manager / owner のシフトは編集不可
    """

    shift = db.query(Shift).filter(Shift.id == shift_id).first()

    if shift is None:
        raise HTTPException(
            status_code=404,
            detail="シフトが見つかりません",
        )

    current_target_user = get_target_user_or_404(db, shift.user_id)

    check_manager_can_manage_target_user(current_user, current_target_user)

    new_target_user = get_target_user_or_404(db, shift_data.user_id)

    check_manager_can_manage_target_user(current_user, new_target_user)

    try:
        shift.user_id = shift_data.user_id
        shift.work_date = shift_data.work_date
        shift.start_time = shift_data.start_time
        shift.end_time = shift_data.end_time
        shift.break_minutes = shift_data.break_minutes

        db.commit()
        db.refresh(shift)

        return serialize_shift(shift, new_target_user)

    except Exception as error:
        db.rollback()
        print("シフト更新に失敗しました:", repr(error))

        raise HTTPException(
            status_code=500,
            detail=f"シフト更新に失敗しました: {str(error)}",
        )


@router.delete("/{shift_id}")
def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_owner),
):
    """
    シフト削除。

    owner / 9999:
      全員のシフトを削除可能

    manager:
      employee のシフトだけ削除可能
      manager / owner のシフトは削除不可
    """

    shift = db.query(Shift).filter(Shift.id == shift_id).first()

    if shift is None:
        raise HTTPException(
            status_code=404,
            detail="シフトが見つかりません",
        )

    target_user = get_target_user_or_404(db, shift.user_id)

    check_manager_can_manage_target_user(current_user, target_user)

    try:
        db.delete(shift)
        db.commit()

        return {
            "message": "シフトを削除しました",
            "shift_id": shift_id,
        }

    except Exception as error:
        db.rollback()
        print("シフト削除に失敗しました:", repr(error))

        raise HTTPException(
            status_code=500,
            detail=f"シフト削除に失敗しました: {str(error)}",
        )