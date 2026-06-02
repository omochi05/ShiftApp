import { useEffect, useState } from "react";
import { api } from "../api/client";
import type {
  OwnerDashboard,
  OwnerWeeklyDashboard,
  Shift,
  User,
} from "../types";
import ShiftTimeline from "../components/ShiftTimeline";
import "./OwnerDashboard.css";

export default function OwnerDashboard() {
  const [dashboard, setDashboard] = useState<OwnerDashboard | null>(null);
  const [weeklyDashboard, setWeeklyDashboard] =
    useState<OwnerWeeklyDashboard | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const [userId, setUserId] = useState<number>(2);
  const [workDate, setWorkDate] = useState("2026-06-10");
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("22:00");
  const [breakMinutes, setBreakMinutes] = useState(0);

  const [week, setWeek] = useState(23);

  const [saleDate, setSaleDate] = useState("2026-06-10");
  const [saleAmount, setSaleAmount] = useState(300000);
  const [customerCount, setCustomerCount] = useState(750);
  const [saleMemo, setSaleMemo] = useState("");

  const fetchDashboard = async () => {
    const res = await api.get<OwnerDashboard>(
      "/owner/dashboard/month?year=2026&month=6"
    );
    setDashboard(res.data);
  };

  const fetchWeeklyDashboard = async () => {
    const res = await api.get<OwnerWeeklyDashboard>(
      `/owner/dashboard/week?year=2026&week=${week}`
    );
    setWeeklyDashboard(res.data);
  };

  const fetchUsers = async () => {
    const res = await api.get<User[]>("/users/");
    setUsers(res.data);
  };

  const fetchShifts = async () => {
    const res = await api.get<Shift[]>("/shifts/");
    setShifts(res.data);
  };

  useEffect(() => {
    fetchDashboard();
    fetchUsers();
    fetchShifts();
  }, []);

  useEffect(() => {
    fetchWeeklyDashboard();
  }, [week]);

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post("/shifts/", {
        user_id: userId,
        work_date: workDate,
        start_time: `${startTime}:00`,
        end_time: `${endTime}:00`,
        break_minutes: breakMinutes,
        created_by: 1,
      });

      alert("シフトを登録しました");

      await fetchShifts();
      await fetchDashboard();
      await fetchWeeklyDashboard();
    } catch (error) {
      console.error(error);
      alert("シフト登録に失敗しました");
    }
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post("/sales/", {
        sale_date: saleDate,
        amount: saleAmount,
        customer_count: customerCount,
        memo: saleMemo,
      });

      alert("売上を登録しました");

      await fetchDashboard();
      await fetchWeeklyDashboard();
    } catch (error) {
      console.error(error);
      alert("売上登録に失敗しました。同じ日付の売上がすでにある可能性があります。");
    }
  };

  if (!dashboard) {
    return <div className="owner-page">読み込み中...</div>;
  }

  return (
    <div className="owner-page">
      <div className="owner-header">
        <div>
          <h1>オーナーダッシュボード</h1>
          <p>売上・人件費・シフトを管理できます</p>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span>対象月</span>
          <strong>
            {dashboard.year}年{dashboard.month}月
          </strong>
        </div>

        <div className="summary-card">
          <span>売上合計</span>
          <strong>{dashboard.total_sales.toLocaleString()}円</strong>
        </div>

        <div className="summary-card">
          <span>人件費</span>
          <strong>{dashboard.total_labor_cost.toLocaleString()}円</strong>
        </div>

        <div className="summary-card">
          <span>人件費率</span>
          <strong>{dashboard.labor_cost_rate}%</strong>
        </div>
      </div>

      <section className="owner-section">
        <h2>週の黒字・赤字判定</h2>

        <div className="form-row">
          <label>
            週番号
            <input
              type="number"
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
            />
          </label>
        </div>

        {weeklyDashboard && (
          <div
            className={
              weeklyDashboard.status === "黒字"
                ? "profit-card black"
                : "profit-card red"
            }
          >
            <p>
              対象期間：{weeklyDashboard.start_date} 〜{" "}
              {weeklyDashboard.end_date}
            </p>
            <p>週の売上：{weeklyDashboard.total_sales.toLocaleString()}円</p>
            <p>
              週の人件費：
              {weeklyDashboard.total_labor_cost.toLocaleString()}円
            </p>
            <p>利益：{weeklyDashboard.profit.toLocaleString()}円</p>
            <p>人件費率：{weeklyDashboard.labor_cost_rate}%</p>
            <h3>判定：{weeklyDashboard.status}</h3>
          </div>
        )}
      </section>

      <div className="form-grid">
        <section className="owner-section">
          <h2>売上入力</h2>

          <form onSubmit={handleCreateSale} className="owner-form">
            <label>
              売上日
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </label>

            <label>
              売上金額
              <input
                type="number"
                value={saleAmount}
                onChange={(e) => setSaleAmount(Number(e.target.value))}
              />
            </label>

            <label>
              客数
              <input
                type="number"
                value={customerCount}
                onChange={(e) => setCustomerCount(Number(e.target.value))}
              />
            </label>

            <label>
              メモ
              <input
                type="text"
                value={saleMemo}
                onChange={(e) => setSaleMemo(e.target.value)}
              />
            </label>

            <button type="submit">売上を登録</button>
          </form>
        </section>

        <section className="owner-section">
          <h2>シフト作成</h2>

          <form onSubmit={handleCreateShift} className="owner-form">
            <label>
              従業員
              <select
                value={userId}
                onChange={(e) => setUserId(Number(e.target.value))}
              >
                {users
                  .filter((user) => user.role !== "owner")
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}（{user.role}）
                    </option>
                  ))}
              </select>
            </label>

            <label>
              勤務日
              <input
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
              />
            </label>

            <label>
              開始時間
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </label>

            <label>
              終了時間
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </label>

            <label>
              休憩時間（分）
              <input
                type="number"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(Number(e.target.value))}
              />
            </label>

            <button type="submit">シフトを登録</button>
          </form>
        </section>
      </div>

      <section className="owner-section">
        <h2>シフト表</h2>
        <div className="timeline-wrap">
          <ShiftTimeline shifts={shifts} users={users} />
        </div>
      </section>
    </div>
  );
}