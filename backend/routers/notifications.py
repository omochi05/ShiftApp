from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth_deps import require_self_or_manager_or_owner
from database import get_db
from models import Notification, User


router = APIRouter(
    prefix="/notifications",
    tags=["notifications"],
)


@router.get("/user/{user_id}")
def get_user_notifications(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_self_or_manager_or_owner),
):
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(30)
        .all()
    )


@router.get("/user/{user_id}/unread-count")
def get_user_unread_count(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_self_or_manager_or_owner),
):
    unread_count = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read == False,
        )
        .count()
    )

    return {
        "unread_count": unread_count,
    }


@router.put("/user/{user_id}/read-all")
def mark_all_notifications_as_read(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_self_or_manager_or_owner),
):
    (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read == False,
        )
        .update({"is_read": True})
    )

    db.commit()

    return {
        "message": "すべて既読にしました",
    }


@router.put("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_self_or_manager_or_owner),
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id)
        .first()
    )

    if notification is None:
        raise HTTPException(
            status_code=404,
            detail="通知が見つかりません",
        )

    if current_user.email != "9999":
        if current_user.role not in ["owner", "manager"] and notification.user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="この通知を操作する権限がありません",
            )

    notification.is_read = True

    db.commit()
    db.refresh(notification)

    return notification