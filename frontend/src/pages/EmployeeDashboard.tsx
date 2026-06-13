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

type Notification = {
  id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: string;
  related_shift_id: number | null;
  is_read: boolean;
  created_at: string;
};

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayDate() {
  return formatLocalDate(new Date());
}

function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getWeekStart(dateString: string) {
  const date = parseLocalDate(dateString);
  const day = date.getDay();

  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);

  return formatLocalDate(date);
}

function addDays(dateString: string, days: number) {
  const date = parseLocalDate(dateString);
  date.setDate(date.getDate() + days);

  return formatLocalDate(date);
}

function formatDateLabel(dateString: string) {
  const date = parseLocalDate(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${month}/${day}`;
}

function getShiftHours(shift: Shift) {
  const start = shift.start_time.slice(0, 5);
  const end = shift.end_time.slice(0, 5);

  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);

  const startTotal = startHour * 60 + startMinute;
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

function formatNotificationDate(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ja-JP");
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();

  const loginUserId = Number(localStorage.getItem("loginUserId"));
  const loginName = localStorage.getItem("loginName") || "従業員";
  const employeeNumber = localStorage.getItem("employeeNumber") || "-";

  const isMaintenance = employeeNumber === "9999";

  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [targetDate, setTargetDate] = useState(getTodayDate());
  const [loading, setLoading] = useState(true);
  const [notificationLoading, setNotificationLoading] = useState(false);
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

  const weeklyShifts = useMemo(() => {
    const seen = new Set<string>();

    return shifts
      .filter((shift) => {
        return shift.work_date >= weekStart && shift.work_date <= weekEnd;
      })
      .map((shift) => ({
        ...shift,
        user_name:
          shift.user_name ||
          userNameMap.get(shift.user_id) ||
          `ID:${shift.user_id}`,
      }))
      .filter((shift) => {
        const key = [
          shift.user_id,
          shift.work_date,
          shift.start_time.slice(0, 5),
          shift.end_time.slice(0, 5),
          shift.break_minutes,
        ].join("-");

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        if (a.work_date !== b.work_date) {
          return a.work_date.localeCompare(b.work_date);
        }

        if (a.start_time !== b.start_time) {
          return a.start_time.localeCompare(b.start_time);
        }

        return a.user_id - b.user_id;
      });
  }, [shifts, weekStart, weekEnd, userNameMap]);

  const myWeeklyShifts = useMemo(() => {
    return weeklyShifts.filter((shift) => shift.user_id === loginUserId);
  }, [weeklyShifts, loginUserId]);

  const weeklyShiftCount = myWeeklyShifts.length;

  const weeklyTotalHours = useMemo(() => {
    return myWeeklyShifts.reduce((sum, shift) => {
      return sum + getShiftHours(shift);
    }, 0);
  }, [myWeeklyShifts]);

  const unreadNotifications = useMemo(() => {
    return notifications.filter((notification) => !notification.is_read);
  }, [notifications]);

  const fetchNotifications = async () => {
    if (!loginUserId) {
      return;
    }

    try {
      setNotificationLoading(true);

      const res = await api.get<Notification[]>(
        `/notifications/user/${loginUserId}`
      );

      setNotifications(res.data);
    } catch (error) {
      console.error("通知取得失敗:", error);
    } finally {
      setNotificationLoading(false);
    }
  };

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

  const reloadPageData = async () => {
    await Promise.all([fetchData(), fetchNotifications()]);
  };

  useEffect(() => {
    if (!loginUserId) {
      navigate("/");
      return;
    }

    reloadPageData();
  }, []);

  const handlePrevWeek = () => {
    setTargetDate((current) => {
      const currentWeekStart = getWeekStart(current);
      return addDays(currentWeekStart, -7);
    });
  };

  const handleThisWeek = () => {
    setTargetDate(getTodayDate());
  };

  const handleNextWeek = () => {
    setTargetDate((current) => {
      const currentWeekStart = getWeekStart(current);
      return addDays(currentWeekStart, 7);
    });
  };

  const handleReadNotification = async (notificationId: number) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      await fetchNotifications();
    } catch (error) {
      console.error("通知既読失敗:", error);
    }
  };

  const handleReadAllNotifications = async () => {
    try {
      await api.put(`/notifications/user/${loginUserId}/read-all`);
      await fetchNotifications();
    } catch (error) {
      console.error("通知一括既読失敗:", error);
    }
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
          <p className="employee-label">
            {isMaintenance ? "MAINTENANCE DASHBOARD" : "EMPLOYEE DASHBOARD"}
          </p>

          <h1>{isMaintenance ? "メンテナンス画面" : "従業員画面"}</h1>

          <span>
            {isMaintenance
              ? "メンテナンス用アカウントです。従業員画面から各管理画面へ切り替えできます。"
              : "オーナー・管理者が作成したシフト表を確認できます。従業員側から編集・追加・削除はできません。"}
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

            <button type="button" onClick={reloadPageData}>
              再読み込み
            </button>
          </div>
        </div>

        <div className="employee-actions">
          {isMaintenance && (
            <>
              <button type="button" onClick={() => navigate("/owner")}>
                オーナー画面へ
              </button>

              <button type="button" onClick={() => navigate("/manager")}>
                管理者画面へ
              </button>
            </>
          )}

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

      {notificationLoading && (
        <p className="employee-notification-loading">通知を確認中...</p>
      )}

      {unreadNotifications.length > 0 && (
        <section className="employee-notification-section">
          <div className="employee-notification-title">
            <div>
              <h2>通知</h2>
              <p>自分のシフトに関するお知らせです。</p>
            </div>

            <button type="button" onClick={handleReadAllNotifications}>
              すべて既読
            </button>
          </div>

          <div className="employee-notification-list">
            {unreadNotifications.map((notification) => (
              <article
                key={notification.id}
                className="employee-notification-card"
              >
                <div>
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                  <span>{formatNotificationDate(notification.created_at)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleReadNotification(notification.id)}
                >
                  既読
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

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
          <span>自分の予定勤務時間</span>
          <strong>{weeklyTotalHours.toFixed(1)}時間</strong>
        </div>
      </section>

      {message && <p className="employee-message">{message}</p>}

      <section className="employee-shift-section">
        <div className="employee-section-title">
          <div>
            <h2>シフト表</h2>
            <p>
              {weekStart} 〜 {weekEnd}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="employee-loading">読み込み中...</div>
        ) : weeklyShifts.length === 0 ? (
          <div className="employee-empty">
            この週に登録されているシフトはありません。
          </div>
        ) : (
          <div className="employee-timeline-wrap">
            <ShiftTimeline shifts={weeklyShifts} printMode />
          </div>
        )}
      </section>
    </div>
  );
}