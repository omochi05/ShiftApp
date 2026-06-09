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

const START_HOUR = 6;
const TOTAL_HOURS = 24;

const NORMAL_LANE_HEIGHT = 30;
const NORMAL_BAR_TOP_OFFSET = 8;

/*
  A3横印刷用。
  名前の枠と文字を大きくする。
*/
const PRINT_LANE_HEIGHT = 34;
const PRINT_BAR_TOP_OFFSET = 7;

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

export default function ShiftTimeline({
  shifts,
  printMode = false,
}: ShiftTimelineProps) {
  const groupedShifts = groupShiftsByDate(shifts);

  const laneHeight = printMode ? PRINT_LANE_HEIGHT : NORMAL_LANE_HEIGHT;
  const barTopOffset = printMode ? PRINT_BAR_TOP_OFFSET : NORMAL_BAR_TOP_OFFSET;

  return (
    <div
      className={`shift-timeline ${
        printMode ? "shift-timeline-print" : "shift-timeline-normal"
      }`}
    >
      {groupedShifts.map(([date, dayShifts]) => {
        const { positioned, laneCount } = positionShifts(dayShifts);

        const bodyHeight = printMode
          ? Math.max(76, laneCount * laneHeight + 16)
          : Math.max(66, laneCount * laneHeight + 16);

        return (
          <div key={date} className="shift-timeline-day">
            <div className="shift-timeline-date">
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
    </div>
  );
}