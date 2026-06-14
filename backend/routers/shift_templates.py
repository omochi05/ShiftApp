from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Notification, Shift, ShiftTemplate
from schemas import (
    ApplyShiftTemplateRequest,
    CreateTemplateFromWeekRequest,
    ShiftResponse,
    ShiftTemplateCreate,
    ShiftTemplateResponse,
    ShiftTemplateUpdate,
)

router = APIRouter(
    prefix="/shift-templates",
    tags=["shift-templates"],
)


def format_time(value):
    return str(value)[:5]


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str,
    related_shift_id: int | None = None,
    created_by: int | None = None,
):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        related_shift_id=related_shift_id,
        is_read=False,
    )

    if hasattr(notification, "created_by"):
        notification.created_by = created_by

    db.add(notification)


@router.get("/", response_model=list[ShiftTemplateResponse])
def get_shift_templates(db: Session = Depends(get_db)):
    templates = (
        db.query(ShiftTemplate)
        .order_by(ShiftTemplate.weekday, ShiftTemplate.start_time)
        .all()
    )

    return templates


@router.post("/", response_model=ShiftTemplateResponse)
def create_shift_template(
    template: ShiftTemplateCreate,
    db: Session = Depends(get_db),
):
    if template.weekday < 0 or template.weekday > 6:
        raise HTTPException(
            status_code=400,
            detail="weekday は 0〜6 で指定してください",
        )

    existing = (
        db.query(ShiftTemplate)
        .filter(ShiftTemplate.weekday == template.weekday)
        .filter(ShiftTemplate.user_id == template.user_id)
        .filter(ShiftTemplate.start_time == template.start_time)
        .filter(ShiftTemplate.end_time == template.end_time)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="同じ曜日・従業員・時間のテンプレートはすでに存在します",
        )

    try:
        new_template = ShiftTemplate(
            weekday=template.weekday,
            user_id=template.user_id,
            start_time=template.start_time,
            end_time=template.end_time,
            break_minutes=template.break_minutes,
            created_by=template.created_by,
        )

        db.add(new_template)
        db.commit()
        db.refresh(new_template)

        return new_template

    except Exception as error:
        db.rollback()
        print("テンプレート作成に失敗しました:", error)
        raise HTTPException(
            status_code=500,
            detail=f"テンプレート作成に失敗しました: {error}",
        )


# /from-week と /apply は /{template_id} より上に置く
@router.post("/from-week", response_model=list[ShiftTemplateResponse])
def create_templates_from_week(
    request: CreateTemplateFromWeekRequest,
    db: Session = Depends(get_db),
):
    week_start = request.week_start_date
    week_end = week_start + timedelta(days=6)

    week_shifts = (
        db.query(Shift)
        .filter(Shift.work_date >= week_start)
        .filter(Shift.work_date <= week_end)
        .order_by(Shift.work_date, Shift.start_time)
        .all()
    )

    if len(week_shifts) == 0:
        raise HTTPException(
            status_code=400,
            detail="この週にはテンプレート化できるシフトがありません",
        )

    created_templates = []

    try:
        # 既存テンプレートを全削除して、この週を新しい固定テンプレートにする
        db.query(ShiftTemplate).delete(synchronize_session=False)

        for shift in week_shifts:
            # Python weekday: 月=0, 火=1, ... 日=6
            # アプリ側: 日=0, 月=1, ... 土=6
            app_weekday = (shift.work_date.weekday() + 1) % 7

            new_template = ShiftTemplate(
                weekday=app_weekday,
                user_id=shift.user_id,
                start_time=shift.start_time,
                end_time=shift.end_time,
                break_minutes=shift.break_minutes,
                created_by=request.created_by,
            )

            db.add(new_template)
            created_templates.append(new_template)

        db.commit()

        for template in created_templates:
            db.refresh(template)

        return created_templates

    except Exception as error:
        db.rollback()
        print("週シフトからテンプレート作成に失敗しました:", error)
        raise HTTPException(
            status_code=500,
            detail=f"週シフトからテンプレート作成に失敗しました: {error}",
        )


