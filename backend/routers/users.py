from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth_deps import get_current_user, require_manager_or_owner
from database import get_db
from models import User
from schemas import PasswordChangeRequest, UserCreate, UserUpdate
from security import hash_password, verify_password


router = APIRouter(
    prefix="/users",
    tags=["users"],
)


def is_maintenance_user(user: User):
    return user.email == "9999"


def is_owner_or_maintenance(user: User):
    return user.role == "owner" or is_maintenance_user(user)


def is_manager(user: User):
    return user.role == "manager"


def serialize_user(user: User, current_user: User):
    """
    roleごとに返すユーザー情報を変える

    owner / 9999:
      すべて返す

    manager:
      時給以外を返す

    employee:
      シフト表で名前表示に必要な最低限だけ返す
    """

    if is_owner_or_maintenance(current_user):
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "hourly_wage": user.hourly_wage,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
        }

    if is_manager(current_user):
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
        }

    return {
        "id": user.id,
        "name": user.name,
        "role": user.role,
    }


@router.get("/")
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users = db.query(User).order_by(User.id).all()

    return [serialize_user(user, current_user) for user in users]


@router.post("/")
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_owner),
):
    existing_user = db.query(User).filter(User.email == user.email).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="この従業員番号はすでに使われています",
        )

    if user.email == "9999":
        raise HTTPException(
            status_code=400,
            detail="9999はメンテナンス用のため作成できません",
        )

    try:
        hourly_wage = user.hourly_wage if is_owner_or_maintenance(current_user) else 0

        new_user = User(
            name=user.name,
            email=user.email,
            password=hash_password(user.password),
            role=user.role,
            hourly_wage=hourly_wage,
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return serialize_user(new_user, current_user)

    except Exception as error:
        db.rollback()
        print("ユーザー作成に失敗しました:", error)

        raise HTTPException(
            status_code=500,
            detail="ユーザー作成に失敗しました",
        )


@router.put("/{user_id}")
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_owner),
):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません",
        )

    if is_maintenance_user(user) and user_data.email != "9999":
        raise HTTPException(
            status_code=400,
            detail="メンテナンス用アカウントの従業員番号は変更できません",
        )

    if not is_maintenance_user(user) and user_data.email == "9999":
        raise HTTPException(
            status_code=400,
            detail="9999はメンテナンス用のため使用できません",
        )

    existing_email_user = (
        db.query(User)
        .filter(User.email == user_data.email)
        .filter(User.id != user_id)
        .first()
    )

    if existing_email_user:
        raise HTTPException(
            status_code=400,
            detail="この従業員番号はすでに使われています",
        )

    try:
        user.name = user_data.name
        user.email = "9999" if is_maintenance_user(user) else user_data.email
        user.role = "owner" if is_maintenance_user(user) else user_data.role

        # 時給変更は owner・9999 だけ許可
        # manager が hourly_wage を送ってきても無視する
        if is_owner_or_maintenance(current_user):
            user.hourly_wage = user_data.hourly_wage

        db.commit()
        db.refresh(user)

        return serialize_user(user, current_user)

    except Exception as error:
        db.rollback()
        print("ユーザー更新に失敗しました:", error)

        raise HTTPException(
            status_code=500,
            detail="ユーザー更新に失敗しました",
        )


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_owner),
):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません",
        )

    if is_maintenance_user(user):
        raise HTTPException(
            status_code=400,
            detail="メンテナンス用アカウントは削除できません",
        )

    if user.role == "owner":
        raise HTTPException(
            status_code=400,
            detail="オーナーは削除できません",
        )

    try:
        db.delete(user)
        db.commit()

        return {
            "message": "ユーザーを削除しました",
            "user_id": user_id,
        }

    except Exception as error:
        db.rollback()
        print("ユーザー削除に失敗しました:", error)

        raise HTTPException(
            status_code=500,
            detail="ユーザー削除に失敗しました",
        )


@router.post("/change-password")
def change_password(
    request: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    第4段階：
    パスワード変更は本人だけ許可する。

    owner / manager / employee / 9999 のどれであっても、
    他人のパスワード変更はこのAPIではできない。
    """

    if current_user.id != request.user_id:
        raise HTTPException(
            status_code=403,
            detail="自分のパスワードのみ変更できます",
        )

    user = db.query(User).filter(User.id == current_user.id).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません",
        )

    if not verify_password(request.current_password, user.password):
        raise HTTPException(
            status_code=400,
            detail="現在のパスワードが違います",
        )

    if verify_password(request.new_password, user.password):
        raise HTTPException(
            status_code=400,
            detail="現在のパスワードと同じパスワードは使用できません",
        )

    try:
        user.password = hash_password(request.new_password)

        db.commit()

        return {
            "message": "パスワードを変更しました",
        }

    except Exception as error:
        db.rollback()
        print("パスワード変更に失敗しました:", error)

        raise HTTPException(
            status_code=500,
            detail="パスワード変更に失敗しました",
        )