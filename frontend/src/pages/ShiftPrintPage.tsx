import { useEffect, useMemo, useState } from "react";
import ShiftTimeline from "../components/ShiftTimeline";
import { api } from "../api/client";
import "./ShiftPrintPage.css";

type User = {
  id: number;
  name: string;
  hourly_wage?: number;
};

type Shift = {
  id: number;
  user_id: number;
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

function addDays(date: Date, days: number) {
  const copied = new Date(date);
  copied.setDate(copied.getDate() + days);
  return copied;
}

function toDateText(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatJapaneseDate(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  return `${month}/${day}（${weekDays[date.getDay()]}）`;
}

function getQueryParam(name: string) {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get(name);
}

function getDefaultWeekStartDate() {
  const today = new Date();
  const day = today.getDay();

  // 月曜日始まり
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = addDays(today, diffToMonday);

  return toDateText(monday);
}

export default function ShiftPrintPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const weekStartDate =
    getQueryParam("weekStartDate") || getDefaultWeekStartDate();

  const weekDates = useMemo(() => {
    const start = new Date(`${weekStartDate}T00:00:00`);

    return Array.from({ length: 7 }, (_, index) => {
      return toDateText(addDays(start, index));
    });
  }, [weekStartDate]);

  const weekEndDate = weekDates[6];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const [usersRes, shiftsRes] = await Promise.all([
          api.get<User[]>("/users/"),
          api.get<Shift[]>("/shifts/"),
        ]);

        setUsers(usersRes.data);
        setShifts(shiftsRes.data);
      } catch (err) {
        console.error(err);
        setError("シフト表の取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const userNameMap = useMemo(() => {
    const map = new Map<number, string>();

    users.forEach((user) => {
      map.set(user.id, user.name);
    });

    return map;
  }, [users]);

  const printShifts = useMemo<ShiftForTimeline[]>(() => {
    const weekDateSet = new Set(weekDates);

    const realShifts: ShiftForTimeline[] = shifts
      .filter((shift) => weekDateSet.has(shift.work_date))
      .map((shift) => ({
        id: shift.id,
        user_id: shift.user_id,
        user_name: userNameMap.get(shift.user_id) || "未設定",
        work_date: shift.work_date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        break_minutes: shift.break_minutes,
        created_by: shift.created_by,
      }));

    const existingDateSet = new Set(realShifts.map((shift) => shift.work_date));

    const emptyRows: ShiftForTimeline[] = weekDates
      .filter((date) => !existingDateSet.has(date))
      .map((date, index) => ({
        id: -10000 - index,
        user_id: 0,
        user_name: "",
        work_date: date,
        start_time: "06:00",
        end_time: "06:01",
        break_minutes: 0,
        created_by: null,
      }));

    return [...realShifts, ...emptyRows].sort((a, b) => {
      if (a.work_date !== b.work_date) {
        return a.work_date.localeCompare(b.work_date);
      }

      return a.start_time.localeCompare(b.start_time);
    });
  }, [shifts, userNameMap, weekDates]);

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    window.history.back();
  };

  if (loading) {
    return (
      <div className="shift-print-page">
        <p className="shift-print-message">シフト表を読み込み中です...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shift-print-page">
        <div className="shift-print-actions">
          <button type="button" onClick={handleBack}>
            戻る
          </button>
        </div>

        <p className="shift-print-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="shift-print-page">
      <div className="shift-print-actions">
        <button
          type="button"
          className="print-main-button"
          onClick={handlePrint}
        >
          このシフト表を印刷
        </button>

        <button type="button" onClick={handleBack}>
          戻る
        </button>
      </div>

      <div className="shift-print-sheet">
        <h1>週間シフト表</h1>

        <p className="shift-print-period">
          {formatJapaneseDate(weekStartDate)} 〜{" "}
          {formatJapaneseDate(weekEndDate)}
        </p>

        <ShiftTimeline shifts={printShifts} printMode />
      </div>
    </div>
  );
}