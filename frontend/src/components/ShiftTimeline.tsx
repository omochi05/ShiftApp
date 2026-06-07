import { useRef, type MouseEvent } from "react";
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

type PositionedShift = ShiftItem & {
  lane: number;
};

const HOURS = [
  6, 7, 8, 9, 10, 11, 12,
  13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 0, 1, 2, 3, 4, 5,
];

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const MAX_LANES = 3;
const LANE_HEIGHT = 38;
const ROW_BASE_PADDING = 8;

function isPlaceholderShift(shift: ShiftItem) {
  return shift.user_id === 0 || shift.id < 0;
}

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

  // 0:00〜5:59 は翌日扱い
  if (hour < 6) {
    hour += 24;
  }

  return hour - 6;
}

function getShiftRange(start?: string, end?: string) {
  const startPos = timeToPosition(start);
  let endPos = timeToPosition(end);

  // 日跨ぎ対応
  if (endPos <= startPos) {
    endPos += 24;
  }

  return { startPos, endPos };
}

function getShiftStyle(start?: string, end?: string) {
  const { startPos, endPos } = getShiftRange(start, end);

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

function layoutShiftsForDay(dayShifts: ShiftItem[]) {
  const realShifts = dayShifts.filter((shift) => !isPlaceholderShift(shift));

  const sorted = [...realShifts].sort((a, b) => {
    const aStart = getShiftRange(a.start_time, a.end_time).startPos;
    const bStart = getShiftRange(b.start_time, b.end_time).startPos;

    if (aStart !== bStart) {
      return aStart - bStart;
    }

    return a.id - b.id;
  });

  const laneEndTimes = Array(MAX_LANES).fill(-1);
  const visible: PositionedShift[] = [];
  const hidden: ShiftItem[] = [];

  for (const shift of sorted) {
    const { startPos, endPos } = getShiftRange(shift.start_time, shift.end_time);

    let assignedLane = -1;

    for (let lane = 0; lane < MAX_LANES; lane++) {
      if (startPos >= laneEndTimes[lane]) {
        assignedLane = lane;
        laneEndTimes[lane] = endPos;
        break;
      }
    }

    if (assignedLane === -1) {
      hidden.push(shift);
    } else {
      visible.push({
        ...shift,
        lane: assignedLane,
      });
    }
  }

  return {
    visible,
    hiddenCount: hidden.length,
    rowHeight: MAX_LANES * LANE_HEIGHT + ROW_BASE_PADDING,
  };
}

export default function ShiftTimeline({ shifts, onDeleteShift }: Props) {
  const longPressTimerRef = useRef<number | null>(null);

  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const grouped = groupByDate(safeShifts);
  const dates = Object.keys(grouped).sort();

  const cancelLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startLongPress = (shiftId: number) => {
    cancelLongPress();

    longPressTimerRef.current = window.setTimeout(() => {
      if (onDeleteShift) {
        onDeleteShift(shiftId);
      }
    }, 700);
  };

  const handleRightClickDelete = (
    e: MouseEvent<HTMLDivElement>,
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
        const { visible, hiddenCount, rowHeight } =
          layoutShiftsForDay(dayShifts);

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
                {visible.map((shift) => {
                  const style = getShiftStyle(shift.start_time, shift.end_time);

                  return (
                    <div
                      key={shift.id}
                      className="timeline-shift-bar"
                      style={{
                        ...style,
                        top: `${shift.lane * LANE_HEIGHT + 6}px`,
                      }}
                      title="PC: 右クリックで削除 / スマホ: 長押しで削除"
                      onContextMenu={(e) => handleRightClickDelete(e, shift.id)}
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

              {hiddenCount > 0 && (
                <div className="timeline-overflow-badge">
                  +{hiddenCount}件
                </div>
              )}

              <div
                className="timeline-row-spacer"
                style={{
                  height: `${rowHeight}px`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
