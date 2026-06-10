import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, TouchEvent } from "react";
import {
  getJapaneseHolidayName,
  isSundayOrJapaneseHoliday,
} from "../utils/japaneseHolidays";
import "./ShiftTimeline.css";

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

type ShiftTimelineProps = {
  shifts: ShiftForTimeline[];
  editable?: boolean;
  onEditShift?: (shift: ShiftForTimeline) => void;
  onDeleteShift?: (shiftId: number) => void;
  printMode?: boolean;
};

type PositionedShift = ShiftForTimeline & {
  left: number;
  width: number;
  lane: number;
  startValue: number;
  endValue: number;
};

type AutoPrintSize = {
  laneHeight: number;
  barHeight: number;
  barTopOffset: number;
  nameFontSize: number;
  barPaddingX: number;
};

type ShiftContextMenu = {
  x: number;
  y: number;
  shift: ShiftForTimeline;
};

const START_HOUR = 6;
const TOTAL_HOURS = 24;
const LONG_PRESS_MS = 550;

const NORMAL_LANE_HEIGHT = 30;
const NORMAL_BAR_HEIGHT = 24;
const NORMAL_BAR_TOP_OFFSET = 8;
const NORMAL_NAME_FONT_SIZE = 14;
const NORMAL_BAR_PADDING_X = 6;

const hourLabels = [
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
];

const weekDayLabels = ["日", "月", "火", "水", "木", "金", "土"];

function parseTimeToHourValue(time: string) {
  const [hourText, minuteText] = time.slice(0, 5).split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return START_HOUR;
  }

  return hour + minute / 60;
}

function convertToTimelineValue(time: string) {
  let value = parseTimeToHourValue(time);

  if (value < START_HOUR) {
    value += 24;
  }

  return value;
}

function getShiftPosition(shift: ShiftForTimeline) {
  let startValue = convertToTimelineValue(shift.start_time);
  let endValue = convertToTimelineValue(shift.end_time);

  if (endValue <= startValue) {
    endValue += 24;
  }

  const minValue = START_HOUR;
  const maxValue = START_HOUR + TOTAL_HOURS;

  const clippedStart = Math.max(startValue, minValue);
  const clippedEnd = Math.min(endValue, maxValue);

  const left = ((clippedStart - START_HOUR) / TOTAL_HOURS) * 100;
  const width = ((clippedEnd - clippedStart) / TOTAL_HOURS) * 100;

  return {
    left,
    width: Math.max(width, 1.5),
    startValue,
    endValue,
  };
}

function formatDate(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekDay = weekDayLabels[date.getDay()];

  return `${month}/${day}\n（${weekDay}）`;
}

function formatDisplayTime(time: string) {
  const [hourText, minuteText] = time.slice(0, 5).split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return time;
  }

  return `${hour}:${String(minute).padStart(2, "0")}`;
}

function groupShiftsByDate(shifts: ShiftForTimeline[]) {
  const map = new Map<string, ShiftForTimeline[]>();

  shifts.forEach((shift) => {
    if (!map.has(shift.work_date)) {
      map.set(shift.work_date, []);
    }

    map.get(shift.work_date)?.push(shift);
  });

  return Array.from(map.entries()).sort(([dateA], [dateB]) =>
    dateA.localeCompare(dateB)
  );
}

function positionShifts(shifts: ShiftForTimeline[]) {
  const realShifts = shifts
    .filter((shift) => shift.user_name.trim() !== "")
    .map((shift) => {
      const position = getShiftPosition(shift);

      return {
        ...shift,
        ...position,
        lane: 0,
      };
    })
    .sort((a, b) => {
      if (a.startValue !== b.startValue) {
        return a.startValue - b.startValue;
      }

      return a.endValue - b.endValue;
    });

  const laneEnds: number[] = [];

  const positioned: PositionedShift[] = realShifts.map((shift) => {
    let laneIndex = laneEnds.findIndex((end) => end <= shift.startValue);

    if (laneIndex === -1) {
      laneIndex = laneEnds.length;
      laneEnds.push(shift.endValue);
    } else {
      laneEnds[laneIndex] = shift.endValue;
    }

    return {
      ...shift,
      lane: laneIndex,
    };
  });

  return {
    positioned,
    laneCount: Math.max(laneEnds.length, 1),
  };
}

