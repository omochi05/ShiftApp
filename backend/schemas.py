# =========================
# Shift Templates
# =========================

class ShiftTemplateCreate(BaseModel):
    template_group_id: str | None = None
    template_name: str | None = None
    week_start: date | None = None
    week_end: date | None = None
    weekday: int
    user_id: int
    start_time: time
    end_time: time
    break_minutes: int = 0
    created_by: int | None = None


class ShiftTemplateUpdate(BaseModel):
    template_group_id: str | None = None
    template_name: str | None = None
    week_start: date | None = None
    week_end: date | None = None
    weekday: int
    user_id: int
    start_time: time
    end_time: time
    break_minutes: int = 0
    created_by: int | None = None


class ShiftTemplateResponse(BaseModel):
    id: int
    template_group_id: str
    template_name: str
    week_start: date | None = None
    week_end: date | None = None
    weekday: int
    user_id: int
    start_time: time
    end_time: time
    break_minutes: int
    created_by: int | None = None

    class Config:
        from_attributes = True


class ShiftTemplateGroupResponse(BaseModel):
    template_group_id: str
    template_name: str
    week_start: date | None = None
    week_end: date | None = None
    count: int


class ApplyShiftTemplateRequest(BaseModel):
    week_start_date: date
    created_by: int | None = None
    template_group_id: str


class CreateTemplateFromWeekRequest(BaseModel):
    week_start_date: date
    created_by: int | None = None
    template_name: str | None = None