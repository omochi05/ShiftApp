from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Shift
from schemas import UserCreate, UserResponse, UserUpdate

router = APIRouter(
    prefix="/users",
    tags=["users"]
)


@router.get("/", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.id).all()
    return users


@router.post("/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="この従業員番号はすでに登録されています"
        )

    new_user = User(
        name=user.name,
        email=user.email,
        password=user.password,
        role=user.role,
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


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()

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
        # 1. このユーザーに関係するシフトIDを取得
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

        # 2. シフトに紐づく通知を先に削除
        if target_shift_ids:
            db.execute(
                text("""
                    DELETE FROM notifications
                    WHERE related_shift_id = ANY(:shift_ids)
                """),
                {"shift_ids": target_shift_ids}
            )

        # 3. このユーザーに紐づくシフト申請を削除
        db.execute(
            text("""
                DELETE FROM shift_requests
                WHERE user_id = :user_id
            """),
            {"user_id": user_id}
        )

        # 4. 勤務者として登録されているシフトを削除
        db.query(Shift).filter(Shift.user_id == user_id).delete(
            synchronize_session=False
        )

        # 5. 作成者として紐づいているシフトも削除
        db.query(Shift).filter(Shift.created_by == user_id).delete(
            synchronize_session=False
        )

        # 6. 最後にユーザーを削除
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
@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません"
        )

    duplicated_user = (
        db.query(User)
        .filter(User.email == user_data.email)
        .filter(User.id != user_id)
        .first()
    )

    if duplicated_user:
        raise HTTPException(
            status_code=400,
            detail="この従業員番号はすでに使われています"
        )

    user.name = user_data.name
    user.email = user_data.email
    user.role = user_data.role
    user.hourly_wage = user_data.hourly_wage

    db.commit()
    db.refresh(user)

    return user