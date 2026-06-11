import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import ShiftTimeline from "../../components/ShiftTimeline";
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
  user_name?: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  created_by?: number | null;
};

type ShiftForTimeline = {
  id: number;
  user_id: number;
  user_name: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  created_by?: number | null;
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

function getShiftDurationMinutes(shift: ShiftForTimeline) {
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

function formatApiError(error: any, fallbackMessage: string) {
  const detail = error.response?.data?.detail;

  if (Array.isArray(detail)) {
    return `${fallbackMessage}：${detail.map((d) => d.msg).join(" / ")}`;
  }

  if (detail) return `${fallbackMessage}：${detail}`;

  if (error.response?.status) {
    return `${fallbackMessage}：HTTP ${error.response.status}`;
  }

  return `${fallbackMessage}：APIに接続できませんでした`;
}

function getUserName(userId: number, users: User[]) {
  const user = users.find((item) => item.id === userId);
  return user?.name || "名前未設定";
}

function getTemplateName(template: ShiftTemplate) {
  return (
    template.name ||
    template.template_name ||
    template.title ||
    `テンプレート${template.id}`
  );
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

export default function OwnerShiftTimelinePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);

  const [targetDate, setTargetDate] = useState(getTodayDate());
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");

  const [loading, setLoading] = useState(true);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [message, setMessage] = useState("");

  const ownerName = localStorage.getItem("ownerName") || "オーナー";

  const employeeUsers = useMemo(() => {
    return users.filter((user) => user.role === "employee");
  }, [users]);

  const weekDays = useMemo(() => {
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

  const weeklyShifts = useMemo<ShiftForTimeline[]>(() => {
    if (!weekStart || !weekEnd) return [];

    return shifts
      .filter(
        (shift) => shift.work_date >= weekStart && shift.work_date <= weekEnd
      )
      .map((shift) => ({
        id: shift.id,
        user_id: shift.user_id,
        user_name:
          shift.user_name && shift.user_name.trim() !== ""
            ? shift.user_name
            : getUserName(shift.user_id, users),
        work_date: shift.work_date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        break_minutes: shift.break_minutes || 0,
        created_by: shift.created_by,
      }))
      .sort((a, b) => {
        if (a.work_date < b.work_date) return -1;
        if (a.work_date > b.work_date) return 1;
        if (a.start_time < b.start_time) return -1;
        if (a.start_time > b.start_time) return 1;
        return a.id - b.id;
      });
  }, [shifts, users, weekStart, weekEnd]);

  const totalWeeklyMinutes = useMemo(() => {
    return weeklyShifts.reduce((sum, shift) => {
      return sum + getShiftDurationMinutes(shift);
    }, 0);
  }, [weeklyShifts]);

  const workingEmployeeCount = useMemo(() => {
    return new Set(weeklyShifts.map((shift) => shift.user_id)).size;
  }, [weeklyShifts]);

  const selectedTemplate = useMemo(() => {
    return templates.find(
      (template) => String(template.id) === selectedTemplateId
    );
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

  const handleSaveWeekAsTemplate = async () => {
    if (weeklyShifts.length === 0) {
      setMessage("この週には保存できるシフトがありません");
      return;
    }

    const name =
      templateName.trim() || `シフトテンプレート ${weekStart}〜${weekEnd}`;

    const ok = window.confirm(
      `${weekStart}〜${weekEnd} のシフトを「${name}」として保存しますか？`
    );

    if (!ok) return;

    try {
      setTemplateLoading(true);
      setMessage("");

      const items = weeklyShifts.map((shift) => {
        const date = toDate(shift.work_date);

        return {
          user_id: shift.user_id,
          user_name: shift.user_name,
          weekday: date.getDay(),
          day_of_week: date.getDay(),
          week_day: date.getDay(),
          start_time: shift.start_time,
          end_time: shift.end_time,
          break_minutes: shift.break_minutes || 0,
        };
      });

      const payload = {
        name,
        template_name: name,
        title: name,
        shifts: items,
        items,
        details: items,
      };

      try {
        await api.post("/shift-templates/", payload);
      } catch (firstError) {
        await api.post("/shift_templates/", payload);
      }

      setMessage("この週をテンプレートとして保存しました");
      setTemplateName("");
      await fetchTemplates();
    } catch (error: any) {
      console.error("テンプレート保存失敗:", error);
      setMessage(formatApiError(error, "テンプレート保存に失敗しました"));
    } finally {
      setTemplateLoading(false);
    }
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
      `${getTemplateName(selectedTemplate)} を ${weekStart}〜${weekEnd} に反映しますか？`
    );

    if (!ok) return;

    try {
      setTemplateLoading(true);
      setMessage("");

      const requests: Promise<unknown>[] = [];

      items.forEach((item) => {
        const weekday = getTemplateWeekday(item);
        const targetDay = weekDays.find(
          (day) => day.weekdayIndex === weekday
        );

        const userId =
          item.user_id ||
          employeeUsers.find(
            (user) => user.name === item.user_name || user.name === item.name
          )?.id;

        if (!targetDay || !userId) {
          return;
        }

        requests.push(
          api.post("/shifts/", {
            user_id: userId,
            work_date: targetDay.date,
            start_time: item.start_time,
            end_time: item.end_time,
            break_minutes: item.break_minutes || 0,
          })
        );
      });

      if (requests.length === 0) {
        setMessage("テンプレート内のシフトを反映できませんでした");
        return;
      }

      await Promise.all(requests);

      setMessage(`テンプレートを${requests.length}件反映しました`);
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
      <section className="owner-shift-toolbar">
        <div className="owner-shift-toolbar-main">
          <div>
            <p className="owner-shift-toolbar-label">Weekly Shift Board</p>
            <h2>シフト表</h2>
            <p>
              シフト管理ページで登録したシフトを、印刷形式の表で表示します。
            </p>
          </div>
        </div>

        <div className="owner-shift-toolbar-side">
          <div className="owner-shift-week-box">
            <label>
              対象週
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </label>

            <div className="owner-shift-week-buttons">
              <button type="button" onClick={goPrevWeek}>
                前の週
              </button>

              <button type="button" onClick={goThisWeek}>
                今週
              </button>

              <button type="button" onClick={goNextWeek}>
                次の週
              </button>

              <button type="button" onClick={fetchData}>
                再読み込み
              </button>
            </div>
          </div>

          <div className="owner-shift-template-box">
            <div className="owner-shift-template-save">
              <label>
                この週をテンプレートとして保存
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder={`${weekStart}〜${weekEnd} のテンプレート`}
                />
              </label>

              <button
                type="button"
                onClick={handleSaveWeekAsTemplate}
                disabled={templateLoading || weeklyShifts.length === 0}
              >
                {templateLoading ? "処理中..." : "テンプレート保存"}
              </button>
            </div>

            <div className="owner-shift-template-apply">
              <label>
                テンプレートを選択
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
                {templateLoading ? "反映中..." : "テンプレートを反映"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="owner-shift-summary-row">
        <div>
          <span>週間シフト数</span>
          <strong>{weeklyShifts.length}件</strong>
        </div>

        <div>
          <span>週間総勤務時間</span>
          <strong>{formatDuration(totalWeeklyMinutes)}</strong>
        </div>

        <div>
          <span>勤務予定の従業員</span>
          <strong>{workingEmployeeCount}人</strong>
        </div>
      </section>

      {message && <p className="owner-shift-message">{message}</p>}

      {loading ? (
        <section className="owner-shift-loading">読み込み中...</section>
      ) : (
        <section className="owner-shift-print-board">
          <div className="owner-shift-print-title">
            <div>
              <h1>シフト表</h1>
              <p>
                {weekStart} ～ {weekEnd}
              </p>
            </div>

            <strong>作成者：{ownerName}</strong>
          </div>

          <div className="owner-shift-timeline-wrap">
            <ShiftTimeline shifts={weeklyShifts} printMode />
          </div>
        </section>
      )}
    </div>
  );
}