import { useEffect, useState } from "react";
import { api } from "../api/client";
import ShiftTimeline from "../components/ShiftTimeline";
import "./OwnerDashboard.css";

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

type OwnerDashboardMonthly = {
  year: number;
  month: number;
  total_sales: number;
  total_labor_cost: number;
  labor_cost_rate: number;
};

type OwnerWeeklyDashboard = {
  year: number;
  week: number;
  start_date?: string;
  end_date?: string;
  total_sales: number;
  total_labor_cost: number;
  profit?: number;
  status?: string;
  labor_cost_rate?: number;
};

type SaleCreate = {
  sale_date: string;
  amount: number;
  customer_count: number;
  memo: string;
};

type ShiftCreate = {
  user_id: number;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  created_by: number;
};

function OwnerDashboard() {
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [week, setWeek] = useState(23);

  const [dashboard, setDashboard] = useState<OwnerDashboardMonthly | null>(null);
  const [weeklyDashboard, setWeeklyDashboard] =
    useState<OwnerWeeklyDashboard | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [saleForm, setSaleForm] = useState<SaleCreate>({
    sale_date: "2026-06-10",
    amount: 300000,
    customer_count: 750,
    memo: "テスト売上",
  });

  const [shiftForm, setShiftForm] = useState<ShiftCreate>({
    user_id: 2,
    work_date: "2026-06-11",
    start_time: "17:00",
    end_time: "22:00",
    break_minutes: 0,
    created_by: 1,
  });

  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    password: "password",
    hourly_wage: 1200,
  });

  const [saleMessage, setSaleMessage] = useState("");
  const [shiftMessage, setShiftMessage] = useState("");
  const [employeeMessage, setEmployeeMessage] = useState("");

  const fetchUsers = async () => {
    const res = await api.get<User[]>("/users/");
    setUsers(res.data);
  };

  const fetchShifts = async () => {
    const res = await api.get<Shift[]>("/shifts/");
    setShifts(res.data);
  };

  const fetchDashboard = async () => {
    const res = await api.get<OwnerDashboardMonthly>(
      `/owner/dashboard/month?year=${year}&month=${month}`
    );
    setDashboard(res.data);
  };

  const fetchWeeklyDashboard = async () => {
    try {
      const res = await api.get<OwnerWeeklyDashboard>(
        `/owner/dashboard/week?year=${year}&week=${week}`
      );
      setWeeklyDashboard(res.data);
    } catch (error) {
      console.error("週間ダッシュボード取得失敗:", error);
      setWeeklyDashboard(null);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      await Promise.all([
        fetchUsers(),
        fetchShifts(),
        fetchDashboard(),
        fetchWeeklyDashboard(),
      ]);
    } catch (error) {
      console.error("データ取得失敗:", error);
      setErrorMessage("データの取得に失敗しました。API接続やCORS設定を確認してください。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, week]);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaleMessage("");

      await api.post("/sales/", {
        sale_date: saleForm.sale_date,
        amount: Number(saleForm.amount),
        customer_count: Number(saleForm.customer_count),
        memo: saleForm.memo,
      });

      setSaleMessage("売上を登録しました");
      await fetchDashboard();
      await fetchWeeklyDashboard();
    } catch (error: any) {
      console.error("売上登録失敗:", error);

      if (error.response?.status === 400 || error.response?.status === 409) {
        setSaleMessage("同じ日付の売上がすでに登録されています");
      } else {
        setSaleMessage("売上登録に失敗しました");
      }
    }
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setShiftMessage("");

      await api.post("/shifts/", {
        user_id: Number(shiftForm.user_id),
        work_date: shiftForm.work_date,
        start_time: shiftForm.start_time,
        end_time: shiftForm.end_time,
        break_minutes: Number(shiftForm.break_minutes),
        created_by: Number(shiftForm.created_by),
      });

      setShiftMessage("シフトを作成しました");
      await fetchShifts();
      await fetchDashboard();
      await fetchWeeklyDashboard();
    } catch (error) {
      console.error("シフト作成失敗:", error);
      setShiftMessage("シフト作成に失敗しました");
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setEmployeeMessage("");

      await api.post("/users/", {
        name: newEmployee.name,
        email: newEmployee.email,
        password: newEmployee.password,
        role: "employee",
        hourly_wage: Number(newEmployee.hourly_wage),
      });

      setEmployeeMessage("従業員を追加しました");

      setNewEmployee({
        name: "",
        email: "",
        password: "password",
        hourly_wage: 1200,
      });

      await fetchUsers();
    } catch (error: any) {
      console.error("従業員追加失敗:", error);

      if (error.response?.status === 400) {
        setEmployeeMessage("このメールアドレスはすでに登録されています");
      } else {
        setEmployeeMessage("従業員の追加に失敗しました");
      }
    }
  };

  if (loading) {
    return (
      <div className="owner-page">
        <div className="owner-loading">
          <h1>読み込み中...</h1>
          <p>Renderの無料プランでは起動に少し時間がかかる場合があります。</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="owner-page">
        <div className="owner-error">
          <h1>エラー</h1>
          <p>{errorMessage}</p>
          <button type="button" onClick={loadAllData}>
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="owner-page">
      <header className="owner-header">
        <h1>オーナーダッシュボード</h1>
        <p>売上・人件費・シフトを管理できます</p>
      </header>

      <section className="summary-grid">
        <div className="summary-card">
          <span>対象月</span>
          <strong>
            {dashboard?.year}年{dashboard?.month}月
          </strong>
        </div>

        <div className="summary-card">
          <span>売上合計</span>
          <strong>{dashboard?.total_sales.toLocaleString()}円</strong>
        </div>

        <div className="summary-card">
          <span>人件費</span>
          <strong>{dashboard?.total_labor_cost.toLocaleString()}円</strong>
        </div>

        <div className="summary-card">
          <span>人件費率</span>
          <strong>{dashboard?.labor_cost_rate}%</strong>
        </div>
      </section>

      <section className="owner-section">
        <h2>表示条件</h2>

        <div className="form-row">
          <label>
            年
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>

          <label>
            月
            <input
              type="number"
              value={month}
              min="1"
              max="12"
              onChange={(e) => setMonth(Number(e.target.value))}
            />
          </label>

          <label>
            週番号
            <input
              type="number"
              value={week}
              min="1"
              max="53"
              onChange={(e) => setWeek(Number(e.target.value))}
            />
          </label>
        </div>
      </section>

      <section className="owner-section">
        <h2>週間黒字・赤字判定</h2>

        {weeklyDashboard ? (
          <div
            className={`profit-card ${
              weeklyDashboard.status === "赤字" ? "red" : "black"
            }`}
          >
            <p>
              売上：
              {weeklyDashboard.total_sales.toLocaleString()}円
            </p>
            <p>
              人件費：
              {weeklyDashboard.total_labor_cost.toLocaleString()}円
            </p>

            {typeof weeklyDashboard.profit === "number" && (
              <p>利益：{weeklyDashboard.profit.toLocaleString()}円</p>
            )}

            {typeof weeklyDashboard.labor_cost_rate === "number" && (
              <p>人件費率：{weeklyDashboard.labor_cost_rate}%</p>
            )}

            <h3>{weeklyDashboard.status ?? "判定なし"}</h3>
          </div>
        ) : (
          <p>週間データはありません</p>
        )}
      </section>

      <section className="owner-section">
        <h2>従業員追加</h2>

        <form className="owner-form" onSubmit={handleCreateEmployee}>
          <label>
            名前
            <input
              type="text"
              value={newEmployee.name}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  name: e.target.value,
                })
              }
              placeholder="例：佐藤花子"
              required
            />
          </label>

          <label>
            メールアドレス
            <input
              type="email"
              value={newEmployee.email}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  email: e.target.value,
                })
              }
              placeholder="例：sato@example.com"
              required
            />
          </label>

          <label>
            初期パスワード
            <input
              type="text"
              value={newEmployee.password}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  password: e.target.value,
                })
              }
              required
            />
          </label>

          <label>
            時給
            <input
              type="number"
              value={newEmployee.hourly_wage}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  hourly_wage: Number(e.target.value),
                })
              }
              min="0"
              required
            />
          </label>

          <button type="submit">従業員を追加</button>
        </form>

        {employeeMessage && <p className="form-message">{employeeMessage}</p>}
      </section>

      <section className="owner-section">
        <h2>売上登録</h2>

        <form className="owner-form" onSubmit={handleCreateSale}>
          <label>
            売上日
            <input
              type="date"
              value={saleForm.sale_date}
              onChange={(e) =>
                setSaleForm({
                  ...saleForm,
                  sale_date: e.target.value,
                })
              }
              required
            />
          </label>

          <label>
            売上金額
            <input
              type="number"
              value={saleForm.amount}
              onChange={(e) =>
                setSaleForm({
                  ...saleForm,
                  amount: Number(e.target.value),
                })
              }
              min="0"
              required
            />
          </label>

          <label>
            客数
            <input
              type="number"
              value={saleForm.customer_count}
              onChange={(e) =>
                setSaleForm({
                  ...saleForm,
                  customer_count: Number(e.target.value),
                })
              }
              min="0"
              required
            />
          </label>

          <label>
            メモ
            <input
              type="text"
              value={saleForm.memo}
              onChange={(e) =>
                setSaleForm({
                  ...saleForm,
                  memo: e.target.value,
                })
              }
            />
          </label>

          <button type="submit">売上を登録</button>
        </form>

        {saleMessage && <p className="form-message">{saleMessage}</p>}
      </section>

      <section className="owner-section">
        <h2>シフト作成</h2>

        <form className="owner-form" onSubmit={handleCreateShift}>
          <label>
            従業員
            <select
              value={shiftForm.user_id}
              onChange={(e) =>
                setShiftForm({
                  ...shiftForm,
                  user_id: Number(e.target.value),
                })
              }
              required
            >
              {users
                .filter((user) => user.role === "employee")
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
            </select>
          </label>

          <label>
            日付
            <input
              type="date"
              value={shiftForm.work_date}
              onChange={(e) =>
                setShiftForm({
                  ...shiftForm,
                  work_date: e.target.value,
                })
              }
              required
            />
          </label>

          <label>
            開始
            <input
              type="time"
              value={shiftForm.start_time}
              onChange={(e) =>
                setShiftForm({
                  ...shiftForm,
                  start_time: e.target.value,
                })
              }
              required
            />
          </label>

          <label>
            終了
            <input
              type="time"
              value={shiftForm.end_time}
              onChange={(e) =>
                setShiftForm({
                  ...shiftForm,
                  end_time: e.target.value,
                })
              }
              required
            />
          </label>

          <label>
            休憩時間（分）
            <input
              type="number"
              value={shiftForm.break_minutes}
              onChange={(e) =>
                setShiftForm({
                  ...shiftForm,
                  break_minutes: Number(e.target.value),
                })
              }
              min="0"
              required
            />
          </label>

          <button type="submit">シフトを作成</button>
        </form>

        {shiftMessage && <p className="form-message">{shiftMessage}</p>}
      </section>

      <section className="owner-section">
        <h2>シフト表</h2>

        <div className="timeline-wrap">
          <ShiftTimeline shifts={shifts} users={users} />
        </div>
      </section>
    </div>
  );
}

export default OwnerDashboard;