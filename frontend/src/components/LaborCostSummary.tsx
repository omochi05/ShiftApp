import "./LaborCostSummary.css";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  hourly_wage: number;
};

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

type LaborCostSummaryProps = {
  shifts: ShiftForTimeline[];
  users: User[];
};

type EmployeeLaborSummary = {
  userId: number;
  name: string;
  hourlyWage: number;
  normalMinutes: number;
  nightMinutes: number;
  totalMinutes: number;
  totalCost: number;
};

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

function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)}時間`;
}

function calculateShiftCost(shift: ShiftForTimeline, hourlyWage: number) {
  const { start, end, total } = getShiftRawMinutes(
    shift.start_time,
    shift.end_time
  );

  const breakMinutes = Math.min(Math.max(shift.break_minutes ?? 0, 0), total);

  const rawNightMinutes = Math.min(getNightMinutes(start, end), total);
  const rawNormalMinutes = Math.max(total - rawNightMinutes, 0);

  /*
    休憩時間はまず通常時間から引く。
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

function calculateLaborSummary(shifts: ShiftForTimeline[], users: User[]) {
  const employeeMap = new Map<number, EmployeeLaborSummary>();

  shifts
    .filter((shift) => shift.id > 0)
    .forEach((shift) => {
      const user = users.find((u) => u.id === shift.user_id);
      const hourlyWage = user?.hourly_wage ?? 0;
      const name = user?.name ?? shift.user_name ?? `従業員${shift.user_id}`;

      const shiftCost = calculateShiftCost(shift, hourlyWage);

      const current =
        employeeMap.get(shift.user_id) ??
        ({
          userId: shift.user_id,
          name,
          hourlyWage,
          normalMinutes: 0,
          nightMinutes: 0,
          totalMinutes: 0,
          totalCost: 0,
        } satisfies EmployeeLaborSummary);

      current.normalMinutes += shiftCost.normalMinutes;
      current.nightMinutes += shiftCost.nightMinutes;
      current.totalMinutes += shiftCost.totalMinutes;
      current.totalCost += shiftCost.totalCost;

      employeeMap.set(shift.user_id, current);
    });

  const employees = Array.from(employeeMap.values()).sort(
    (a, b) => b.totalCost - a.totalCost
  );

  const totalNormalMinutes = employees.reduce(
    (total, employee) => total + employee.normalMinutes,
    0
  );

  const totalNightMinutes = employees.reduce(
    (total, employee) => total + employee.nightMinutes,
    0
  );

  const totalMinutes = employees.reduce(
    (total, employee) => total + employee.totalMinutes,
    0
  );

  const totalCost = employees.reduce(
    (total, employee) => total + employee.totalCost,
    0
  );

  return {
    employees,
    totalNormalMinutes,
    totalNightMinutes,
    totalMinutes,
    totalCost,
  };
}

export default function LaborCostSummary({
  shifts,
  users,
}: LaborCostSummaryProps) {
  const summary = calculateLaborSummary(shifts, users);

  return (
    <section className="labor-cost-section">
      <div className="labor-cost-header">
        <div>
          <h2>この週の人件費</h2>
          <p>深夜時間は 22:00〜5:00 を 1.25倍で計算しています</p>
        </div>
      </div>

      <div className="labor-cost-summary-grid">
        <div className="labor-cost-card main">
          <span>人件費合計</span>
          <strong>{summary.totalCost.toLocaleString()}円</strong>
        </div>

        <div className="labor-cost-card">
          <span>勤務時間合計</span>
          <strong>{formatHours(summary.totalMinutes)}</strong>
        </div>

        <div className="labor-cost-card">
          <span>通常時間</span>
          <strong>{formatHours(summary.totalNormalMinutes)}</strong>
        </div>

        <div className="labor-cost-card">
          <span>深夜時間</span>
          <strong>{formatHours(summary.totalNightMinutes)}</strong>
        </div>
      </div>

      <div className="labor-cost-table-wrap">
        <table className="labor-cost-table">
          <thead>
            <tr>
              <th>従業員</th>
              <th>時給</th>
              <th>通常時間</th>
              <th>深夜時間</th>
              <th>合計時間</th>
              <th>人件費</th>
            </tr>
          </thead>

          <tbody>
            {summary.employees.length === 0 ? (
              <tr>
                <td colSpan={6}>この週のシフトはまだありません</td>
              </tr>
            ) : (
              summary.employees.map((employee) => (
                <tr key={employee.userId}>
                  <td>{employee.name}</td>
                  <td>{employee.hourlyWage.toLocaleString()}円</td>
                  <td>{formatHours(employee.normalMinutes)}</td>
                  <td>{formatHours(employee.nightMinutes)}</td>
                  <td>{formatHours(employee.totalMinutes)}</td>
                  <td>{employee.totalCost.toLocaleString()}円</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}