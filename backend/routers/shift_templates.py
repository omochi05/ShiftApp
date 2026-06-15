from datetime import timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth_deps import get_current_user, require_manager_or_owner
from database import get_db
from models import Notification, Shift, ShiftTemplate, User
from schemas import (
    ApplyShiftTemplateRequest,
    CreateTemplateFromWeekRequest,
    ShiftTemplateCreate,
    ShiftTemplateGroupResponse,
    ShiftTemplateResponse,
    ShiftTemplateUpdate,
)


router = APIRouter(
    prefix="/shift-templates",
    tags=["shift-templates"],
)


def get_week_end(week_start_date):
    return week_start_date + timedelta(days=6)


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


@router.get("/", response_model=list[ShiftTemplateResponse])
def get_shift_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    templates = (
        db.query(ShiftTemplate)
        .order_by(
            ShiftTemplate.week_start.desc().nullslast(),
            ShiftTemplate.template_name,
            ShiftTemplate.weekday,
            ShiftTemplate.start_time,
        )
        .all()
    )

    return templates


@router.get("/groups", response_model=list[ShiftTemplateGroupResponse])
def get_shift_template_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(
            ShiftTemplate.template_group_id,
            ShiftTemplate.template_name,
            ShiftTemplate.week_start,
            ShiftTemplate.week_end,
            func.count(ShiftTemplate.id).label("count"),
        )
        .group_by(
            ShiftTemplate.template_group_id,
            ShiftTemplate.template_name,
            ShiftTemplate.week_start,
            ShiftTemplate.week_end,
        )
        .order_by(
            ShiftTemplate.week_start.desc().nullslast(),
            ShiftTemplate.template_name,
        )
        .all()
    )

    return [
        {
            "template_group_id": row.template_group_id,
            "template_name": row.template_name,
            "week_start": row.week_start,
            "week_end": row.week_end,
            "count": row.count,
        }
        for row in rows
    ]


