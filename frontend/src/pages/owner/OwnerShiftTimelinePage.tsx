import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import "./OwnerShiftTimelinePage.css";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type Shift = {
  id: number;
  user_id: number;
  user_name: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
};

type ShiftTemplate = {
  id: number;
  name?: string;
  template_name?: string;
  title?: string;
  shifts?: TemplateShift[];
  items?: TemplateShift[];
  details?: TemplateShift[];
};

type TemplateShift = {
  user_id?: number;
  user_name?: string;
  name?: string;
  weekday?: number;
  day_of_week?: number;
  week_day?: number;
  start_time: string;
  end_time: string;
  break_minutes?: number;
};

type WeekDay = {
  date: string;
  label: string;
  dayLabel: string;
  weekdayIndex: number;
};

type TimelineShift = Shift & {
  lane: number;
};

const hourLabels = [
  "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17",
  "18", "19", "20", "21", "22", "23", "0", "1", "2", "3", "4", "5", "6",
];

const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

function getTodayDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getMonday(value: string) {
  const date = toDate(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function getTimelineStartMinutes(time: string) {
  let minutes = timeToMinutes(time);

  if (minutes < 6 * 60) {
    minutes += 24 * 60;
  }

  return minutes;
}

function getTimelineEndMinutes(startTime: string, endTime: string) {
  const originalStart = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);

  if (end <= originalStart) {
    end += 24 * 60;
  }

  if (end <= 6 * 60) {
    end += 24 * 60;
  }

  return end;
}

function getShiftDurationMinutes(shift: Shift) {
  const start = timeToMinutes(shift.start_time);
  let end = timeToMinutes(shift.end_time);

  if (end <= start) {
    end += 24 * 60;
  }

  return Math.max(0, end - start - (shift.break_minutes || 0));
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours <= 0) return `${mins}分`;
  if (mins === 0) return `${hours}時間`;

  return `${hours}時間${mins}分`;
}

function getShiftBarStyle(shift: Shift) {
  const dayStart = 6 * 60;
  const dayEnd = 30 * 60;
  const totalMinutes = dayEnd - dayStart;

  const start = getTimelineStartMinutes(shift.start_time);
  const end = getTimelineEndMinutes(shift.start_time, shift.end_time);

  const clampedStart = Math.max(dayStart, start);
  const clampedEnd = Math.min(dayEnd, end);

  const left = ((clampedStart - dayStart) / totalMinutes) * 100;
  const width = Math.max(2, ((clampedEnd - clampedStart) / totalMinutes) * 100);

  return {
    left: `${left}%`,
    width: `${width}%`,
  };
}

function formatApiError(error: any, fallbackMessage: string) {
  const detail = error.response?.data?.detail;

  if (Array.isArray(detail)) {
    return `${fallbackMessage}：${detail.map((d) => d.msg).join(" / ")}`;
  }

  if (detail) return `${fallbackMessage}：${detail}`;
  if (error.response?.status) return `${fallbackMessage}：HTTP ${error.response.status}`;

  return `${fallbackMessage}：APIに接続できませんでした`;
}

function getTemplateName(template: ShiftTemplate) {
  return template.name || template.template_name || template.title || `テンプレート${template.id}`;
}

function getTemplateItems(template: ShiftTemplate) {
  return template.shifts || template.items || template.details || [];
}

function getTemplateWeekday(item: TemplateShift) {
  const value = item.weekday ?? item.day_of_week ?? item.week_day ?? 1;

  if (value >= 0 && value <= 6) return value;
  if (value >= 1 && value <= 7) return value % 7;

  return 1;
}

function getUserNameById(users: User[], userId?: number) {
  if (!userId) return "";
  return users.find((user) => user.id === userId)?.name || "";
}

function assignLanes(shifts: Shift[]): TimelineShift[] {
  const sorted = [...shifts].sort((a, b) => {
    const aStart = getTimelineStartMinutes(a.start_time);
    const bStart = getTimelineStartMinutes(b.start_time);

    if (aStart !== bStart) return aStart - bStart;

    const aEnd = getTimelineEndMinutes(a.start_time, a.end_time);
    const bEnd = getTimelineEndMinutes(b.start_time, b.end_time);

    return aEnd - bEnd;
  });

  const laneEndTimes: number[] = [];

  return sorted.map((shift) => {
    const start = getTimelineStartMinutes(shift.start_time);
    const end = getTimelineEndMinutes(shift.start_time, shift.end_time);

    let lane = laneEndTimes.findIndex((laneEnd) => start >= laneEnd);

    if (lane === -1) {
      lane = laneEndTimes.length;
      laneEndTimes.push(end);
    } else {
      laneEndTimes[lane] = end;
    }

    return {
      ...shift,
      lane,
    };
  });
}

