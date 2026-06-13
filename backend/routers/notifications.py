from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/user/{user_id}")
def get_user_notifications(user_id: int, db: Session = Depends(get_db)):
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(30)
        .all()
    )

    return notifications


@router.get("/user/{user_id}/unread-count")
def get_unread_count(user_id: int, db: Session = Depends(get_db)):
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read == False,
        )
        .count()
    )

    return {"unread_count": count}


@router.put("/{notification_id}/read")
def mark_notification_as_read(notification_id: int, db: Session = Depends(get_db)):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id)
        .first()
    )

    if notification is None:
        raise HTTPException(status_code=404, detail="通知が見つかりません")

    notification.is_read = True
    db.commit()
    db.refresh(notification)

    return notification


@router.put("/user/{user_id}/read-all")
def mark_all_notifications_as_read(user_id: int, db: Session = Depends(get_db)):
    (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read == False,
        )
        .update({"is_read": True})
    )

    db.commit()

    return {"message": "すべて既読にしました"}