@router.post("/apply", response_model=list[ShiftResponse])
def apply_shift_templates(
    request: ApplyShiftTemplateRequest,
    db: Session = Depends(get_db),
):
    templates = (
        db.query(ShiftTemplate)
        .order_by(ShiftTemplate.weekday, ShiftTemplate.start_time)
        .all()
    )

    if len(templates) == 0:
        raise HTTPException(
            status_code=400,
            detail="反映できるテンプレートがありません",
        )

    created_shifts = []

    try:
        for template in templates:
            # template.weekday は 日=0, 月=1, ... 土=6
            # week_start_date は月曜日なので、月=0, 火=1, ... 日=6 に変換する
            days_from_monday = 6 if template.weekday == 0 else template.weekday - 1

            target_date = request.week_start_date + timedelta(days=days_from_monday)

            existing_shift = (
                db.query(Shift)
                .filter(Shift.user_id == template.user_id)
                .filter(Shift.work_date == target_date)
                .filter(Shift.start_time == template.start_time)
                .filter(Shift.end_time == template.end_time)
                .first()
            )

            if existing_shift:
                continue

            new_shift = Shift(
                user_id=template.user_id,
                work_date=target_date,
                start_time=template.start_time,
                end_time=template.end_time,
                break_minutes=template.break_minutes,
                created_by=request.created_by,
            )

            db.add(new_shift)
            db.flush()

            create_notification(
                db=db,
                user_id=new_shift.user_id,
                title="新しいシフトが登録されました",
                message=(
                    f"{new_shift.work_date} "
                    f"{format_time(new_shift.start_time)}〜{format_time(new_shift.end_time)} "
                    "のシフトが登録されました。"
                ),
                notification_type="shift_confirmed",
                related_shift_id=new_shift.id,
                created_by=request.created_by,
            )

            created_shifts.append(new_shift)

        db.commit()

        for shift in created_shifts:
            db.refresh(shift)

        return created_shifts

    except Exception as error:
        db.rollback()
        print("テンプレート反映に失敗しました:", error)
        raise HTTPException(
            status_code=500,
            detail=f"テンプレート反映に失敗しました: {error}",
        )


@router.put("/{template_id}", response_model=ShiftTemplateResponse)
def update_shift_template(
    template_id: int,
    template: ShiftTemplateUpdate,
    db: Session = Depends(get_db),
):
    existing_template = (
        db.query(ShiftTemplate)
        .filter(ShiftTemplate.id == template_id)
        .first()
    )

    if existing_template is None:
        raise HTTPException(
            status_code=404,
            detail="テンプレートが見つかりません",
        )

    if template.weekday < 0 or template.weekday > 6:
        raise HTTPException(
            status_code=400,
            detail="weekday は 0〜6 で指定してください",
        )

    duplicated = (
        db.query(ShiftTemplate)
        .filter(ShiftTemplate.id != template_id)
        .filter(ShiftTemplate.weekday == template.weekday)
        .filter(ShiftTemplate.user_id == template.user_id)
        .filter(ShiftTemplate.start_time == template.start_time)
        .filter(ShiftTemplate.end_time == template.end_time)
        .first()
    )

    if duplicated:
        raise HTTPException(
            status_code=400,
            detail="同じ曜日・従業員・時間のテンプレートはすでに存在します",
        )

    try:
        existing_template.weekday = template.weekday
        existing_template.user_id = template.user_id
        existing_template.start_time = template.start_time
        existing_template.end_time = template.end_time
        existing_template.break_minutes = template.break_minutes
        existing_template.created_by = template.created_by

        db.commit()
        db.refresh(existing_template)

        return existing_template

    except Exception as error:
        db.rollback()
        print("テンプレート更新に失敗しました:", error)
        raise HTTPException(
            status_code=500,
            detail=f"テンプレート更新に失敗しました: {error}",
        )


@router.delete("/{template_id}")
def delete_shift_template(
    template_id: int,
    db: Session = Depends(get_db),
):
    template = (
        db.query(ShiftTemplate)
        .filter(ShiftTemplate.id == template_id)
        .first()
    )

    if template is None:
        raise HTTPException(
            status_code=404,
            detail="テンプレートが見つかりません",
        )

    try:
        db.delete(template)
        db.commit()

        return {
            "message": "テンプレートを削除しました",
            "template_id": template_id,
        }

    except Exception as error:
        db.rollback()
        print("テンプレート削除に失敗しました:", error)
        raise HTTPException(
            status_code=500,
            detail=f"テンプレート削除に失敗しました: {error}",
        )