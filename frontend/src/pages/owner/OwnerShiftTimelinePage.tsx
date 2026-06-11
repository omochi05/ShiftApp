import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import "./OwnerShiftTimelinePage.css";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  hourly_wage?: number;
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

type WeekDay = {
  date: string;
  label: string;
  dayLabel: string;
};

const hourLabels = [
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
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

  if (hours <= 0) {
    return `${mins}分`;
  }

  if (mins === 0) {
    return `${hours}時間`;
  }

  return `${hours}時間${mins}分`;
}

function getShiftBarStyle(shift: Shift) {
  const dayStart = 6 * 60;
  const dayEnd = 30 * 60;
  const totalMinutes = dayEnd - dayStart;

  const originalStart = timeToMinutes(shift.start_time);

  let start = originalStart;
  let end = timeToMinutes(shift.end_time);

  if (start < dayStart) {
    start += 24 * 60;
  }

  if (end <= originalStart) {
    end += 24 * 60;
  }

  if (end <= dayStart) {
    end += 24 * 60;
  }

  const clampedStart = Math.max(dayStart, start);
  const clampedEnd = Math.min(dayEnd, end);

  const left = ((clampedStart - dayStart) / totalMinutes) * 100;
  const width = Math.max(
    2,
    ((clampedEnd - clampedStart) / totalMinutes) * 100
  );

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

  if (detail) {
    return `${fallbackMessage}：${detail}`;
  }

  if (error.response?.status) {
    return `${fallbackMessage}：HTTP ${error.response.status}`;
  }

  return `${fallbackMessage}：APIに接続できませんでした`;
}

function getDeviceType() {
  const ua = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(ua)) {
    return "iPhone";
  }

  if (/android/.test(ua)) {
    return "Android";
  }

  return "PC";
}

export default function OwnerShiftTimelinePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [targetDate, setTargetDate] = useState(getTodayDate());

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const deviceType = useMemo(() => getDeviceType(), []);

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
      };
    });
  }, [targetDate]);

  const weekStart = weekDays[0]?.date;
  const weekEnd = weekDays[6]?.date;

  const weeklyShifts = useMemo(() => {
    if (!weekStart || !weekEnd) return [];

    return shifts
      .filter(
        (shift) => shift.work_date >= weekStart && shift.work_date <= weekEnd
      )
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
    const ids = new Set(weeklyShifts.map((shift) => shift.user_id));
    return ids.size;
  }, [weeklyShifts]);

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

  const getShiftsByDate = (date: string) => {
    return weeklyShifts.filter((shift) => shift.work_date === date);
  };

  const getShiftsByDateAndUser = (date: string, userId: number) => {
    return weeklyShifts.filter(
      (shift) => shift.work_date === date && shift.user_id === userId
    );
  };

  const getEmployeesForDate = (date: string) => {
    const dailyShifts = getShiftsByDate(date);
    const ids = new Set(dailyShifts.map((shift) => shift.user_id));

    return employeeUsers.filter((user) => ids.has(user.id));
  };

  return (
    <div className="owner-shift-timeline-page">
      <section className="owner-shift-timeline-hero">
        <div>
          <p className="owner-shift-timeline-label">Weekly Shift Timeline</p>
          <h2>シフト表</h2>
          <p>
            シフト管理ページで登録したシフトを引用して、週ごとの横長シフト表で確認できます。
            印刷は左メニューの「印刷」から開いてください。
          </p>
        </div>

        <span className="owner-shift-device-badge">{deviceType}表示</span>
      </section>

      <section className="owner-shift-week-control">
        <div className="owner-shift-week-input-area">
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
        </div>

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
        <section className="owner-shift-week-board">
          <div className="owner-shift-board-title">
            <div>
              <h3>週間シフト表</h3>
              <p>
                6:00 〜 翌6:00 の横長表示です。スマホでは横にスクロールして確認できます。
              </p>
            </div>
          </div>

          <div className="owner-shift-day-list">
            {weekDays.map((day) => {
              const dailyShifts = getShiftsByDate(day.date);
              const employees = getEmployeesForDate(day.date);

              return (
                <article key={day.date} className="owner-shift-day-card">
                  <div className="owner-shift-day-header">
                    <div>
                      <span>{day.date}</span>
                      <h4>
                        {day.label}（{day.dayLabel}）
                      </h4>
                    </div>

                    <strong>{dailyShifts.length}件</strong>
                  </div>

                  {dailyShifts.length === 0 ? (
                    <div className="owner-shift-empty-day">
                      この日のシフトは登録されていません。
                    </div>
                  ) : (
                    <div className="owner-shift-horizontal-scroll">
                      <div className="owner-shift-timeline-table">
                        <div className="owner-shift-time-header">
                          <div className="owner-shift-name-cell">従業員</div>

                          <div className="owner-shift-hour-grid">
                            {hourLabels.map((hour, index) => (
                              <div
                                key={`${hour}-${index}`}
                                className="owner-shift-hour-cell"
                              >
                                {hour}
                              </div>
                            ))}
                          </div>
                        </div>

                        {employees.map((user) => {
                          const userShifts = getShiftsByDateAndUser(
                            day.date,
                            user.id
                          );

                          return (
                            <div key={user.id} className="owner-shift-row">
                              <div className="owner-shift-name-cell">
                                <strong>{user.name}</strong>
                                <span>{user.email}</span>
                              </div>

                              <div className="owner-shift-bar-area">
                                <div className="owner-shift-grid-lines">
                                  {hourLabels.slice(0, -1).map((hour, index) => (
                                    <span key={`${hour}-${index}`} />
                                  ))}
                                </div>

                                {userShifts.map((shift) => (
                                  <div
                                    key={shift.id}
                                    className="owner-shift-bar"
                                    style={getShiftBarStyle(shift)}
                                    title={`${shift.user_name} ${shift.start_time}〜${shift.end_time}`}
                                  >
                                    <span>
                                      {shift.start_time}〜{shift.end_time}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {dailyShifts.length > 0 && (
                    <div className="owner-shift-day-log">
                      <h5>日付ごとの確認</h5>

                      <div className="owner-shift-day-log-list">
                        {dailyShifts.map((shift) => (
                          <div
                            key={shift.id}
                            className="owner-shift-day-log-item"
                          >
                            <div>
                              <strong>{shift.user_name}</strong>
                              <span>
                                {shift.start_time} 〜 {shift.end_time}
                              </span>
                            </div>

                            <em>
                              {formatDuration(getShiftDurationMinutes(shift))}
                            </em>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}