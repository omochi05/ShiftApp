from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import OwnerLoginRequest, OwnerLoginResponse
from security import verify_password


router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


@router.post("/login", response_model=OwnerLoginResponse)
def owner_login(
    login_data: OwnerLoginRequest,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email == login_data.employee_number)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="従業員番号またはパスワードが違います",
        )

    if not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=401,
            detail="従業員番号またはパスワードが違います",
        )

    if user.role != "owner":
        raise HTTPException(
            status_code=403,
            detail="オーナーのみログインできます",
        )

    return OwnerLoginResponse(
        id=user.id,
        name=user.name,
        employee_number=user.email,
        role=user.role,
    )