import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import type { SalaryMonthly, Shift } from "../types";

export default function EmployeeDashboard() {
  const { userId } = useParams();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [salary, setSalary] = useState<SalaryMonthly | null>(null);

  useEffect(() => {
    if (!userId) return;

    api
      .get<Shift[]>(`/shifts/user/${userId}/month?year=2026&month=6`)
      .then((res) => setShifts(res.data))
      .catch((err) => console.error(err));

    api
      .get<SalaryMonthly>(`/salary/user/${userId}/month?year=2026&month=6`)
      .then((res) => setSalary(res.data))
      .catch((err) => console.error(err));
  }, [userId]);

  return (
    <div style={{ padding: "40px" }}>
      <h1>従業員ダッシュボード</h1>

      {salary && (
        <div>
          <h2>今月の給料見込み</h2>
          <p>勤務時間：{salary.total_work_hours}時間</p>
          <p>通常時間：{salary.total_normal_hours}時間</p>
          <p>深夜時間：{salary.total_night_hours}時間</p>
          <p>給与対象額：{salary.total_salary_target_amount.toLocaleString()}円</p>
        </div>
      )}

      <h2>今月のシフト</h2>

      {shifts.length === 0 ? (
        <p>シフトはありません</p>
      ) : (
        <table border={1} cellPadding={8}>
          <thead>
            <tr>
              <th>日付</th>
              <th>開始</th>
              <th>終了</th>
              <th>休憩</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr key={shift.id}>
                <td>{shift.work_date}</td>
                <td>{shift.start_time}</td>
                <td>{shift.end_time}</td>
                <td>{shift.break_minutes}分</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}