export default function OwnerShiftTimelinePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);

  const [targetDate, setTargetDate] = useState(getTodayDate());
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [loading, setLoading] = useState(true);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [message, setMessage] = useState("");

  const employeeUsers = useMemo(() => {
    return users.filter((user) => user.role === "employee");
  }, [users]);

  const weekDays = useMemo<WeekDay[]>(() => {
    const monday = getMonday(targetDate);

    return Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(monday, index);
      const dateText = formatDate(date);

      return {
        date: dateText,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        dayLabel: dayNames[date.getDay()],
        weekdayIndex: date.getDay(),
      };
    });
  }, [targetDate]);

  const weekStart = weekDays[0]?.date;
  const weekEnd = weekDays[6]?.date;

  const weeklyShifts = useMemo(() => {
    if (!weekStart || !weekEnd) return [];

    return shifts
      .filter((shift) => shift.work_date >= weekStart && shift.work_date <= weekEnd)
      .sort((a, b) => {
        if (a.work_date < b.work_date) return -1;
        if (a.work_date > b.work_date) return 1;
        if (a.start_time < b.start_time) return -1;
        if (a.start_time > b.start_time) return 1;
        return a.id - b.id;
      });
  }, [shifts, weekStart, weekEnd]);

  const totalWeeklyMinutes = useMemo(() => {
    return weeklyShifts.reduce((sum, shift) => {
      return sum + getShiftDurationMinutes(shift);
    }, 0);
  }, [weeklyShifts]);

  const workingEmployeeCount = useMemo(() => {
    return new Set(weeklyShifts.map((shift) => shift.user_id)).size;
  }, [weeklyShifts]);

  const selectedTemplate = useMemo(() => {
    return templates.find((template) => String(template.id) === selectedTemplateId);
  }, [templates, selectedTemplateId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setMessage("");

      const [usersRes, shiftsRes] = await Promise.all([
        api.get<User[]>("/users/"),
        api.get<Shift[]>("/shifts/"),
      ]);

      setUsers(usersRes.data);
      setShifts(shiftsRes.data);
    } catch (error: any) {
      console.error("シフト表データ取得失敗:", error);
      setMessage(formatApiError(error, "シフト表データの取得に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get<ShiftTemplate[]>("/shift-templates/");
      setTemplates(res.data);
    } catch (firstError) {
      try {
        const res = await api.get<ShiftTemplate[]>("/shift_templates/");
        setTemplates(res.data);
      } catch (secondError) {
        console.warn("テンプレート取得失敗:", firstError, secondError);
        setTemplates([]);
      }
    }
  };

  useEffect(() => {
    fetchData();
    fetchTemplates();
  }, []);

  const goPrevWeek = () => {
    const date = toDate(targetDate);
    date.setDate(date.getDate() - 7);
    setTargetDate(formatDate(date));
  };

  const goNextWeek = () => {
    const date = toDate(targetDate);
    date.setDate(date.getDate() + 7);
    setTargetDate(formatDate(date));
  };

  const goThisWeek = () => {
    setTargetDate(getTodayDate());
  };

  const getShiftsByDate = (date: string) => {
    return weeklyShifts.filter((shift) => shift.work_date === date);
  };

  const getPositionedShiftsByDate = (date: string) => {
    return assignLanes(getShiftsByDate(date));
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) {
      setMessage("反映するテンプレートを選択してください");
      return;
    }

    const items = getTemplateItems(selectedTemplate);

    if (items.length === 0) {
      setMessage("このテンプレートにはシフトが登録されていません");
      return;
    }

    const ok = window.confirm(
      `${getTemplateName(selectedTemplate)} を ${weekStart} 〜 ${weekEnd} に反映しますか？`
    );

    if (!ok) return;

    try {
      setTemplateLoading(true);
      setMessage("");

      const requests = items.map((item) => {
        const weekday = getTemplateWeekday(item);
        const targetDay = weekDays.find((day) => day.weekdayIndex === weekday);

        const userId =
          item.user_id ||
          employeeUsers.find(
            (user) =>
              user.name === item.user_name ||
              user.name === item.name
          )?.id;

        if (!targetDay || !userId) {
          return null;
        }

        return api.post("/shifts/", {
          user_id: userId,
          work_date: targetDay.date,
          start_time: item.start_time,
          end_time: item.end_time,
          break_minutes: item.break_minutes || 0,
        });
      });

      const validRequests = requests.filter(Boolean);

      if (validRequests.length === 0) {
        setMessage("テンプレート内の従業員情報をシフトに変換できませんでした");
        return;
      }

      await Promise.all(validRequests);

      setMessage(`テンプレートを${validRequests.length}件反映しました`);
      await fetchData();
    } catch (error: any) {
      console.error("テンプレート反映失敗:", error);
      setMessage(formatApiError(error, "テンプレート反映に失敗しました"));
    } finally {
      setTemplateLoading(false);
    }
  };

  return (
    <div className="owner-shift-timeline-page">
      <section className="owner-shift-timeline-hero">
        <div>
          <p className="owner-shift-timeline-label">Weekly Shift Board</p>
          <h2>シフト表</h2>
          <p>
            印刷用シフト表に近い形式で、対象週のシフトを確認できます。
            テンプレートを選択して、この週に反映することもできます。
          </p>
        </div>
      </section>

      <section className="owner-shift-control-panel">
        <div className="owner-shift-week-control">
          <label>
            対象週
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </label>

          <div className="owner-shift-week-range">
            {weekStart} 〜 {weekEnd}
          </div>

          <div className="owner-shift-week-buttons">
            <button type="button" onClick={goPrevWeek}>前の週</button>
            <button type="button" onClick={goThisWeek}>今週</button>
            <button type="button" onClick={goNextWeek}>次の週</button>
            <button type="button" onClick={fetchData}>再読み込み</button>
          </div>
        </div>

        <div className="owner-shift-template-control">
          <label>
            テンプレート選択
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              <option value="">選択してください</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {getTemplateName(template)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleApplyTemplate}
            disabled={templateLoading || !selectedTemplateId}
          >
            {templateLoading ? "反映中..." : "この週にテンプレートを反映"}
          </button>
        </div>
      </section>

      <section className="owner-shift-summary-grid">
        <div className="owner-shift-summary-card">
          <span>週間シフト数</span>
          <strong>{weeklyShifts.length}件</strong>
        </div>

        <div className="owner-shift-summary-card">
          <span>週間総勤務時間</span>
          <strong>{formatDuration(totalWeeklyMinutes)}</strong>
        </div>

        <div className="owner-shift-summary-card">
          <span>勤務予定の従業員</span>
          <strong>{workingEmployeeCount}人</strong>
        </div>
      </section>

      {message && <p className="owner-shift-message">{message}</p>}

      {loading ? (
        <section className="owner-shift-loading">読み込み中...</section>
      ) : (
        <section className="owner-shift-print-like-board">
          <div className="owner-shift-print-header">
            <div>
              <h3>シフト表</h3>
              <p>{weekStart} 〜 {weekEnd}</p>
            </div>

            <strong>作成者：オーナー</strong>
          </div>

          <div className="owner-shift-board-scroll">
            <div className="owner-shift-board-canvas">
              {weekDays.map((day) => {
                const positionedShifts = getPositionedShiftsByDate(day.date);
                const maxLane =
                  positionedShifts.length === 0
                    ? 2
                    : Math.max(...positionedShifts.map((shift) => shift.lane)) + 1;

                const bodyHeight = Math.max(82, maxLane * 34 + 12);

                return (
                  <article key={day.date} className="owner-shift-print-day">
                    <div className="owner-shift-date-cell">
                      <strong>{day.label}</strong>
                      <span>（{day.dayLabel}）</span>
                    </div>

                    <div className="owner-shift-day-timeline">
                      <div className="owner-shift-hour-header">
                        {hourLabels.map((hour, index) => (
                          <div key={`${day.date}-${hour}-${index}`}>
                            {hour}
                          </div>
                        ))}
                      </div>

                      <div
                        className="owner-shift-lane-area"
                        style={{ height: `${bodyHeight}px` }}
                      >
                        <div className="owner-shift-vertical-lines">
                          {hourLabels.slice(0, -1).map((hour, index) => (
                            <span key={`${day.date}-line-${hour}-${index}`} />
                          ))}
                        </div>

                        {positionedShifts.map((shift) => (
                          <div
                            key={shift.id}
                            className="owner-shift-name-bar"
                            style={{
                              ...getShiftBarStyle(shift),
                              top: `${shift.lane * 34 + 8}px`,
                            }}
                            title={`${shift.user_name} ${shift.start_time}〜${shift.end_time}`}
                          >
                            {shift.user_name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}