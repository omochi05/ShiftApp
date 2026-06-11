import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
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
  created_at?: string | null;
  updated_at?: string | null;
};

type ShiftForTimeline = Shift & {
  user_name: string;
};

const PDF_CAPTURE_WIDTH = 1600;

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

function getDateLabel(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}.${mm}.${dd}`;
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

function resizeCanvas(sourceCanvas: HTMLCanvasElement, targetWidth: number) {
  const scale = targetWidth / sourceCanvas.width;
  const targetHeight = Math.round(sourceCanvas.height * scale);

  const resizedCanvas = document.createElement("canvas");
  resizedCanvas.width = targetWidth;
  resizedCanvas.height = targetHeight;

  const ctx = resizedCanvas.getContext("2d");

  if (!ctx) {
    return sourceCanvas;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

  return resizedCanvas;
}

export default function ShiftPrintPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const printAreaRef = useRef<HTMLDivElement | null>(null);

  const urlWeekStartDate = searchParams.get("weekStartDate");

  const [weekStartDate, setWeekStartDate] = useState(
    urlWeekStartDate || getMondayOfCurrentWeek()
  );
  const ownerName = localStorage.getItem("ownerName") || "オーナー";

  const weekEndDate = addDays(weekStartDate, 6);

  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) =>
      addDays(weekStartDate, index)
    );
  }, [weekStartDate]);

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
    } catch (error) {
      console.error("印刷用データ取得失敗:", error);
      setMessage("シフト表の取得に失敗しました。API接続を確認してください。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setSearchParams({
      weekStartDate,
    });
  }, [weekStartDate, setSearchParams]);

  const handlePrevWeek = () => {
    setWeekStartDate((prev) => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setWeekStartDate((prev) => addDays(prev, 7));
  };

  const handleThisWeek = () => {
    setWeekStartDate(getMondayOfCurrentWeek());
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSavePdf = async () => {
    if (!printAreaRef.current) {
      return;
    }

    const printArea = printAreaRef.current;

    const originalWidth = printArea.style.width;
    const originalMinWidth = printArea.style.minWidth;
    const originalMaxWidth = printArea.style.maxWidth;
    const originalMargin = printArea.style.margin;

    try {
      setMessage("PDFを作成中です...");

      document.body.classList.add("pdf-capture-mode");

      /*
        スマホ幅のままPDF化されるのを防ぐ。
        PDF保存時だけA3横向き用の横幅に固定してからキャプチャする。
      */
      printArea.style.width = `${PDF_CAPTURE_WIDTH}px`;
      printArea.style.minWidth = `${PDF_CAPTURE_WIDTH}px`;
      printArea.style.maxWidth = `${PDF_CAPTURE_WIDTH}px`;
      printArea.style.margin = "0";

      await new Promise((resolve) => window.setTimeout(resolve, 500));

      const captureHeight = printArea.scrollHeight;

      const canvas = await html2canvas(printArea, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",

        width: PDF_CAPTURE_WIDTH,
        height: captureHeight,

        windowWidth: PDF_CAPTURE_WIDTH,
        windowHeight: captureHeight,

        scrollX: 0,
        scrollY: 0,
      });

      const resizedCanvas = resizeCanvas(canvas, 2200);
      const imageData = resizedCanvas.toDataURL("image/jpeg", 0.95);

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a3",
      });

      const pageWidth = 420;
      const pageHeight = 297;

      const marginX = 4;
      const marginY = 5;

      const usableWidth = pageWidth - marginX * 2;
      const usableHeight = pageHeight - marginY * 2;

      const imageRatio = resizedCanvas.width / resizedCanvas.height;
      const pageRatio = usableWidth / usableHeight;

      let imageWidth = usableWidth;
      let imageHeight = usableHeight;

      if (imageRatio > pageRatio) {
        imageHeight = usableWidth / imageRatio;
      } else {
        imageWidth = usableHeight * imageRatio;
      }

      const x = marginX + (usableWidth - imageWidth) / 2;
      const y = marginY + (usableHeight - imageHeight) / 2;

      pdf.addImage(imageData, "JPEG", x, y, imageWidth, imageHeight);
      pdf.save(`shift-${weekStartDate}-${weekEndDate}.pdf`);

      setMessage("PDFを保存しました");
    } catch (error) {
      console.error("PDF保存失敗:", error);
      setMessage("PDF保存に失敗しました");
    } finally {
      printArea.style.width = originalWidth;
      printArea.style.minWidth = originalMinWidth;
      printArea.style.maxWidth = originalMaxWidth;
      printArea.style.margin = originalMargin;

      document.body.classList.remove("pdf-capture-mode");
    }
  };

  if (loading) {
    return (
      <div className="shift-print-page">
        <div className="shift-print-loading">
          <h1>読み込み中...</h1>
          <p>シフト表を取得しています。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shift-print-page">
      <div className="shift-print-actions print-hide">
        <button type="button" onClick={() => navigate("/owner")}>
          戻る
        </button>

        <button type="button" onClick={handlePrevWeek}>
          前の週
        </button>

        <button type="button" onClick={handleThisWeek}>
          今週
        </button>

        <button type="button" onClick={handleNextWeek}>
          次の週
        </button>

        <label className="shift-print-date-control">
          週の開始日
          <input
            type="date"
            value={weekStartDate}
            onChange={(e) => setWeekStartDate(e.target.value)}
          />
        </label>

        <button type="button" onClick={handlePrint}>
          印刷
        </button>

        <button type="button" onClick={handleSavePdf}>
          PDF保存
        </button>
      </div>

      {message && <p className="shift-print-message print-hide">{message}</p>}

      <div ref={printAreaRef} className="shift-print-paper">
        <header className="shift-print-header">
          <div>
            <h1>シフト表</h1>
            <p>
              {getDateLabel(weekStartDate)} 〜 {getDateLabel(weekEndDate)}
            </p>
          </div>
          <div className="shift-print-shop-name">
            <span>作成者：{ownerName}</span>
          </div>
        </header>

        <div className="shift-print-timeline-wrap">
          <ShiftTimeline shifts={weeklyTimelineShifts} printMode />
        </div>
      </div>
    </div>
  );
}