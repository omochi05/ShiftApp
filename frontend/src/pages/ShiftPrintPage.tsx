import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import ShiftTimeline from "../components/ShiftTimeline";
import "./ShiftPrintPage.css";

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
};

type ShiftForTimeline = Shift & {
  user_name: string;
};

function addDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T00:00:00`);
  date.setDate(date.getDate() + days);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

export default function ShiftPrintPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const lastPrintTapRef = useRef(0);

  const weekStartDate = searchParams.get("weekStartDate") ?? "";
  const weekEndDate = weekStartDate ? addDays(weekStartDate, 6) : "";

  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const weekDates = weekStartDate
    ? Array.from({ length: 7 }, (_, index) => addDays(weekStartDate, index))
    : [];

  const handlePrint = () => {
    const now = Date.now();

    if (now - lastPrintTapRef.current < 800) {
      return;
    }

    lastPrintTapRef.current = now;
    window.focus();

    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleBack = () => {
    navigate("/owner");
  };

  useEffect(() => {
    const loadData = async () => {
      if (!weekStartDate) {
        setErrorMessage("印刷する週が指定されていません");
        setLoading(false);
        return;
      }

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
        console.error("印刷用データ取得失敗:", error);
        setErrorMessage("印刷用データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [weekStartDate]);

  const weeklyShifts = shifts
    .filter(
      (shift) =>
        shift.work_date >= weekStartDate && shift.work_date <= weekEndDate
    )
    .sort((a, b) => {
      if (a.work_date !== b.work_date) {
        return a.work_date.localeCompare(b.work_date);
      }

      return a.start_time.localeCompare(b.start_time);
    });

  const timelineShifts: ShiftForTimeline[] = weeklyShifts.map((shift) => {
    const user = users.find((u) => u.id === shift.user_id);

    return {
      ...shift,
      user_name: user?.name ?? `従業員${shift.user_id}`,
    };
  });

  const emptyWeekRows: ShiftForTimeline[] = weekDates.map((date, index) => ({
    id: -1000 - index,
    user_id: 0,
    user_name: "",
    work_date: date,
    start_time: "00:00",
    end_time: "00:00",
    break_minutes: 0,
  }));

  const printShifts = [...emptyWeekRows, ...timelineShifts];

  if (loading) {
    return (
      <div className="shift-print-page">
        <p>印刷用シフト表を読み込み中...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="shift-print-page">
        <h1>エラー</h1>
        <p>{errorMessage}</p>

        <div className="shift-print-actions">
          <button type="button" onClick={handleBack}>
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shift-print-page">
      <div className="shift-print-actions">
        <button type="button" onClick={handlePrint}>
          このシフト表を印刷
        </button>

        <button type="button" onClick={handleBack}>
          戻る
        </button>
      </div>

      <p className="shift-print-help">
        スマホで印刷画面が出ない場合は、ブラウザの共有・印刷メニューから印刷してください。
      </p>

      <section className="shift-print-sheet">
        <h1>シフト表</h1>

        <p>
          表示期間：{weekStartDate} 〜 {weekEndDate}
        </p>

       <ShiftTimeline shifts={printShifts} />
      </section>
    </div>
  );
}