function getAutoPrintSize(maxLaneCount: number): AutoPrintSize {
  if (maxLaneCount <= 1) {
    return {
      laneHeight: 44,
      barHeight: 36,
      barTopOffset: 5,
      nameFontSize: 19,
      barPaddingX: 12,
    };
  }

  if (maxLaneCount === 2) {
    return {
      laneHeight: 39,
      barHeight: 32,
      barTopOffset: 5,
      nameFontSize: 18,
      barPaddingX: 11,
    };
  }

  if (maxLaneCount === 3) {
    return {
      laneHeight: 34,
      barHeight: 28,
      barTopOffset: 5,
      nameFontSize: 16,
      barPaddingX: 10,
    };
  }

  if (maxLaneCount === 4) {
    return {
      laneHeight: 31,
      barHeight: 25,
      barTopOffset: 4,
      nameFontSize: 16,
      barPaddingX: 8,
    };
  }

  return {
    laneHeight: 27,
    barHeight: 22,
    barTopOffset: 3,
    nameFontSize: 14.5,
    barPaddingX: 7,
  };
}

function getSafeMenuPosition(x: number, y: number) {
  const menuWidth = 170;
  const menuHeight = 104;
  const padding = 12;

  const safeX = Math.min(x, window.innerWidth - menuWidth - padding);
  const safeY = Math.min(y, window.innerHeight - menuHeight - padding);

  return {
    x: Math.max(padding, safeX),
    y: Math.max(padding, safeY),
  };
}

