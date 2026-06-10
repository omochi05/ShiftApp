import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import ShiftTimeline from "../components/ShiftTimeline";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  hourly_wage: number;
};

type Shift = {
  id: number;
  user_id: number;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  created_by?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ShiftForTimeline = Shift & {
  user_name: string;
};

function getMondayOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);

  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(now.getDate() + diff);

  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, "0");
  const dd = String(monday.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function addDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T00:00:00`);
  date.setDate(date.getDate() + days);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function timeToMinutes(time: string) {
  const [hourText, minuteText] = time.slice(0, 5).split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return 0;
  }

  return hour * 60 + minute;
}

function getShiftDurationMinutes(shift: Shift) {
  let start = timeToMinutes(shift.start_time);
  let end = timeToMinutes(shift.end_time);

  if (end <= start) {
    end += 24 * 60;
  }

  return end - start;
}

export default function ManagerDashboard() {
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [weekStartDate, setWeekStartDate] = useState(getMondayOfCurrentWeek());
  const weekEndDate = addDays(weekStartDate, 6);

  const managerName = localStorage.getItem("managerName") ?? "管理者";

  const employeeUsers = users.filter((user) => user.role === "employee");

  const weekDates = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStartDate, index)
  );

  const timelineShiftsBeforeDedup: ShiftForTimeline[] = shifts.map((shift) => {
    const user = users.find((u) => u.id === shift.user_id);

    return {
      ...shift,
      user_name: user?.name ?? `従業員${shift.user_id}`,
    };
  });

  const timelineShifts: ShiftForTimeline[] = Array.from(
    timelineShiftsBeforeDedup
      .reduce((map, shift) => {
        const normalizedName = shift.user_name.trim();
        const key = `${shift.work_date}-${normalizedName}`;

        const existing = map.get(key);

        if (!existing) {
          map.set(key, shift);
          return map;
        }

        const existingDuration = getShiftDurationMinutes(existing);
        const currentDuration = getShiftDurationMinutes(shift);

        if (
          currentDuration > existingDuration ||
          (currentDuration === existingDuration && shift.id > existing.id)
        ) {
          map.set(key, shift);
        }

        return map;
      }, new Map<string, ShiftForTimeline>())
      .values()
  );

  const realWeeklyTimelineShifts = timelineShifts.filter(
    (shift) =>
      shift.work_date >= weekStartDate && shift.work_date <= weekEndDate
  );

  const emptyWeekRows: ShiftForTimeline[] = weekDates.map((date, index) => ({
    id: -1000 - index,
    user_id: 0,
    user_name: "",
    work_date: date,
    start_time: "00:00",
    end_time: "00:00",
    break_minutes: 0,
  }));

  const weeklyTimelineShifts = [
    ...emptyWeekRows,
    ...realWeeklyTimelineShifts,
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [usersRes, shiftsRes] = await Promise.all([
        api.get<User[]>("/users/"),
        api.get<Shift[]>("/shifts/"),
      ]);

      setUsers(usersRes.data);
      setShifts(shiftsRes.data);
    } catch (error) {
      console.error("管理者データ取得失敗:", error);
      setErrorMessage("データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isManagerLogin = localStorage.getItem("managerLogin") === "true";

    if (!isManagerLogin) {
      navigate("/");
      return;
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrevWeek = () => {
    setWeekStartDate((prev) => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setWeekStartDate((prev) => addDays(prev, 7));
  };

  const handleGoHome = () => {
    setIsMenuOpen(false);
    navigate("/manager");
  };

  const handleOpenPrintPage = () => {
    setIsMenuOpen(false);
    navigate(`/owner/print/shifts?weekStartDate=${weekStartDate}`);
  };

  const handleLogout = () => {
    setIsMenuOpen(false);

    localStorage.removeItem("managerLogin");
    localStorage.removeItem("managerId");
    localStorage.removeItem("managerName");
    localStorage.removeItem("managerNumber");

    navigate("/");
  };

  if (loading) {
    return (
      <div className="owner-page">
        <div className="owner-loading">
          <h1>読み込み中...</h1>
          <p>データを取得しています。</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="owner-page">
        <div className="owner-error">
          <h1>エラー</h1>
          <p>{errorMessage}</p>

          <button type="button" onClick={loadData}>
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="owner-page">
      <header className="owner-header">
        <div>
          <h1>ShiftApp / 管理者</h1>
          <p>{managerName} としてログイン中です</p>
        </div>

        <div className="owner-menu-wrap">
          <button
            type="button"
            className="owner-menu-button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="メニューを開く"
            aria-expanded={isMenuOpen}
          >
            <span />
            <span />
            <span />
          </button>

          {isMenuOpen && (
            <div className="owner-menu-panel">
              <button type="button" onClick={handleGoHome}>
                ホーム
              </button>

              <button type="button" onClick={handleOpenPrintPage}>
                シフト表印刷
              </button>

              <button type="button" onClick={handleLogout}>
                ログアウト
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="summary-grid">
        <div className="summary-card">
          <span>従業員数</span>
          <strong>{employeeUsers.length}人</strong>
        </div>

        <div className="summary-card">
          <span>登録シフト数</span>
          <strong>{shifts.length}件</strong>
        </div>

        <div className="summary-card">
          <span>表示期間</span>
          <strong>
            {weekStartDate}
            <br />
            {weekEndDate}
          </strong>
        </div>

        <div className="summary-card">
          <span>権限</span>
          <strong>管理者</strong>
        </div>
      </section>

      <section className="owner-section shift-print-area">
        <h2>シフト表確認</h2>

        <p className="form-message">
          表示期間：{weekStartDate} 〜 {weekEndDate}
        </p>

        <p className="form-message print-hide">
          印刷やPDF保存は、右上のメニューから行えます。
        </p>

        <div className="timeline-wrap">
          <ShiftTimeline shifts={weeklyTimelineShifts} />
        </div>

        <div className="shift-template-actions-bottom print-hide">
          <button type="button" onClick={handlePrevWeek}>
            前の週
          </button>

          <button type="button" onClick={handleNextWeek}>
            次の週
          </button>
        </div>
      </section>

      <section className="owner-section">
        <h2>従業員一覧</h2>

        <div className="weekday-table-wrap">
          <table className="weekday-table">
            <thead>
              <tr>
                <th>従業員番号</th>
                <th>名前</th>
                <th>時給</th>
              </tr>
            </thead>

            <tbody>
              {employeeUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.name}</td>
                  <td>{user.hourly_wage.toLocaleString()}円</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}