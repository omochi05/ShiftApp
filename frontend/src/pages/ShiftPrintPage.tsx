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

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.68
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("画像データの作成に失敗しました"));
        }
      },
      type,
      quality
    );
  });
}

function resizeCanvas(sourceCanvas: HTMLCanvasElement, maxWidth: number) {
  if (sourceCanvas.width <= maxWidth) {
    return sourceCanvas;
  }

  const ratio = maxWidth / sourceCanvas.width;
  const newWidth = maxWidth;
  const newHeight = Math.round(sourceCanvas.height * ratio);

  const resizedCanvas = document.createElement("canvas");
  resizedCanvas.width = newWidth;
  resizedCanvas.height = newHeight;

  const ctx = resizedCanvas.getContext("2d");

  if (!ctx) {
    return sourceCanvas;
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, newWidth, newHeight);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(sourceCanvas, 0, 0, newWidth, newHeight);

  return resizedCanvas;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

async function shareOrDownloadFile(file: File, fallbackBlob: Blob) {
  const canShareFiles =
    typeof navigator !== "undefined" &&
    "canShare" in navigator &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  if (canShareFiles && typeof navigator.share === "function") {
    await navigator.share({
      title: "シフト表",
      text: "シフト表を保存してください",
      files: [file],
    });
    return;
  }

  downloadBlob(fallbackBlob, file.name);
}

export default function ShiftPrintPage() {
  const sheetRef = useRef<HTMLElement | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [fileLoading, setFileLoading] = useState(false);
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

  const createShiftCanvas = async () => {
    if (!sheetRef.current) {
      throw new Error("シフト表が見つかりません");
    }

    const target = sheetRef.current;

    target.classList.add("pdf-capture-mode");

    await new Promise((resolve) => setTimeout(resolve, 150));

    try {
      const canvas = await html2canvas(target, {
        scale: 1.4,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight,
      });

      return resizeCanvas(canvas, 1800);
    } finally {
      target.classList.remove("pdf-capture-mode");
    }
  };

  const handleSavePdf = async () => {
    try {
      setFileLoading(true);

      const canvas = await createShiftCanvas();
      const imgData = canvas.toDataURL("image/jpeg", 0.62);

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a3",
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      /*
        上下が見切れないように余白を強めに設定。
        まだ切れる場合は marginY を 20〜22 に上げる。
      */
      const marginX = 10;
      const marginY = 16;

      const printableWidth = pageWidth - marginX * 2;
      const printableHeight = pageHeight - marginY * 2;

      const ratio = Math.min(
        printableWidth / canvas.width,
        printableHeight / canvas.height
      );

      const imageWidth = canvas.width * ratio;
      const imageHeight = canvas.height * ratio;

      const x = (pageWidth - imageWidth) / 2;
      const y = (pageHeight - imageHeight) / 2;

      pdf.addImage(
        imgData,
        "JPEG",
        x,
        y,
        imageWidth,
        imageHeight,
        undefined,
        "FAST"
      );

      const pdfBlob = pdf.output("blob");
      const fileName = `shift-${weekStartDate}-${weekEndDate}.pdf`;

      const file = new File([pdfBlob], fileName, {
        type: "application/pdf",
      });

      await shareOrDownloadFile(file, pdfBlob);
    } catch (error) {
      console.error("PDF保存失敗:", error);
      alert("PDFの保存に失敗しました。もう一度試してください。");
    } finally {
      setFileLoading(false);
    }
  };

  const handleSaveImage = async () => {
    try {
      setFileLoading(true);

      const canvas = await createShiftCanvas();

      const imageBlob = await canvasToBlob(canvas, "image/jpeg", 0.68);
      const fileName = `shift-${weekStartDate}-${weekEndDate}.jpg`;

      const file = new File([imageBlob], fileName, {
        type: "image/jpeg",
      });

      await shareOrDownloadFile(file, imageBlob);
    } catch (error) {
      console.error("画像保存失敗:", error);
      alert("画像の保存に失敗しました。もう一度試してください。");
    } finally {
      setFileLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    window.history.back();
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
          onClick={handleSavePdf}
          disabled={fileLoading}
        >
          {fileLoading ? "作成中..." : "PDFを保存"}
        </button>

        <button
          type="button"
          className="image-main-button"
          onClick={handleSaveImage}
          disabled={fileLoading}
        >
          {fileLoading ? "作成中..." : "画像を保存"}
        </button>

        <button
          type="button"
          className="print-main-button"
          onClick={handlePrint}
          disabled={fileLoading}
        >
          このシフト表を印刷
        </button>

        <button type="button" onClick={handleBack} disabled={fileLoading}>
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