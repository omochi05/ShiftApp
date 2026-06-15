import calendar
from datetime import date
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth_deps import get_current_user, require_manager_or_owner
from database import get_db
from models import MonthlyShiftTemplate, Notification, Shift, User
from schemas import (
    ApplyMonthlyTemplateRequest,
    CreateMonthlyTemplateFromMonthRequest,
    MonthlyShiftTemplateResponse,
    MonthlyTemplateGroupResponse,
)


router = APIRouter(
    prefix="/monthly-shift-templates",
    tags=["monthly-shift-templates"],
)


def get_last_day(year: int, month: int):
    return calendar.monthrange(year, month)[1]


def validate_year_month(year: int, month: int):
    if year < 2020 or year > 2100:
        raise HTTPException(
            status_code=400,
            detail="年が不正です",
        )

    if month < 1 or month > 12:
        raise HTTPException(
            status_code=400,
            detail="月が不正です",
        )


def serialize_shift(shift: Shift):
    return {
        "id": shift.id,
        "user_id": shift.user_id,
        "work_date": shift.work_date,
        "start_time": shift.start_time,
        "end_time": shift.end_time,
        "break_minutes": shift.break_minutes,
        "created_by": getattr(shift, "created_by", None),
        "created_at": getattr(shift, "created_at", None),
        "updated_at": getattr(shift, "updated_at", None),
    }


@router.get("/groups", response_model=list[MonthlyTemplateGroupResponse])
def get_monthly_template_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(
            MonthlyShiftTemplate.template_group_id,
            MonthlyShiftTemplate.template_name,
            MonthlyShiftTemplate.source_year,
            MonthlyShiftTemplate.source_month,
            func.count(MonthlyShiftTemplate.id).label("count"),
        )
        .group_by(
            MonthlyShiftTemplate.template_group_id,
            MonthlyShiftTemplate.template_name,
            MonthlyShiftTemplate.source_year,
            MonthlyShiftTemplate.source_month,
        )
        .order_by(
            MonthlyShiftTemplate.source_year.desc(),
            MonthlyShiftTemplate.source_month.desc(),
            MonthlyShiftTemplate.template_name,
        )
        .all()
    )

    return [
        {
            "template_group_id": row.template_group_id,
            "template_name": row.template_name,
            "source_year": row.source_year,
            "source_month": row.source_month,
            "count": row.count,
        }
        for row in rows
    ]


