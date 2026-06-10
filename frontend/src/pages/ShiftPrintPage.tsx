import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import ShiftTimeline from "../components/ShiftTimeline";
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

function getWeekStartDateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const weekStartDate = params.get("weekStartDate");

  if (weekStartDate) {
    return weekStartDate;
  }

  return getMondayOfCurrentWeek();
}

export default function ShiftPrintPage() {
  const sheetRef = useRef<HTMLElement | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const weekStartDate = useMemo(() => getWeekStartDateFromUrl(), []);
  const weekEndDate = addDays(weekStartDate, 6);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStartDate, index)),
    [weekStartDate]
  );

  const fetchData = async () => {
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
      console.error("印刷用シフト取得失敗:", error);
      setErrorMessage("シフト表の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    window.history.back();
  };

  const handleDownloadPdf = async () => {
    if (!sheetRef.current) {
      return;
    }

    try {
      setPdfLoading(true);

      const target = sheetRef.current;

      /*
        PDF作成中だけ専用クラスを付ける。
        html2canvasで細い縦線が消えないようにする。
      */
      target.classList.add("pdf-capture-mode");

      await new Promise((resolve) => setTimeout(resolve, 120));

      const canvas = await html2canvas(target, {
        scale: 3,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a3",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const ratio = Math.min(
        pageWidth / canvas.width,
        pageHeight / canvas.height
      );

      const imageWidth = canvas.width * ratio;
      const imageHeight = canvas.height * ratio;

      const x = (pageWidth - imageWidth) / 2;
      const y = 0;

      pdf.addImage(imgData, "PNG", x, y, imageWidth, imageHeight);
      pdf.save(`shift-${weekStartDate}-${weekEndDate}.pdf`);
    } catch (error) {
      console.error("PDF作成失敗:", error);
      alert("PDFの作成に失敗しました。もう一度試してください。");
    } finally {
      sheetRef.current?.classList.remove("pdf-capture-mode");
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="shift-print-page">
        <p className="shift-print-message">シフト表を読み込み中...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="shift-print-page">
        <p className="shift-print-error">{errorMessage}</p>

        <div className="shift-print-actions">
          <button type="button" onClick={fetchData}>
            再読み込み
          </button>

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
        <button
          type="button"
          className="pdf-main-button"
          onClick={handleDownloadPdf}
          disabled={pdfLoading}
        >
          {pdfLoading ? "PDF作成中..." : "PDFを作成"}
        </button>

        <button type="button" className="print-main-button" onClick={handlePrint}>
          このシフト表を印刷
        </button>

        <button type="button" onClick={handleBack}>
          戻る
        </button>
      </div>

      <main ref={sheetRef} className="shift-print-sheet">
        <h1>週間シフト表</h1>

        <p className="shift-print-period">
          {weekStartDate} 〜 {weekEndDate}
        </p>

        <ShiftTimeline shifts={weeklyTimelineShifts} printMode />
      </main>
    </div>
  );
}