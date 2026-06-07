from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Shift, ShiftTemplate
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


# 重要:
# /from-week と /apply は /{template_id} より上に書く
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

    # 既存テンプレートを全削除して、この週を新しい固定テンプレートにする
    db.query(ShiftTemplate).delete(synchronize_session=False)

    created_templates = []

    for shift in week_shifts:
        # Python weekday: 月=0, 火=1 ... 日=6
        # アプリ側: 日=0, 月=1 ... 土=6
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


@router.post("/apply", response_model=list[ShiftResponse])
def apply_shift_templates(
    request: ApplyShiftTemplateRequest,
    db: Session = Depends(get_db),
):
    templates = db.query(ShiftTemplate).all()

    created_shifts = []

    for template in templates:
        target_date = request.week_start_date + timedelta(days=template.weekday)

        existing_shift = (
            db.query(Shift)
            .filter(Shift.user_id == template.user_id)
            .filter(Shift.work_date == target_date)
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
        created_shifts.append(new_shift)

    db.commit()

    for shift in created_shifts:
        db.refresh(shift)

    return created_shifts


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

    existing_template.weekday = template.weekday
    existing_template.user_id = template.user_id
    existing_template.start_time = template.start_time
    existing_template.end_time = template.end_time
    existing_template.break_minutes = template.break_minutes
    existing_template.created_by = template.created_by

    db.commit()
    db.refresh(existing_template)

    return existing_template


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

    db.delete(template)
    db.commit()

    return {
        "message": "テンプレートを削除しました",
        "template_id": template_id,
    }