export default function ShiftTimeline({
  shifts,
  editable = false,
  onEditShift,
  onDeleteShift,
  printMode = false,
}: ShiftTimelineProps) {
  const [contextMenu, setContextMenu] = useState<ShiftContextMenu | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  const groupedShifts = groupShiftsByDate(shifts);

  const groupedWithPositions = groupedShifts.map(([date, dayShifts]) => {
    const { positioned, laneCount } = positionShifts(dayShifts);

    return {
      date,
      positioned,
      laneCount,
    };
  });

  const maxLaneCount = Math.max(
    ...groupedWithPositions.map((group) => group.laneCount),
    1
  );

  const autoPrintSize = getAutoPrintSize(maxLaneCount);

  const laneHeight = printMode
    ? autoPrintSize.laneHeight
    : NORMAL_LANE_HEIGHT;

  const barHeight = printMode ? autoPrintSize.barHeight : NORMAL_BAR_HEIGHT;

  const barTopOffset = printMode
    ? autoPrintSize.barTopOffset
    : NORMAL_BAR_TOP_OFFSET;

  const nameFontSize = printMode
    ? autoPrintSize.nameFontSize
    : NORMAL_NAME_FONT_SIZE;

  const barPaddingX = printMode
    ? autoPrintSize.barPaddingX
    : NORMAL_BAR_PADDING_X;

  const closeMenu = () => {
    setContextMenu(null);
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const openMenu = (x: number, y: number, shift: ShiftForTimeline) => {
    if (!editable || printMode || shift.id < 0) {
      return;
    }

    const safePosition = getSafeMenuPosition(x, y);

    setContextMenu({
      x: safePosition.x,
      y: safePosition.y,
      shift,
    });
  };

  const handleClickShift = (
    event: MouseEvent<HTMLDivElement>,
    shift: ShiftForTimeline
  ) => {
    if (!editable || printMode || shift.id < 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    openMenu(event.clientX, event.clientY, shift);
  };

  const handleContextMenu = (
    event: MouseEvent<HTMLDivElement>,
    shift: ShiftForTimeline
  ) => {
    if (!editable || printMode || shift.id < 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    openMenu(event.clientX, event.clientY, shift);
  };

  const handleTouchStart = (
    event: TouchEvent<HTMLDivElement>,
    shift: ShiftForTimeline
  ) => {
    if (!editable || printMode || shift.id < 0) {
      return;
    }

    clearLongPressTimer();

    const touch = event.touches[0];

    longPressTimerRef.current = window.setTimeout(() => {
      openMenu(touch.clientX, touch.clientY, shift);
    }, LONG_PRESS_MS);
  };

  const handleTouchEnd = () => {
    clearLongPressTimer();
  };

  const handleTouchMove = () => {
    clearLongPressTimer();
  };

  const handleEditFromMenu = () => {
    if (!contextMenu) {
      return;
    }

    onEditShift?.(contextMenu.shift);
    closeMenu();
  };

  const handleDeleteFromMenu = () => {
    if (!contextMenu) {
      return;
    }

    onDeleteShift?.(contextMenu.shift.id);
    closeMenu();
  };

  useEffect(() => {
    const handleClick = () => closeMenu();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("click", handleClick);
    window.addEventListener("scroll", handleClick, true);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleClick, true);
      window.removeEventListener("keydown", handleKeyDown);
      clearLongPressTimer();
    };
  }, []);

  return (
    <div
      className={`shift-timeline ${
        printMode ? "shift-timeline-print" : "shift-timeline-normal"
      } ${editable ? "shift-timeline-editable" : ""}`}
      style={
        {
          "--shift-lane-height": `${laneHeight}px`,
          "--shift-bar-height": `${barHeight}px`,
          "--shift-bar-top-offset": `${barTopOffset}px`,
          "--shift-name-font-size": `${nameFontSize}px`,
          "--shift-bar-padding-x": `${barPaddingX}px`,
        } as CSSProperties
      }
    >
      {groupedWithPositions.map(({ date, positioned, laneCount }) => {
        const bodyHeight = printMode
          ? Math.max(
              laneCount * laneHeight + barTopOffset + 6,
              barHeight + barTopOffset + 8
            )
          : Math.max(66, laneCount * laneHeight + 16);

        const holidayName = getJapaneseHolidayName(date);

        return (
          <div key={date} className="shift-timeline-day">
            <div
              className={`shift-timeline-date ${
                isSundayOrJapaneseHoliday(date) ? "shift-timeline-date-red" : ""
              }`}
              title={holidayName}
            >
              {formatDate(date)
                .split("\n")
                .map((line) => (
                  <span key={line}>{line}</span>
                ))}
            </div>

            <div className="shift-timeline-hours">
              {hourLabels.map((hour, index) => (
                <div
                  key={`${date}-${hour}-${index}`}
                  className="shift-timeline-hour"
                  style={{
                    left: `${(index / TOTAL_HOURS) * 100}%`,
                  }}
                >
                  {hour}
                </div>
              ))}
            </div>

            <div
              className="shift-timeline-body"
              style={{
                minHeight: `${bodyHeight}px`,
              }}
            >
              {Array.from({ length: TOTAL_HOURS + 1 }, (_, index) => (
                <div
                  key={`${date}-grid-${index}`}
                  className={`shift-grid-line ${
                    index % 3 === 0 ? "shift-grid-line-major" : ""
                  }`}
                  style={{
                    left: `${(index / TOTAL_HOURS) * 100}%`,
                  }}
                />
              ))}

              {positioned.map((shift) => {
                const startTime = formatDisplayTime(shift.start_time);
                const endTime = formatDisplayTime(shift.end_time);

                return (
                  <div
                    key={shift.id}
                    className="shift-bar"
                    style={{
                      left: `${shift.left}%`,
                      width: `${shift.width}%`,
                      top: `${barTopOffset + shift.lane * laneHeight}px`,
                    }}
                    title={`${shift.user_name} ${startTime}〜${endTime}`}
                    onClick={(event) => handleClickShift(event, shift)}
                    onContextMenu={(event) => handleContextMenu(event, shift)}
                    onTouchStart={(event) => handleTouchStart(event, shift)}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                  >
                    <span
                      className={
                        printMode
                          ? "shift-bar-print-name"
                          : "shift-bar-normal-content"
                      }
                    >
                      <span className="shift-bar-name">{shift.user_name}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {contextMenu && (
        <div
          className="shift-context-menu"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={handleEditFromMenu}>
            編集
          </button>

          <button type="button" onClick={handleDeleteFromMenu}>
            削除
          </button>
        </div>
      )}
    </div>
  );
}