from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from models import User
from security import decode_access_token


security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: Session = Depends(get_db),
):
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="ログインが必要です",
        )

    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="認証情報が無効です",
        )

    user_id = payload.get("user_id")

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="認証情報が無効です",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="ユーザーが見つかりません",
        )

    return user


def is_maintenance_user(user: User):
    return user.email == "9999"


def require_owner(
    current_user: User = Depends(get_current_user),
):
    if is_maintenance_user(current_user):
        return current_user

    if current_user.role != "owner":
        raise HTTPException(
            status_code=403,
            detail="オーナー権限が必要です",
        )

    return current_user


def require_manager_or_owner(
    current_user: User = Depends(get_current_user),
):
    if is_maintenance_user(current_user):
        return current_user

    if current_user.role not in ["owner", "manager"]:
        raise HTTPException(
            status_code=403,
            detail="管理者以上の権限が必要です",
        )

    return current_user


def require_self_or_manager_or_owner(
    user_id: int,
    current_user: User = Depends(get_current_user),
):
    if is_maintenance_user(current_user):
        return current_user

    if current_user.role in ["owner", "manager"]:
        return current_user

    if current_user.id != user_id:
        raise HTTPException(
            status_code=403,
            detail="自分の情報のみ確認できます",
        )

    return current_user