from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from schemas import UserResponse, UserCreate

from database import get_db
from models import User,Shift
from schemas import UserCreate, UserResponse

router = APIRouter(
    prefix="/users",
    tags=["users"]
)


@router.get("/", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.id).all()


@router.post("/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="このメールアドレスはすでに登録されています"
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
            detail="このメールアドレスはすでに登録されています"
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

    related_shifts = db.query(Shift).filter(Shift.user_id == user_id).all()

    for shift in related_shifts:
        db.delete(shift)

    db.delete(user)
    db.commit()

    return {
        "message": "ユーザーを削除しました",
        "user_id": user_id
    }