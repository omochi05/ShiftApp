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

type OwnerWeekdayDashboard = {
  weekday: string;
  total_sales: number;
  total_labor_cost: number;
  labor_cost_rate: number;
};

type WeekdayLaborTableProps = {
  weekdayDashboard: OwnerWeekdayDashboard[];
  users: User[];
  shifts: Shift[];
  year: number;
  month: number;
};

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

function timeToMinutes(time: string) {
  const [hourText, minuteText] = time.slice(0, 5).split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return 0;
  }

  return hour * 60 + minute;
}

function getShiftRawMinutes(startTime: string, endTime: string) {
  let start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);

  if (end <= start) {
    end += 24 * 60;
  }

  return {
    start,
    end,
    total: Math.max(end - start, 0),
  };
}

function getOverlapMinutes(
  start: number,
  end: number,
  rangeStart: number,
  rangeEnd: number
) {
  const overlapStart = Math.max(start, rangeStart);
  const overlapEnd = Math.min(end, rangeEnd);

  return Math.max(overlapEnd - overlapStart, 0);
}

/*
  深夜時間：22:00〜翌5:00
  例：
  22:00〜06:00 → 深夜7時間
  23:00〜02:00 → 深夜3時間
  04:00〜08:00 → 深夜1時間
*/
function getNightMinutes(start: number, end: number) {
  const nightRanges = [
    {
      start: 0,
      end: 5 * 60,
    },
    {
      start: 22 * 60,
      end: 29 * 60,
    },
  ];

  return nightRanges.reduce((total, range) => {
    return total + getOverlapMinutes(start, end, range.start, range.end);
  }, 0);
}

function calculateShiftLaborCost(
  startTime: string,
  endTime: string,
  breakMinutesValue: number,
  hourlyWage: number
) {
  const { start, end, total } = getShiftRawMinutes(startTime, endTime);

  const breakMinutes = Math.min(Math.max(breakMinutesValue ?? 0, 0), total);

  const rawNightMinutes = Math.min(getNightMinutes(start, end), total);
  const rawNormalMinutes = Math.max(total - rawNightMinutes, 0);

  /*
    休憩はまず通常時間から引く。
    通常時間を超えた分だけ深夜時間から引く。
  */
  let remainingBreak = breakMinutes;

  const paidNormalMinutes = Math.max(rawNormalMinutes - remainingBreak, 0);
  remainingBreak = Math.max(remainingBreak - rawNormalMinutes, 0);

  const paidNightMinutes = Math.max(rawNightMinutes - remainingBreak, 0);

  const normalCost = (paidNormalMinutes / 60) * hourlyWage;
  const nightCost = (paidNightMinutes / 60) * hourlyWage * 1.25;

  return {
    normalMinutes: paidNormalMinutes,
    nightMinutes: paidNightMinutes,
    totalMinutes: paidNormalMinutes + paidNightMinutes,
    totalCost: Math.round(normalCost + nightCost),
  };
}

function isTargetMonth(dateText: string, year: number, month: number) {
  const date = new Date(`${dateText}T00:00:00`);

  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

function getWeekdayNumber(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`);
  return date.getDay();
}

function weekdayNameToNumber(weekdayText: string) {
  const normalized = weekdayText.replace("曜日", "").trim();

  const index = weekdayLabels.findIndex((label) => normalized.includes(label));

  if (index === -1) {
    return 0;
  }

  return index;
}

function formatRate(value: number) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return `${value.toFixed(1)}%`;
}

function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)}時間`;
}

function calculateShiftLaborCostByWeekday(
  shifts: Shift[],
  users: User[],
  year: number,
  month: number
) {
  const result = new Map<
    number,
    {
      totalCost: number;
      normalMinutes: number;
      nightMinutes: number;
      totalMinutes: number;
    }
  >();

  shifts
    .filter((shift) => shift.id > 0)
    .filter((shift) => isTargetMonth(shift.work_date, year, month))
    .forEach((shift) => {
      const user = users.find((u) => u.id === shift.user_id);
      const hourlyWage = user?.hourly_wage ?? 0;
      const weekday = getWeekdayNumber(shift.work_date);

      const cost = calculateShiftLaborCost(
        shift.start_time,
        shift.end_time,
        shift.break_minutes,
        hourlyWage
      );

      const current =
        result.get(weekday) ?? {
          totalCost: 0,
          normalMinutes: 0,
          nightMinutes: 0,
          totalMinutes: 0,
        };

      current.totalCost += cost.totalCost;
      current.normalMinutes += cost.normalMinutes;
      current.nightMinutes += cost.nightMinutes;
      current.totalMinutes += cost.totalMinutes;

      result.set(weekday, current);
    });

  return result;
}

export default function WeekdayLaborTable({
  weekdayDashboard,
  users,
  shifts,
  year,
  month,
}: WeekdayLaborTableProps) {
  const laborCostByWeekday = calculateShiftLaborCostByWeekday(
    shifts,
    users,
    year,
    month
  );

  return (
    <div className="weekday-table-wrap">
      <p className="weekday-template-note">
        登録済みのシフトをもとに、曜日別の人件費を計算しています。
        深夜時間は22:00〜5:00を1.25倍で計算します。
      </p>

      <table className="weekday-table">
        <thead>
          <tr>
            <th>曜日</th>
            <th>売上</th>
            <th>シフト人件費</th>
            <th>人件費率</th>
            <th>通常時間</th>
            <th>深夜時間</th>
          </tr>
        </thead>

        <tbody>
          {weekdayDashboard.map((item) => {
            const weekdayNumber = weekdayNameToNumber(item.weekday);

            const labor = laborCostByWeekday.get(weekdayNumber) ?? {
              totalCost: 0,
              normalMinutes: 0,
              nightMinutes: 0,
              totalMinutes: 0,
            };

            const laborCostRate =
              item.total_sales > 0
                ? Math.round((labor.totalCost / item.total_sales) * 1000) / 10
                : 0;

            return (
              <tr key={item.weekday}>
                <td>{item.weekday}</td>
                <td>{item.total_sales.toLocaleString()}円</td>

                <td className="template-labor-cell">
                  {labor.totalCost.toLocaleString()}円
                </td>

                <td>{formatRate(laborCostRate)}</td>
                <td>{formatHours(labor.normalMinutes)}</td>
                <td>{formatHours(labor.nightMinutes)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}