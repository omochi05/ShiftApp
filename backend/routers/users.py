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


def can_view_wage(current_user: User):
    return current_user.role == "owner" or is_maintenance_user(current_user)


def serialize_user(user: User, current_user: User):
    data = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }

    # 時給はオーナー・メンテナンスだけ返す
    if can_view_wage(current_user):
        data["hourly_wage"] = user.hourly_wage

    return data


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
        # manager は時給を設定できない
        hourly_wage = user.hourly_wage if can_view_wage(current_user) else 0

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
        if can_view_wage(current_user):
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
    user = db.query(User).filter(User.id == request.user_id).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません",
        )

    # 今の段階では、本人・owner・9999 のみ変更可能
    if (
        current_user.id != user.id
        and current_user.role != "owner"
        and not is_maintenance_user(current_user)
    ):
        raise HTTPException(
            status_code=403,
            detail="このユーザーのパスワードは変更できません",
        )

    if not verify_password(request.current_password, user.password):
        raise HTTPException(
            status_code=400,
            detail="現在のパスワードが違います",
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