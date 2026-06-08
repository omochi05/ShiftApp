import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
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

type ShiftWithName = Shift & {
  user_name: string;
};

type TimeGroupKey = "morning" | "daytime" | "evening" | "night";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const TIME_GROUPS: {
  key: TimeGroupKey;
  label: string;
  time: string;
}[] = [
  {
    key: "morning",
    label: "朝",
    time: "6:00〜9:00",
  },
  {
    key: "daytime",
    label: "昼",
    time: "9:00〜17:00",
  },
  {
    key: "evening",
    label: "夕方",
    time: "17:00〜22:00",
  },
  {
    key: "night",
    label: "夜",
    time: "22:00〜翌6:00",
  },
];

function addDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T00:00:00`);
  date.setDate(date.getDate() + days);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function formatDateLabel(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateText;
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAYS[date.getDay()];

  return `${month}/${day}（${weekday}）`;
}

function normalizeTime(time?: string) {
  if (!time || typeof time !== "string") {
    return "00:00";
  }

  return time.slice(0, 5);
}

function getStartHour(time: string) {
  const normalized = normalizeTime(time);
  const [hourText] = normalized.split(":");
  const hour = Number(hourText);

  if (Number.isNaN(hour)) {
    return 0;
  }

  return hour;
}

function getTimeGroup(shift: ShiftWithName): TimeGroupKey {
  const hour = getStartHour(shift.start_time);

  if (hour >= 6 && hour < 9) {
    return "morning";
  }

  if (hour >= 9 && hour < 17) {
    return "daytime";
  }

  if (hour >= 17 && hour < 22) {
    return "evening";
  }

  return "night";
}

function removeDuplicateShifts(shifts: ShiftWithName[]) {
  const seen = new Set<string>();
  const uniqueShifts: ShiftWithName[] = [];

  for (const shift of shifts) {
    const key = [
      shift.work_date,
      shift.user_id,
      normalizeTime(shift.start_time),
      normalizeTime(shift.end_time),
    ].join("-");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueShifts.push(shift);
  }

  return uniqueShifts;
}

function sortShifts(a: ShiftWithName, b: ShiftWithName) {
  if (a.work_date !== b.work_date) {
    return a.work_date.localeCompare(b.work_date);
  }

  if (normalizeTime(a.start_time) !== normalizeTime(b.start_time)) {
    return normalizeTime(a.start_time).localeCompare(
      normalizeTime(b.start_time)
    );
  }

  return a.user_name.localeCompare(b.user_name, "ja");
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
    .map((shift) => {
      const user = users.find((u) => u.id === shift.user_id);

      return {
        ...shift,
        user_name: user?.name ?? `従業員${shift.user_id}`,
      };
    })
    .filter((shift) => shift.user_id !== 0)
    .sort(sortShifts);

  const printableShifts = removeDuplicateShifts(weeklyShifts);

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

      <section className="shift-print-sheet">
        <div className="shift-print-title-area">
          <h1>週間シフト表</h1>

          <p>
            表示期間：{weekStartDate} 〜 {weekEndDate}
          </p>
        </div>

        <div className="readable-shift-table-wrapper">
          <table className="readable-shift-table">
            <thead>
              <tr>
                <th className="readable-date-header">日付</th>

                {TIME_GROUPS.map((group) => (
                  <th key={group.key}>
                    <div className="readable-group-label">{group.label}</div>
                    <div className="readable-group-time">{group.time}</div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {weekDates.map((date) => {
                const dayShifts = printableShifts.filter(
                  (shift) => shift.work_date === date
                );

                return (
                  <tr key={date}>
                    <td className="readable-date-cell">
                      {formatDateLabel(date)}
                    </td>

                    {TIME_GROUPS.map((group) => {
                      const groupShifts = dayShifts.filter(
                        (shift) => getTimeGroup(shift) === group.key
                      );

                      return (
                        <td key={group.key} className="readable-shift-cell">
                          {groupShifts.length === 0 ? (
                            <span className="readable-empty">—</span>
                          ) : (
                            <div className="readable-shift-list">
                              {groupShifts.map((shift) => (
                                <div
                                  key={shift.id}
                                  className="readable-shift-item"
                                >
                                  <span className="readable-staff-name">
                                    {shift.user_name}
                                  </span>

                                  <span className="readable-time">
                                    {normalizeTime(shift.start_time)}〜
                                    {normalizeTime(shift.end_time)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}