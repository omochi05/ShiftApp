import { useState } from "react";
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
  earlyMinutes: number;
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
  早朝：6:00〜9:00
  通常：9:00〜22:00
  深夜：22:00〜翌6:00

  例：
  22:00〜06:00 → 深夜8時間
  00:00〜06:00 → 深夜6時間
  06:00〜09:00 → 早朝3時間
  09:00〜22:00 → 通常13時間
*/
function calculateShiftMinutes(shift: ShiftForTimeline) {
  const { start, end, total } = getShiftRawMinutes(
    shift.start_time,
    shift.end_time
  );

  const rawNightMinutes =
    getOverlapMinutes(start, end, 0, 6 * 60) +
    getOverlapMinutes(start, end, 22 * 60, 30 * 60);

  const rawEarlyMinutes = getOverlapMinutes(start, end, 6 * 60, 9 * 60);
  const rawNormalMinutes = getOverlapMinutes(start, end, 9 * 60, 22 * 60);

  const breakMinutes = Math.min(Math.max(shift.break_minutes ?? 0, 0), total);

  /*
    休憩は通常時間 → 早朝時間 → 深夜時間の順で引く。
    夜勤のみの場合は深夜時間から引かれる。
  */
  let remainingBreak = breakMinutes;

  const paidNormalMinutes = Math.max(rawNormalMinutes - remainingBreak, 0);
  remainingBreak = Math.max(remainingBreak - rawNormalMinutes, 0);

  const paidEarlyMinutes = Math.max(rawEarlyMinutes - remainingBreak, 0);
  remainingBreak = Math.max(remainingBreak - rawEarlyMinutes, 0);

  const paidNightMinutes = Math.max(rawNightMinutes - remainingBreak, 0);

  return {
    earlyMinutes: paidEarlyMinutes,
    normalMinutes: paidNormalMinutes,
    nightMinutes: paidNightMinutes,
    totalMinutes: paidEarlyMinutes + paidNormalMinutes + paidNightMinutes,
  };
}

function calculateShiftCost(shift: ShiftForTimeline, hourlyWage: number) {
  const minutes = calculateShiftMinutes(shift);

  const earlyCost = (minutes.earlyMinutes / 60) * hourlyWage;
  const normalCost = (minutes.normalMinutes / 60) * hourlyWage;
  const nightCost = (minutes.nightMinutes / 60) * hourlyWage * 1.25;

  return {
    ...minutes,
    totalCost: Math.round(earlyCost + normalCost + nightCost),
  };
}

function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)}時間`;
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
          earlyMinutes: 0,
          normalMinutes: 0,
          nightMinutes: 0,
          totalMinutes: 0,
          totalCost: 0,
        } satisfies EmployeeLaborSummary);

      current.earlyMinutes += shiftCost.earlyMinutes;
      current.normalMinutes += shiftCost.normalMinutes;
      current.nightMinutes += shiftCost.nightMinutes;
      current.totalMinutes += shiftCost.totalMinutes;
      current.totalCost += shiftCost.totalCost;

      employeeMap.set(shift.user_id, current);
    });

  const employees = Array.from(employeeMap.values()).sort(
    (a, b) => b.totalCost - a.totalCost
  );

  const totalEarlyMinutes = employees.reduce(
    (total, employee) => total + employee.earlyMinutes,
    0
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
    totalEarlyMinutes,
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
  const [openedEmployeeId, setOpenedEmployeeId] = useState<number | null>(null);

  const summary = calculateLaborSummary(shifts, users);

  const toggleEmployee = (userId: number) => {
    setOpenedEmployeeId((current) => (current === userId ? null : userId));
  };

  return (
    <section className="labor-cost-section">
      <div className="labor-cost-header">
        <div>
          <h2>この週の人件費</h2>
          <p>
            早朝は6:00〜9:00、通常は9:00〜22:00、深夜は22:00〜6:00として計算します。
          </p>
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
          <span>早朝時間</span>
          <strong>{formatHours(summary.totalEarlyMinutes)}</strong>
        </div>

        <div className="labor-cost-card">
          <span>深夜時間</span>
          <strong>{formatHours(summary.totalNightMinutes)}</strong>
        </div>
      </div>

      <div className="labor-cost-table-wrap">
        <table className="labor-cost-table labor-cost-compact-table">
          <thead>
            <tr>
              <th>従業員</th>
              <th>合計時間</th>
              <th>人件費</th>
            </tr>
          </thead>

          <tbody>
            {summary.employees.length === 0 ? (
              <tr>
                <td colSpan={3}>この週のシフトはまだありません</td>
              </tr>
            ) : (
              summary.employees.map((employee) => {
                const isOpened = openedEmployeeId === employee.userId;

                return (
                  <>
                    <tr key={employee.userId}>
                      <td>
                        <button
                          type="button"
                          className="labor-employee-toggle"
                          onClick={() => toggleEmployee(employee.userId)}
                        >
                          <span>{employee.name}</span>
                          <small>{isOpened ? "閉じる" : "詳細"}</small>
                        </button>
                      </td>

                      <td>{formatHours(employee.totalMinutes)}</td>
                      <td>{employee.totalCost.toLocaleString()}円</td>
                    </tr>

                    {isOpened && (
                      <tr key={`${employee.userId}-detail`}>
                        <td colSpan={3} className="labor-detail-cell">
                          <div className="labor-detail-grid">
                            <div>
                              <span>時給</span>
                              <strong>
                                {employee.hourlyWage.toLocaleString()}円
                              </strong>
                            </div>

                            <div>
                              <span>早朝時間</span>
                              <strong>
                                {formatHours(employee.earlyMinutes)}
                              </strong>
                            </div>

                            <div>
                              <span>通常時間</span>
                              <strong>
                                {formatHours(employee.normalMinutes)}
                              </strong>
                            </div>

                            <div>
                              <span>深夜時間</span>
                              <strong>
                                {formatHours(employee.nightMinutes)}
                              </strong>
                            </div>

                            <div>
                              <span>合計時間</span>
                              <strong>
                                {formatHours(employee.totalMinutes)}
                              </strong>
                            </div>

                            <div>
                              <span>人件費</span>
                              <strong>
                                {employee.totalCost.toLocaleString()}円
                              </strong>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}