@router.get("/{template_group_id}", response_model=list[MonthlyShiftTemplateResponse])
def get_monthly_template_items(
    template_group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    templates = (
        db.query(MonthlyShiftTemplate)
        .filter(MonthlyShiftTemplate.template_group_id == template_group_id)
        .order_by(
            MonthlyShiftTemplate.day,
            MonthlyShiftTemplate.start_time,
            MonthlyShiftTemplate.user_id,
        )
        .all()
    )

    return templates


@router.post("/from-month", response_model=list[MonthlyShiftTemplateResponse])
def create_monthly_template_from_month(
    request: CreateMonthlyTemplateFromMonthRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_owner),
):
    validate_year_month(request.source_year, request.source_month)

    source_year = request.source_year
    source_month = request.source_month

    shifts = (
        db.query(Shift)
        .filter(func.extract("year", Shift.work_date) == source_year)
        .filter(func.extract("month", Shift.work_date) == source_month)
        .order_by(Shift.work_date, Shift.start_time, Shift.user_id)
        .all()
    )

    if len(shifts) == 0:
        raise HTTPException(
            status_code=400,
            detail="この月にはテンプレート化できるシフトがありません",
        )

    template_group_id = str(uuid4())
    template_name = (
        request.template_name
        or f"{source_year}年{source_month}月テンプレート"
    )

    created_templates = []
    template_keys = set()

    try:
        for shift in shifts:
            key = (
                shift.work_date.day,
                shift.user_id,
                shift.start_time,
                shift.end_time,
                shift.break_minutes or 0,
            )

            if key in template_keys:
                continue

            template_keys.add(key)

            new_template = MonthlyShiftTemplate(
                template_group_id=template_group_id,
                template_name=template_name,
                source_year=source_year,
                source_month=source_month,
                day=shift.work_date.day,
                user_id=shift.user_id,
                start_time=shift.start_time,
                end_time=shift.end_time,
                break_minutes=shift.break_minutes or 0,
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
        print("月テンプレート保存に失敗しました:", repr(error))

        raise HTTPException(
            status_code=500,
            detail=f"月テンプレート保存に失敗しました: {str(error)}",
        )


@router.post("/apply")
def apply_monthly_template(
    request: ApplyMonthlyTemplateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_owner),
):
    validate_year_month(request.target_year, request.target_month)

    templates = (
        db.query(MonthlyShiftTemplate)
        .filter(MonthlyShiftTemplate.template_group_id == request.template_group_id)
        .order_by(
            MonthlyShiftTemplate.day,
            MonthlyShiftTemplate.start_time,
            MonthlyShiftTemplate.user_id,
        )
        .all()
    )

    if len(templates) == 0:
        raise HTTPException(
            status_code=400,
            detail="反映できる月テンプレートがありません",
        )

    last_day = get_last_day(request.target_year, request.target_month)

    created_shifts = []
    skipped_count = 0

    try:
        for template in templates:
            if template.day > last_day:
                skipped_count += 1
                continue

            work_date = date(
                request.target_year,
                request.target_month,
                template.day,
            )

            existing_shift = (
                db.query(Shift)
                .filter(Shift.user_id == template.user_id)
                .filter(Shift.work_date == work_date)
                .filter(Shift.start_time == template.start_time)
                .filter(Shift.end_time == template.end_time)
                .first()
            )

            if existing_shift:
                skipped_count += 1
                continue

            new_shift = Shift(
                user_id=template.user_id,
                work_date=work_date,
                start_time=template.start_time,
                end_time=template.end_time,
                break_minutes=template.break_minutes,
                created_by=request.created_by,
            )

            db.add(new_shift)
            db.flush()

            notification = Notification(
                user_id=template.user_id,
                title="シフトが追加されました",
                message=f"{work_date} のシフトが追加されました",
                notification_type="shift_confirmed",
                related_shift_id=new_shift.id,
                is_read=False,
            )

            db.add(notification)
            created_shifts.append(new_shift)

        db.commit()

        for shift in created_shifts:
            db.refresh(shift)

        return {
            "message": "月テンプレートを反映しました",
            "created_count": len(created_shifts),
            "skipped_count": skipped_count,
            "shifts": [serialize_shift(shift) for shift in created_shifts],
        }

    except Exception as error:
        db.rollback()
        print("月テンプレート反映に失敗しました:", repr(error))

        raise HTTPException(
            status_code=500,
            detail=f"月テンプレート反映に失敗しました: {str(error)}",
        )


@router.delete("/group/{template_group_id}")
def delete_monthly_template_group(
    template_group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_owner),
):
    templates = (
        db.query(MonthlyShiftTemplate)
        .filter(MonthlyShiftTemplate.template_group_id == template_group_id)
        .all()
    )

    if len(templates) == 0:
        raise HTTPException(
            status_code=404,
            detail="月テンプレートが見つかりません",
        )

    try:
        deleted_count = len(templates)

        (
            db.query(MonthlyShiftTemplate)
            .filter(MonthlyShiftTemplate.template_group_id == template_group_id)
            .delete(synchronize_session=False)
        )

        db.commit()

        return {
            "message": "月テンプレートを削除しました",
            "template_group_id": template_group_id,
            "deleted_count": deleted_count,
        }

    except Exception as error:
        db.rollback()
        print("月テンプレート削除に失敗しました:", repr(error))

        raise HTTPException(
            status_code=500,
            detail=f"月テンプレート削除に失敗しました: {str(error)}",
        )