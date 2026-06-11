import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import ShiftTimeline from "../components/ShiftTimeline";
import "./ShiftPrintPage.css";

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

function normalizeTime(time: string) {
  return time.slice(0, 5);
}

function getHashQueryValue(key: string) {
  const hash = window.location.hash;
  const queryIndex = hash.indexOf("?");

  if (queryIndex === -1) return null;

  const query = hash.slice(queryIndex + 1);
  const params = new URLSearchParams(query);

  return params.get(key);
}

function getUserName(userId: number, users: User[]) {
  const user = users.find((item) => item.id === userId);
  return user?.name || "名前未設定";
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

export default function ShiftPrintPage() {
  const initialWeek = getHashQueryValue("week") || getTodayDate();

  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [targetDate, setTargetDate] = useState(initialWeek);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const printAreaRef = useRef<HTMLDivElement | null>(null);

  const ownerName = localStorage.getItem("ownerName") || "オーナー";

  const weekDays = useMemo(() => {
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

  const weeklyShifts = useMemo<ShiftForTimeline[]>(() => {
    if (!weekStart || !weekEnd) return [];

    const realShifts = shifts
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

    const uniqueShifts = removeDuplicateShifts(realShifts);

    const placeholderDays: ShiftForTimeline[] = weekDays.map((day, index) => ({
      id: -1000 - index,
      user_id: -1,
      user_name: "",
      work_date: day.date,
      start_time: "06:00",
      end_time: "06:00",
      break_minutes: 0,
      created_by: null,
    }));

    return [...uniqueShifts, ...placeholderDays].sort((a, b) => {
      if (a.work_date < b.work_date) return -1;
      if (a.work_date > b.work_date) return 1;
      if (a.start_time < b.start_time) return -1;
      if (a.start_time > b.start_time) return 1;
      return a.id - b.id;
    });
  }, [shifts, users, weekStart, weekEnd, weekDays]);

  const visibleShiftCount = useMemo(() => {
    return weeklyShifts.filter((shift) => shift.user_name.trim() !== "").length;
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
      console.error("印刷用シフト取得失敗:", error);
      setMessage(formatApiError(error, "印刷用シフトの取得に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const goBack = () => {
    window.location.hash = "/owner/timeline";
  };

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

  const handlePrint = () => {
    window.print();
  };

  const handleSavePdf = () => {
    window.print();
  };

  return (
    <div className="shift-print-page">
      <section className="shift-print-hero print-hide">
        <p>PRINT PREVIEW</p>
        <h1>印刷プレビュー</h1>
        <span>
          選択した週のシフト表を確認して、印刷またはPDF保存できます。
        </span>
      </section>

      <section className="shift-print-control-panel print-hide">
        <div className="shift-print-navigation">
          <button type="button" onClick={goBack}>
            戻る
          </button>

          <button type="button" onClick={goPrevWeek}>
            前の週
          </button>

          <button type="button" onClick={goThisWeek}>
            今週
          </button>

          <button type="button" onClick={goNextWeek}>
            次の週
          </button>
        </div>

        <div className="shift-print-week-control">
          <label>
            週の開始日
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </label>

          <button type="button" onClick={fetchData}>
            再読み込み
          </button>

          <button type="button" onClick={handlePrint}>
            印刷
          </button>

          <button type="button" onClick={handleSavePdf}>
            PDF保存
          </button>
        </div>
      </section>

      <section className="shift-print-status-row print-hide">
        <div>
          <span>対象期間</span>
          <strong>
            {weekStart} ～ {weekEnd}
          </strong>
        </div>

        <div>
          <span>シフト件数</span>
          <strong>{visibleShiftCount}件</strong>
        </div>

        <div>
          <span>作成者</span>
          <strong>{ownerName}</strong>
        </div>
      </section>

      {message && <p className="shift-print-message print-hide">{message}</p>}

      {loading ? (
        <section className="shift-print-loading print-hide">
          読み込み中...
        </section>
      ) : (
        <section className="shift-print-preview-wrap">
          <div className="shift-print-paper" ref={printAreaRef}>
            <div className="shift-print-title">
              <div>
                <h1>シフト表</h1>
                <p>
                  {weekStart} ～ {weekEnd}
                </p>
              </div>

              <strong>作成者：{ownerName}</strong>
            </div>

            <ShiftTimeline shifts={weeklyShifts} printMode />
          </div>
        </section>
      )}
    </div>
  );
}