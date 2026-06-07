import { useRef } from "react";
import "./ShiftTimeline.css";

export type ShiftItem = {
  id: number;
  user_id: number;
  user_name?: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes?: number;
  memo?: string;
};

type Props = {
  shifts: ShiftItem[];
  onDeleteShift?: (shiftId: number) => void;
};

const HOURS = [
  6, 7, 8, 9, 10, 11, 12,
  13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 0, 1, 2, 3, 4, 5,
];

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function normalizeTime(time?: string) {
  if (!time || typeof time !== "string") {
    return "00:00";
  }

  return time.slice(0, 5);
}

function timeToPosition(time?: string) {
  const safeTime = normalizeTime(time);
  const [h, m] = safeTime.split(":").map(Number);

  if (Number.isNaN(h) || Number.isNaN(m)) {
    return 0;
  }

  let hour = h + m / 60;

  if (hour < 6) {
    hour += 24;
  }

  return hour - 6;
}

function getShiftStyle(start?: string, end?: string) {
  let startPos = timeToPosition(start);
  let endPos = timeToPosition(end);

  if (endPos <= startPos) {
    endPos += 24;
  }

  const left = `${(startPos / 24) * 100}%`;
  const width = `${((endPos - startPos) / 24) * 100}%`;

  return { left, width };
}

function groupByDate(shifts: ShiftItem[]) {
  const map: Record<string, ShiftItem[]> = {};

  for (const shift of shifts) {
    if (!shift.work_date) {
      continue;
    }

    if (!map[shift.work_date]) {
      map[shift.work_date] = [];
    }

    map[shift.work_date].push(shift);
  }

  return map;
}

function formatDateLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);

  if (Number.isNaN(d.getTime())) {
    return dateStr;
  }

  const month = d.getMonth() + 1;
  const date = d.getDate();
  const weekday = WEEKDAYS[d.getDay()];

  return `${month}/${date}（${weekday}）`;
}

export default function ShiftTimeline({ shifts, onDeleteShift }: Props) {
  const longPressTimerRef = useRef<number | null>(null);

  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const grouped = groupByDate(safeShifts);
  const dates = Object.keys(grouped).sort();

  const startLongPress = (shiftId: number) => {
    cancelLongPress();

    longPressTimerRef.current = window.setTimeout(() => {
      if (onDeleteShift) {
        onDeleteShift(shiftId);
      }
    }, 700);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleRightClickDelete = (
    e: React.MouseEvent<HTMLDivElement>,
    shiftId: number
  ) => {
    e.preventDefault();

    if (onDeleteShift) {
      onDeleteShift(shiftId);
    }
  };

  if (dates.length === 0) {
    return <p className="timeline-empty">シフトはありません</p>;
  }

  return (
    <div className="timeline-sheet">
      <div className="timeline-header">
        <div className="timeline-date-cell">日付</div>

        <div className="timeline-hours">
          {HOURS.map((hour, index) => (
            <div key={`${hour}-${index}`} className="timeline-hour-cell">
              {hour}
            </div>
          ))}
        </div>
      </div>

      {dates.map((date) => {
        const dayShifts = grouped[date];

        return (
          <div className="timeline-row" key={date}>
            <div className="timeline-date-cell timeline-date-label">
              {formatDateLabel(date)}
            </div>

            <div className="timeline-grid-area">
              <div className="timeline-grid">
                {HOURS.map((hour, index) => (
                  <div
                    key={`${hour}-${index}`}
                    className="timeline-grid-cell"
                  />
                ))}
              </div>

              <div className="timeline-shifts">
                {dayShifts.map((shift, index) => {
                  const style = getShiftStyle(
                    shift.start_time,
                    shift.end_time
                  );

                  return (
                    <div
                      key={shift.id}
                      className="timeline-shift-bar"
                      style={{
                        ...style,
                        top: `${index * 38 + 6}px`,
                      }}
                      title="PC: 右クリックで削除 / スマホ: 長押しで削除"
                      onContextMenu={(e) =>
                        handleRightClickDelete(e, shift.id)
                      }
                      onTouchStart={() => startLongPress(shift.id)}
                      onTouchEnd={cancelLongPress}
                      onTouchMove={cancelLongPress}
                      onTouchCancel={cancelLongPress}
                    >
                      <span className="timeline-shift-text">
                        {shift.user_name ?? `従業員${shift.user_id}`}{" "}
                        {normalizeTime(shift.start_time)}〜
                        {normalizeTime(shift.end_time)}
                        {shift.memo ? ` / ${shift.memo}` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div
                className="timeline-row-spacer"
                style={{
                  height: `${Math.max(dayShifts.length, 1) * 38 + 8}px`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}