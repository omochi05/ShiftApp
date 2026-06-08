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
  const [hourText, minuteText] = time.split(":");
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
  const [hourText, minuteText] = time.split(":");

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

export default function ShiftTimeline({ shifts }: ShiftTimelineProps) {
  const groupedShifts = groupShiftsByDate(shifts);

  return (
    <div className="shift-timeline">
      <div className="shift-timeline-header">
        <div className="shift-timeline-date-head">日付</div>

        <div className="shift-timeline-hours">
          {hourLabels.map((hour, index) => (
            <div
              key={`${hour}-${index}`}
              className={`shift-timeline-hour ${
                index % 3 === 0 ? "shift-timeline-hour-strong" : ""
              }`}
            >
              {hour}
            </div>
          ))}
        </div>
      </div>

      {groupedShifts.map(([date, dayShifts]) => {
        const { positioned, laneCount } = positionShifts(dayShifts);

        return (
          <div
            key={date}
            className="shift-timeline-row"
            style={{
              minHeight: `${Math.max(76, laneCount * 38 + 18)}px`,
            }}
          >
            <div className="shift-timeline-date">
              {formatDate(date)
                .split("\n")
                .map((line) => (
                  <span key={line}>{line}</span>
                ))}
            </div>

            <div className="shift-timeline-body">
              {positioned.map((shift) => (
                <div
                  key={shift.id}
                  className="shift-bar"
                  style={{
                    left: `${shift.left}%`,
                    width: `${shift.width}%`,
                    top: `${10 + shift.lane * 38}px`,
                  }}
                  title={`${shift.user_name} ${formatDisplayTime(
                    shift.start_time
                  )}〜${formatDisplayTime(shift.end_time)}`}
                >
                  <span className="shift-bar-content">
                    <span className="shift-bar-name">{shift.user_name}</span>
                    <span className="shift-bar-time">
                      {formatDisplayTime(shift.start_time)}〜
                      {formatDisplayTime(shift.end_time)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}