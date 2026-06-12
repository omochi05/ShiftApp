from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import get_db
from models import User, Shift
from schemas import (
    UserCreate,
    UserResponse,
    UserUpdate,
    LoginRequest,
    PasswordChangeRequest,
)

router = APIRouter(
    prefix="/users",
    tags=["users"]
)


@router.get("/", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.id).all()
    return users

@router.post("/login")
def login_user(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    employee_number = login_data.employee_number.strip()
    password = login_data.password.strip()

    if not employee_number:
        raise HTTPException(
            status_code=400,
            detail="従業員番号を入力してください"
        )

    if not password:
        raise HTTPException(
            status_code=400,
            detail="パスワードを入力してください"
        )

    if len(password) != 4 or not password.isdigit():
        raise HTTPException(
            status_code=400,
            detail="パスワードは4桁の数字で入力してください"
        )

    user = (
        db.query(User)
        .filter(User.email == employee_number)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="従業員番号またはパスワードが違います"
        )

    if user.password != password:
        raise HTTPException(
            status_code=401,
            detail="従業員番号またはパスワードが違います"
        )

    return {
        "id": user.id,
        "name": user.name,
        "employee_number": user.email,
        "role": user.role,
        "hourly_wage": user.hourly_wage,
    }


@router.put("/change-password")
def change_password(
    password_data: PasswordChangeRequest,
    db: Session = Depends(get_db)
):
    current_password = password_data.current_password.strip()
    new_password = password_data.new_password.strip()

    if len(current_password) != 4 or not current_password.isdigit():
        raise HTTPException(
            status_code=400,
            detail="現在のパスワードは4桁の数字で入力してください"
        )

    if len(new_password) != 4 or not new_password.isdigit():
        raise HTTPException(
            status_code=400,
            detail="新しいパスワードは4桁の数字で入力してください"
        )

    user = (
        db.query(User)
        .filter(User.id == password_data.user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません"
        )

    if user.password != current_password:
        raise HTTPException(
            status_code=400,
            detail="現在のパスワードが違います"
        )

    user.password = new_password

    db.commit()
    db.refresh(user)

    return {
        "message": "パスワードを変更しました"
    }


@router.post("/", response_model=UserResponse)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    clean_name = user.name.strip()
    clean_email = user.email.strip()
    clean_role = user.role.strip()

    if not clean_email:
        raise HTTPException(
            status_code=400,
            detail="従業員番号を入力してください"
        )

    if not clean_name:
        raise HTTPException(
            status_code=400,
            detail="名前を入力してください"
        )

    existing_email = (
        db.query(User)
        .filter(User.email == clean_email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="この従業員番号はすでに登録されています"
        )

    existing_name = (
        db.query(User)
        .filter(User.name == clean_name)
        .first()
    )

    if existing_name:
        raise HTTPException(
            status_code=400,
            detail="同じ名前の従業員はすでに登録されています"
        )

    new_user = User(
        name=clean_name,
        email=clean_email,
        password=user.password,
        role=clean_role,
        hourly_wage=user.hourly_wage,
    )

    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="この従業員番号はすでに登録されています"
        )

    return new_user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません"
        )

    clean_name = user_data.name.strip()
    clean_email = user_data.email.strip()
    clean_role = user_data.role.strip()

    if not clean_email:
        raise HTTPException(
            status_code=400,
            detail="従業員番号を入力してください"
        )

    if not clean_name:
        raise HTTPException(
            status_code=400,
            detail="名前を入力してください"
        )

    duplicated_email = (
        db.query(User)
        .filter(User.email == clean_email)
        .filter(User.id != user_id)
        .first()
    )

    if duplicated_email:
        raise HTTPException(
            status_code=400,
            detail="この従業員番号はすでに使われています"
        )

    duplicated_name = (
        db.query(User)
        .filter(User.name == clean_name)
        .filter(User.id != user_id)
        .first()
    )

    if duplicated_name:
        raise HTTPException(
            status_code=400,
            detail="同じ名前の従業員はすでに登録されています"
        )

    user.name = clean_name
    user.email = clean_email
    user.role = clean_role
    user.hourly_wage = user_data.hourly_wage

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="従業員情報の更新に失敗しました。従業員番号が重複している可能性があります"
        )

    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません"
        )

    if user.role == "owner":
        raise HTTPException(
            status_code=400,
            detail="オーナーは削除できません"
        )

    try:
        target_shift_ids = [
            row[0]
            for row in db.execute(
                text("""
                    SELECT id
                    FROM shifts
                    WHERE user_id = :user_id
                       OR created_by = :user_id
                """),
                {"user_id": user_id}
            ).fetchall()
        ]

        if target_shift_ids:
            db.execute(
                text("""
                    DELETE FROM notifications
                    WHERE related_shift_id = ANY(:shift_ids)
                """),
                {"shift_ids": target_shift_ids}
            )

        db.execute(
            text("""
                DELETE FROM shift_requests
                WHERE user_id = :user_id
            """),
            {"user_id": user_id}
        )

        db.query(Shift).filter(Shift.user_id == user_id).delete(
            synchronize_session=False
        )

        db.query(Shift).filter(Shift.created_by == user_id).delete(
            synchronize_session=False
        )

        db.delete(user)
        db.commit()

    except Exception as e:
        db.rollback()
        print("ユーザー削除エラー:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=f"ユーザー削除中にエラーが発生しました: {str(e)}"
        )

    return {
        "message": "ユーザーを削除しました",
        "user_id": user_id
    }