@router.get("/group/{template_group_id}", response_model=list[ShiftTemplateResponse])
def get_shift_template_items(
    template_group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    templates = (
        db.query(ShiftTemplate)
        .filter(ShiftTemplate.template_group_id == template_group_id)
        .order_by(
            ShiftTemplate.weekday,
            ShiftTemplate.start_time,
            ShiftTemplate.user_id,
        )
        .all()
    )

    return templates


@router.post("/", response_model=ShiftTemplateResponse)
def create_shift_template(
    template: ShiftTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_owner),
):
    if template.weekday < 0 or template.weekday > 6:
        raise HTTPException(status_code=400, detail="曜日が不正です")

    template_group_id = template.template_group_id or str(uuid4())
    template_name = template.template_name or "テンプレート"

    existing_template = (
        db.query(ShiftTemplate)
        .filter(ShiftTemplate.template_group_id == template_group_id)
        .filter(ShiftTemplate.weekday == template.weekday)
        .filter(ShiftTemplate.user_id == template.user_id)
        .filter(ShiftTemplate.start_time == template.start_time)
        .filter(ShiftTemplate.end_time == template.end_time)
        .first()
    )

    if existing_template:
        raise HTTPException(
            status_code=400,
            detail="同じテンプレートがすでに登録されています",
        )

    try:
        new_template = ShiftTemplate(
            template_group_id=template_group_id,
            template_name=template_name,
            week_start=template.week_start,
            week_end=template.week_end,
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
        print("テンプレート作成に失敗しました:", repr(error))

        raise HTTPException(
            status_code=500,
            detail=f"テンプレート作成に失敗しました: {str(error)}",
        )


@router.post("/from-week", response_model=list[ShiftTemplateResponse])
def create_templates_from_week(
    request: CreateTemplateFromWeekRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_owner),
):
    week_start = request.week_start_date
    week_end = get_week_end(week_start)

    shifts = (
        db.query(Shift)
        .filter(Shift.work_date >= week_start)
        .filter(Shift.work_date <= week_end)
        .order_by(Shift.work_date, Shift.start_time, Shift.user_id)
        .all()
    )

    if len(shifts) == 0:
        raise HTTPException(
            status_code=400,
            detail="この週にはテンプレート化できるシフトがありません",
        )

    template_group_id = str(uuid4())
    template_name = request.template_name or f"{week_start}〜{week_end} テンプレート"

    created_templates = []
    template_keys = set()

    try:
        for shift in shifts:
            # Python weekday: 月=0, 火=1 ... 日=6
            # アプリ側: 日=0, 月=1 ... 土=6
            python_weekday = shift.work_date.weekday()
            app_weekday = 0 if python_weekday == 6 else python_weekday + 1

            key = (
                app_weekday,
                shift.user_id,
                shift.start_time,
                shift.end_time,
                shift.break_minutes or 0,
            )

            if key in template_keys:
                continue

            template_keys.add(key)

            new_template = ShiftTemplate(
                template_group_id=template_group_id,
                template_name=template_name,
                week_start=week_start,
                week_end=week_end,
                weekday=app_weekday,
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
        print("週テンプレート化に失敗しました:", repr(error))

        raise HTTPException(
            status_code=500,
            detail=f"週テンプレート化に失敗しました: {str(error)}",
        )


@router.post("/apply")
def apply_shift_templates(
    request: ApplyShiftTemplateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_owner),
):
    week_start = request.week_start_date

    templates = (
        db.query(ShiftTemplate)
        .filter(ShiftTemplate.template_group_id == request.template_group_id)
        .order_by(ShiftTemplate.weekday, ShiftTemplate.start_time, ShiftTemplate.user_id)
        .all()
    )

    if len(templates) == 0:
        raise HTTPException(
            status_code=400,
            detail="反映できるテンプレートがありません",
        )

    created_shifts = []
    skipped_count = 0

    try:
        for template in templates:
            # template.weekday は 日=0, 月=1 ... 土=6
            days_from_monday = 6 if template.weekday == 0 else template.weekday - 1
            work_date = week_start + timedelta(days=days_from_monday)

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
            "message": "テンプレートを反映しました",
            "created_count": len(created_shifts),
            "skipped_count": skipped_count,
            "shifts": [serialize_shift(shift) for shift in created_shifts],
        }

    except Exception as error:
        db.rollback()
        print("テンプレート反映に失敗しました:", repr(error))

        raise HTTPException(
            status_code=500,
            detail=f"テンプレート反映に失敗しました: {str(error)}",
        )


@router.put("/{template_id}", response_model=ShiftTemplateResponse)
def update_shift_template(
    template_id: int,
    template: ShiftTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_owner),
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
        raise HTTPException(status_code=400, detail="曜日が不正です")

    try:
        existing_template.template_group_id = (
            template.template_group_id or existing_template.template_group_id
        )
        existing_template.template_name = (
            template.template_name or existing_template.template_name
        )
        existing_template.week_start = template.week_start
        existing_template.week_end = template.week_end
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
        print("テンプレート更新に失敗しました:", repr(error))

        raise HTTPException(
            status_code=500,
            detail=f"テンプレート更新に失敗しました: {str(error)}",
        )


@router.delete("/{template_id}")
def delete_shift_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_owner),
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
        print("テンプレート削除に失敗しました:", repr(error))

        raise HTTPException(
            status_code=500,
            detail=f"テンプレート削除に失敗しました: {str(error)}",
        )


@router.delete("/group/{template_group_id}")
def delete_shift_template_group(
    template_group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_owner),
):
    templates = (
        db.query(ShiftTemplate)
        .filter(ShiftTemplate.template_group_id == template_group_id)
        .all()
    )

    if len(templates) == 0:
        raise HTTPException(
            status_code=404,
            detail="テンプレートが見つかりません",
        )

    try:
        deleted_count = len(templates)

        (
            db.query(ShiftTemplate)
            .filter(ShiftTemplate.template_group_id == template_group_id)
            .delete(synchronize_session=False)
        )

        db.commit()

        return {
            "message": "テンプレートを削除しました",
            "template_group_id": template_group_id,
            "deleted_count": deleted_count,
        }

    except Exception as error:
        db.rollback()
        print("テンプレート削除に失敗しました:", repr(error))

        raise HTTPException(
            status_code=500,
            detail=f"テンプレート削除に失敗しました: {str(error)}",
        )