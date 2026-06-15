import { useEffect, useMemo, useState } from "react";

import { api } from "../../api/client";
import ShiftTimeline from "../../components/ShiftTimeline";
import OwnerHamburgerMenu from "../../components/OwnerHamburgerMenu";
import MonthlyShiftTemplatePanel from "../../components/MonthlyShiftTemplatePanel";
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
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

function normalizeTime(time: string) {
  return time.slice(0, 5);
}

function getShiftDurationMinutes(shift: ShiftForTimeline) {
  const start = timeToMinutes(shift.start_time);
  let end = timeToMinutes(shift.end_time);

  if (end <= start) {
    end += 24 * 60;
  }

  return Math.max(0, end - start - (shift.break_minutes || 0));
}

function getShiftUniqueKey(shift: {
  user_id: number;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
}) {
  return [
    shift.user_id,
    shift.work_date,
    normalizeTime(shift.start_time),
    normalizeTime(shift.end_time),
    shift.break_minutes || 0,
  ].join("-");
}

function removeDuplicateShifts(shifts: ShiftForTimeline[]) {
  const map = new Map<string, ShiftForTimeline>();

  shifts.forEach((shift) => {
    const key = getShiftUniqueKey(shift);

    if (!map.has(key)) {
      map.set(key, shift);
    }
  });

  return Array.from(map.values());
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

  if (detail) {
    return `${fallbackMessage}：${detail}`;
  }

  if (error.response?.status) {
    return `${fallbackMessage}：HTTP ${error.response.status}`;
  }

  return `${fallbackMessage}：APIに接続できませんでした`;
}

function getUserName(userId: number, users: User[]) {
  const user = users.find((item) => item.id === userId);
  return user?.name || "名前未設定";
}

export default function OwnerShiftTimelinePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const [targetDate, setTargetDate] = useState(getTodayDate());

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const ownerName =
    localStorage.getItem("ownerName") ||
    localStorage.getItem("loginName") ||
    "オーナー";

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

    const mappedShifts = shifts
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
        start_time: normalizeTime(shift.start_time),
        end_time: normalizeTime(shift.end_time),
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

    return removeDuplicateShifts(mappedShifts);
  }, [shifts, users, weekStart, weekEnd]);

  const totalWeeklyMinutes = useMemo(() => {
    return weeklyShifts.reduce((sum, shift) => {
      return sum + getShiftDurationMinutes(shift);
    }, 0);
  }, [weeklyShifts]);

  const workingEmployeeCount = useMemo(() => {
    return new Set(weeklyShifts.map((shift) => shift.user_id)).size;
  }, [weeklyShifts]);

  const fetchUsers = async () => {
    const res = await api.get<User[]>("/users/");
    setUsers(res.data);
  };

  const fetchShifts = async () => {
    const res = await api.get<Shift[]>("/shifts/");
    setShifts(res.data);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setMessage("");

      await Promise.all([fetchUsers(), fetchShifts()]);
    } catch (error: any) {
      console.error("シフト表データ取得失敗:", error);
      setMessage(formatApiError(error, "シフト表データの取得に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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

  return (
    <div className="owner-shift-timeline-page">
      <OwnerHamburgerMenu />

      <section className="owner-shift-hero">
        <p>SHIFT TABLE</p>
        <h1>シフト表</h1>
        <span>
          週ごとのシフトを確認できます。月テンプレートを使うと、
          6月・7月のように月全体のシフトを保存して反映できます。
        </span>
      </section>

      <section className="owner-shift-control-panel">
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

      <MonthlyShiftTemplatePanel onApplied={fetchData} />

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