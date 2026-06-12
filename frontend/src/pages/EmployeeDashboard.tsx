import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import ShiftTimeline from "../components/ShiftTimeline";
import "./EmployeeDashboard.css";

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
  user_name?: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getWeekStart(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + diff);

  return date.toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
}

function formatDateLabel(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${month}/${day}`;
}

function getShiftHours(shift: Shift) {
  const start = shift.start_time.slice(0, 5);
  const end = shift.end_time.slice(0, 5);

  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);

  let startTotal = startHour * 60 + startMinute;
  let endTotal = endHour * 60 + endMinute;

  if (endTotal <= startTotal) {
    endTotal += 24 * 60;
  }

  const workMinutes = Math.max(
    0,
    endTotal - startTotal - Number(shift.break_minutes || 0)
  );

  return workMinutes / 60;
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

export default function EmployeeDashboard() {
  const navigate = useNavigate();

  const loginUserId = Number(localStorage.getItem("loginUserId"));
  const loginName = localStorage.getItem("loginName") || "従業員";
  const employeeNumber = localStorage.getItem("employeeNumber") || "-";

  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [targetDate, setTargetDate] = useState(getTodayDate());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const weekStart = useMemo(() => getWeekStart(targetDate), [targetDate]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const userNameMap = useMemo(() => {
    const map = new Map<number, string>();

    users.forEach((user) => {
      map.set(user.id, user.name);
    });

    return map;
  }, [users]);

  const weeklyMyShifts = useMemo(() => {
    return shifts
      .filter((shift) => {
        return (
          shift.user_id === loginUserId &&
          shift.work_date >= weekStart &&
          shift.work_date <= weekEnd
        );
      })
      .map((shift) => ({
        ...shift,
        user_name:
          shift.user_name || userNameMap.get(shift.user_id) || loginName,
      }))
      .sort((a, b) => {
        if (a.work_date !== b.work_date) {
          return a.work_date.localeCompare(b.work_date);
        }

        return a.start_time.localeCompare(b.start_time);
      });
  }, [shifts, loginUserId, weekStart, weekEnd, userNameMap, loginName]);

  const weeklyShiftCount = weeklyMyShifts.length;

  const weeklyTotalHours = useMemo(() => {
    return weeklyMyShifts.reduce((sum, shift) => sum + getShiftHours(shift), 0);
  }, [weeklyMyShifts]);

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
      console.error("従業員シフト取得失敗:", error);
      setMessage(formatApiError(error, "シフト情報の取得に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loginUserId) {
      navigate("/");
      return;
    }

    fetchData();
  }, []);

  const handlePrevWeek = () => {
    setTargetDate(addDays(weekStart, -7));
  };

  const handleThisWeek = () => {
    setTargetDate(getTodayDate());
  };

  const handleNextWeek = () => {
    setTargetDate(addDays(weekStart, 7));
  };

  const handleLogout = () => {
    localStorage.removeItem("loginUserId");
    localStorage.removeItem("loginName");
    localStorage.removeItem("loginRole");
    localStorage.removeItem("employeeNumber");

    localStorage.removeItem("ownerLogin");
    localStorage.removeItem("ownerId");
    localStorage.removeItem("ownerName");
    localStorage.removeItem("ownerNumber");

    navigate("/");
  };

  return (
    <div className="employee-page">
      <header className="employee-hero">
        <div>
          <p className="employee-label">EMPLOYEE DASHBOARD</p>
          <h1>従業員画面</h1>
          <span>
            オーナー・管理者が作成したシフト表を確認できます。
            従業員側から編集・追加・削除はできません。
          </span>
        </div>

        <div className="employee-user-card">
          <span>ログイン中</span>
          <strong>{loginName}</strong>
          <small>従業員番号：{employeeNumber}</small>
        </div>
      </header>

      <section className="employee-control-panel">
        <div className="employee-week-control">
          <label>
            対象週
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </label>

          <div className="employee-week-buttons">
            <button type="button" onClick={handlePrevWeek}>
              前の週
            </button>

            <button type="button" onClick={handleThisWeek}>
              今週
            </button>

            <button type="button" onClick={handleNextWeek}>
              次の週
            </button>

            <button type="button" onClick={fetchData}>
              再読み込み
            </button>
          </div>
        </div>

        <div className="employee-actions">
          <button type="button" onClick={() => navigate("/change-password")}>
            パスワード変更
          </button>

          <button
            type="button"
            className="employee-logout"
            onClick={handleLogout}
          >
            ログアウト
          </button>
        </div>
      </section>

      <section className="employee-summary-row">
        <div className="employee-summary-card">
          <span>対象期間</span>
          <strong>
            {formatDateLabel(weekStart)} 〜 {formatDateLabel(weekEnd)}
          </strong>
        </div>

        <div className="employee-summary-card">
          <span>自分のシフト数</span>
          <strong>{weeklyShiftCount}件</strong>
        </div>

        <div className="employee-summary-card">
          <span>予定勤務時間</span>
          <strong>{weeklyTotalHours.toFixed(1)}時間</strong>
        </div>
      </section>

      {message && <p className="employee-message">{message}</p>}

      <section className="employee-shift-section">
        <div className="employee-section-title">
          <div>
            <h2>自分のシフト表</h2>
            <p>
              {weekStart} 〜 {weekEnd}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="employee-loading">読み込み中...</div>
        ) : weeklyMyShifts.length === 0 ? (
          <div className="employee-empty">
            この週に登録されているシフトはありません。
          </div>
        ) : (
          <div className="employee-timeline-wrap">
            <ShiftTimeline shifts={weeklyMyShifts} printMode />
          </div>
        )}
      </section>
    </div>
  );
}