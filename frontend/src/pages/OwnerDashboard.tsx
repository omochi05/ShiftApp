import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

type ShiftForTimeline = Shift & {
  user_name: string;
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

type OwnerWeekdayDashboard = {
  weekday: string;
  total_sales: number;
  total_labor_cost: number;
  labor_cost_rate: number;
};

type SaleCreate = {
  sale_date: string;
  amount: string;
  customer_count: string;
  memo: string;
};

type ShiftCreate = {
  user_id: number;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: string;
  created_by: number;
};

type NewEmployee = {
  employee_number: string;
  name: string;
  hourly_wage: string;
};

type ShiftTemplate = {
  id: number;
  weekday: number;
  user_id: number;
  start_time: string;
  end_time: string;
  break_minutes: number;
  created_by?: number | null;
};

function getTodayText() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function getMondayOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);

  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(now.getDate() + diff);

  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, "0");
  const dd = String(monday.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function addDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T00:00:00`);
  date.setDate(date.getDate() + days);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function timeToMinutes(time: string) {
  const [hourText, minuteText] = time.slice(0, 5).split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return 0;
  }

  return hour * 60 + minute;
}

function getShiftDurationMinutes(shift: Shift) {
  let start = timeToMinutes(shift.start_time);
  let end = timeToMinutes(shift.end_time);

  if (end <= start) {
    end += 24 * 60;
  }

  return end - start;
}

function formatApiError(error: any, fallbackMessage: string) {
  const detail = error.response?.data?.detail;

  if (Array.isArray(detail)) {
    return `${fallbackMessage}：${detail.map((d) => d.msg).join(" / ")}`;
  }

  if (detail) {
    return `${fallbackMessage}：${detail}`;
  }

  if (error.response?.status) {
    return `${fallbackMessage}：HTTP ${error.response.status}`;
  }

  return `${fallbackMessage}：APIに接続できませんでした`;
}

function OwnerDashboard() {
  const navigate = useNavigate();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [week, setWeek] = useState(23);

  const [weekStartDate, setWeekStartDate] = useState(getMondayOfCurrentWeek());
  const weekEndDate = addDays(weekStartDate, 6);

  const [dashboard, setDashboard] = useState<OwnerDashboardMonthly | null>(
    null
  );

  const [weeklyDashboard, setWeeklyDashboard] =
    useState<OwnerWeeklyDashboard | null>(null);

  const [weekdayDashboard, setWeekdayDashboard] = useState<
    OwnerWeekdayDashboard[]
  >([]);

  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const ownerId = Number(localStorage.getItem("ownerId") ?? 1);

  const [saleForm, setSaleForm] = useState<SaleCreate>({
    sale_date: getTodayText(),
    amount: "",
    customer_count: "",
    memo: "",
  });

  const [shiftForm, setShiftForm] = useState<ShiftCreate>({
    user_id: 0,
    work_date: getTodayText(),
    start_time: "17:00",
    end_time: "22:00",
    break_minutes: "",
    created_by: ownerId,
  });

  const [newEmployee, setNewEmployee] = useState<NewEmployee>({
    employee_number: "",
    name: "",
    hourly_wage: "",
  });

  const [saleMessage, setSaleMessage] = useState("");
  const [shiftMessage, setShiftMessage] = useState("");
  const [employeeMessage, setEmployeeMessage] = useState("");
  const [templateMessage, setTemplateMessage] = useState("");

  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(
    null
  );

  const [editEmployee, setEditEmployee] = useState({
    employee_number: "",
    name: "",
    hourly_wage: "",
  });

  const employeeUsers = users.filter((user) => user.role === "employee");

  /*
    シフト表表示用データを作成する。
    user_id から user_name を付ける。
  */
  const timelineShiftsBeforeDedup: ShiftForTimeline[] = shifts.map((shift) => {
    const user = users.find((u) => u.id === shift.user_id);

    return {
      ...shift,
      user_name: user?.name ?? `従業員${shift.user_id}`,
    };
  });

  /*
    同じ日付 + 同じ名前のシフトが複数ある場合は1件にまとめる。
    同じ名前の従業員が別IDで重複登録されていても、
    シフト表では重複表示しない。

    残すルール:
    1. 勤務時間が長い方を残す
    2. 勤務時間が同じなら id が新しい方を残す
  */
  const timelineShifts: ShiftForTimeline[] = Array.from(
    timelineShiftsBeforeDedup
      .reduce((map, shift) => {
        const normalizedName = shift.user_name.trim();
        const key = `${shift.work_date}-${normalizedName}`;

        const existing = map.get(key);

        if (!existing) {
          map.set(key, shift);
          return map;
        }

        const existingDuration = getShiftDurationMinutes(existing);
        const currentDuration = getShiftDurationMinutes(shift);

        if (
          currentDuration > existingDuration ||
          (currentDuration === existingDuration && shift.id > existing.id)
        ) {
          map.set(key, shift);
        }

        return map;
      }, new Map<string, ShiftForTimeline>())
      .values()
  );

  const weekDates = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStartDate, index)
  );

  const realWeeklyTimelineShifts = timelineShifts.filter(
    (shift) =>
      shift.work_date >= weekStartDate && shift.work_date <= weekEndDate
  );

  const emptyWeekRows: ShiftForTimeline[] = weekDates.map((date, index) => ({
    id: -1000 - index,
    user_id: 0,
    user_name: "",
    work_date: date,
    start_time: "00:00",
    end_time: "00:00",
    break_minutes: 0,
  }));

  const weeklyTimelineShifts = [
    ...emptyWeekRows,
    ...realWeeklyTimelineShifts,
  ];

  const fetchUsers = async () => {
    const res = await api.get<User[]>("/users/");
    setUsers(res.data);

    const employees = res.data.filter((user) => user.role === "employee");

    if (employees.length > 0) {
      setShiftForm((prev) => ({
        ...prev,
        user_id: prev.user_id === 0 ? employees[0].id : prev.user_id,
      }));
    }
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

  const fetchWeekdayDashboard = async () => {
    try {
      const res = await api.get<OwnerWeekdayDashboard[]>(
        `/owner/dashboard/weekday?year=${year}&month=${month}`
      );
      setWeekdayDashboard(res.data);
    } catch (error) {
      console.error("曜日別人件費率取得失敗:", error);
      setWeekdayDashboard([]);
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
        fetchWeekdayDashboard(),
      ]);
    } catch (error) {
      console.error("データ取得失敗:", error);
      setErrorMessage(
        "データの取得に失敗しました。API接続やCORS設定を確認してください。"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, week]);

  const handlePrevWeek = () => {
    setWeekStartDate((prev) => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setWeekStartDate((prev) => addDays(prev, 7));
  };

  const handleOpenPrintPage = () => {
    navigate(`/owner/print/shifts?weekStartDate=${weekStartDate}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("ownerLogin");
    localStorage.removeItem("ownerId");
    localStorage.removeItem("ownerName");
    localStorage.removeItem("ownerNumber");

    navigate("/");
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaleMessage("");

      await api.post("/sales/", {
        sale_date: saleForm.sale_date,
        amount: Number(saleForm.amount || 0),
        customer_count: Number(saleForm.customer_count || 0),
        memo: saleForm.memo,
      });

      setSaleMessage("売上を登録しました");

      setSaleForm((prev) => ({
        ...prev,
        amount: "",
        customer_count: "",
        memo: "",
      }));

      await fetchDashboard();
      await fetchWeeklyDashboard();
      await fetchWeekdayDashboard();
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

    if (Number(shiftForm.user_id) === 0) {
      setShiftMessage("従業員を先に登録してください");
      return;
    }

    const targetUser = users.find(
      (user) => user.id === Number(shiftForm.user_id)
    );

    const targetUserName = targetUser?.name?.trim() ?? "";

    const alreadyExists = shifts.some((shift) => {
      const shiftUser = users.find((user) => user.id === shift.user_id);
      const shiftUserName = shiftUser?.name?.trim() ?? "";

      return (
        shift.work_date === shiftForm.work_date &&
        shiftUserName !== "" &&
        shiftUserName === targetUserName
      );
    });

    if (alreadyExists) {
      setShiftMessage("この従業員は同じ日にすでにシフトが登録されています");
      return;
    }

    try {
      setShiftMessage("");

      await api.post("/shifts/", {
        user_id: Number(shiftForm.user_id),
        work_date: shiftForm.work_date,
        start_time: shiftForm.start_time,
        end_time: shiftForm.end_time,
        break_minutes: Number(shiftForm.break_minutes || 0),
        created_by: Number(ownerId),
      });

      setShiftMessage("シフトを作成しました");

      setShiftForm((prev) => ({
        ...prev,
        start_time: "17:00",
        end_time: "22:00",
        break_minutes: "",
      }));

      await fetchShifts();
      await fetchDashboard();
      await fetchWeeklyDashboard();
      await fetchWeekdayDashboard();
    } catch (error) {
      console.error("シフト作成失敗:", error);
      setShiftMessage("シフト作成に失敗しました");
    }
  };

  const handleCreateTemplateFromWeek = async () => {
    const ok = window.confirm(
      `${weekStartDate}〜${weekEndDate} のシフトを固定テンプレート化しますか？\n既存テンプレートは上書きされます。`
    );

    if (!ok) {
      return;
    }

    try {
      setTemplateMessage("");

      const res = await api.post<ShiftTemplate[]>("/shift-templates/from-week", {
        week_start_date: weekStartDate,
        created_by: Number(ownerId),
      });

      setTemplateMessage(
        `この週をテンプレート化しました。作成件数：${res.data.length}件`
      );
    } catch (error: any) {
      console.error("週テンプレート化失敗:", error);
      console.error("レスポンス:", error.response?.data);

      setTemplateMessage(formatApiError(error, "週テンプレート化に失敗しました"));
    }
  };

  const handleApplyTemplates = async () => {
    const ok = window.confirm(
      `${weekStartDate}〜${weekEndDate} にテンプレートを反映しますか？\n既に同じ日のシフトがある従業員はスキップされます。`
    );

    if (!ok) {
      return;
    }

    try {
      setTemplateMessage("");

      const res = await api.post<Shift[]>("/shift-templates/apply", {
        week_start_date: weekStartDate,
        created_by: Number(ownerId),
      });

      setTemplateMessage(
        `テンプレートを反映しました。作成件数：${res.data.length}件`
      );

      await fetchShifts();
      await fetchDashboard();
      await fetchWeeklyDashboard();
      await fetchWeekdayDashboard();
    } catch (error: any) {
      console.error("テンプレート反映失敗:", error);
      console.error("レスポンス:", error.response?.data);

      setTemplateMessage(formatApiError(error, "テンプレート反映に失敗しました"));
    }
  };

  const handleDeleteShift = async (shiftId: number) => {
    const targetShift = shifts.find((shift) => shift.id === shiftId);

    if (!targetShift) {
      setShiftMessage("削除対象のシフトが見つかりません");
      return;
    }

    const targetUser = users.find((user) => user.id === targetShift.user_id);
    const userName = targetUser?.name?.trim() ?? `従業員${targetShift.user_id}`;

    const sameNameSameDateShifts = shifts.filter((shift) => {
      const shiftUser = users.find((user) => user.id === shift.user_id);
      const shiftUserName = shiftUser?.name?.trim() ?? "";

      return (
        shift.work_date === targetShift.work_date &&
        shiftUserName !== "" &&
        shiftUserName === userName
      );
    });

    const confirmMessage =
      sameNameSameDateShifts.length > 1
        ? `${userName}の${targetShift.work_date}の重複シフトをまとめて削除しますか？`
        : `${userName}の${targetShift.work_date}のシフトを削除しますか？`;

    const ok = window.confirm(confirmMessage);

    if (!ok) {
      return;
    }

    try {
      setShiftMessage("");

      await Promise.all(
        sameNameSameDateShifts.map((shift) => api.delete(`/shifts/${shift.id}`))
      );

      setShiftMessage("シフトを削除しました");

      await fetchShifts();
      await fetchDashboard();
      await fetchWeeklyDashboard();
      await fetchWeekdayDashboard();
    } catch (error) {
      console.error("シフト削除失敗:", error);
      setShiftMessage("シフト削除に失敗しました");
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setEmployeeMessage("");

      await api.post("/users/", {
        name: newEmployee.name,
        email: newEmployee.employee_number,
        password: "unused",
        role: "employee",
        hourly_wage: Number(newEmployee.hourly_wage || 0),
      });

      setEmployeeMessage("従業員を追加しました");

      setNewEmployee({
        employee_number: "",
        name: "",
        hourly_wage: "",
      });

      await fetchUsers();
    } catch (error: any) {
      console.error("従業員追加失敗:", error);
      console.error("レスポンス:", error.response?.data);

      setEmployeeMessage(formatApiError(error, "従業員の追加に失敗しました"));
    }
  };

  const handleStartEditEmployee = (user: User) => {
    setEditingEmployeeId(user.id);

    setEditEmployee({
      employee_number: user.email,
      name: user.name,
      hourly_wage: String(user.hourly_wage),
    });

    setEmployeeMessage("");
  };

  const handleCancelEditEmployee = () => {
    setEditingEmployeeId(null);

    setEditEmployee({
      employee_number: "",
      name: "",
      hourly_wage: "",
    });
  };

  const handleUpdateEmployee = async (userId: number) => {
    if (!editEmployee.employee_number || !editEmployee.name) {
      setEmployeeMessage("従業員番号と名前を入力してください");
      return;
    }

    try {
      setEmployeeMessage("");

      await api.put(`/users/${userId}`, {
        name: editEmployee.name,
        email: editEmployee.employee_number,
        role: "employee",
        hourly_wage: Number(editEmployee.hourly_wage || 0),
      });

      setEmployeeMessage("従業員情報を更新しました");

      setEditingEmployeeId(null);

      setEditEmployee({
        employee_number: "",
        name: "",
        hourly_wage: "",
      });

      await fetchUsers();
      await fetchDashboard();
      await fetchWeeklyDashboard();
      await fetchWeekdayDashboard();
    } catch (error: any) {
      console.error("従業員更新失敗:", error);
      console.error("レスポンス:", error.response?.data);

      setEmployeeMessage(formatApiError(error, "従業員情報の更新に失敗しました"));
    }
  };

  const handleDeleteUser = async (userId: number) => {
    const targetUser = users.find((user) => user.id === userId);

    if (!targetUser) {
      setEmployeeMessage("削除対象の従業員が見つかりません");
      return;
    }

    const ok = window.confirm(
      `${targetUser.name}（${targetUser.email}）を削除しますか？\nこの従業員のシフトや関連データも削除されます。`
    );

    if (!ok) {
      return;
    }

    try {
      setEmployeeMessage("");

      await api.delete(`/users/${userId}`);

      setEmployeeMessage("従業員を削除しました");

      await fetchUsers();
      await fetchShifts();
      await fetchDashboard();
      await fetchWeeklyDashboard();
      await fetchWeekdayDashboard();
    } catch (error: any) {
      console.error("従業員削除失敗:", error);
      console.error("レスポンス:", error.response?.data);

      setEmployeeMessage(formatApiError(error, "従業員の削除に失敗しました"));
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
        <h1>ShiftApp / オーナー</h1>
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
          <span>月間人件費率</span>
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
            <p>売上：{weeklyDashboard.total_sales.toLocaleString()}円</p>
            <p>
              人件費：{weeklyDashboard.total_labor_cost.toLocaleString()}円
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
        <h2>曜日別 売上・人件費率</h2>

        <div className="weekday-table-wrap">
          <table className="weekday-table">
            <thead>
              <tr>
                <th>曜日</th>
                <th>売上</th>
                <th>人件費</th>
                <th>人件費率</th>
              </tr>
            </thead>

            <tbody>
              {weekdayDashboard.map((item) => (
                <tr key={item.weekday}>
                  <td>{item.weekday}</td>
                  <td>{item.total_sales.toLocaleString()}円</td>
                  <td>{item.total_labor_cost.toLocaleString()}円</td>
                  <td>{item.labor_cost_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="owner-section">
        <h2>従業員追加</h2>

        <form className="owner-form" onSubmit={handleCreateEmployee}>
          <label>
            従業員番号
            <input
              type="text"
              value={newEmployee.employee_number}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  employee_number: e.target.value,
                })
              }
              placeholder="例：EMP001"
              required
            />
          </label>

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
              placeholder="例：田中太郎"
              required
            />
          </label>

          <label>
            時給
            <input
              type="number"
              value={newEmployee.hourly_wage}
              onFocus={() => {
                if (newEmployee.hourly_wage === "0") {
                  setNewEmployee({
                    ...newEmployee,
                    hourly_wage: "",
                  });
                }
              }}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  hourly_wage: e.target.value,
                })
              }
              min="0"
              placeholder="例：1200"
              required
            />
          </label>

          <button type="submit">従業員を追加</button>
        </form>

        {employeeMessage && <p className="form-message">{employeeMessage}</p>}
      </section>

      <section className="owner-section">
        <h2>従業員一覧</h2>

        <div className="weekday-table-wrap">
          <table className="weekday-table">
            <thead>
              <tr>
                <th>従業員番号</th>
                <th>名前</th>
                <th>時給</th>
                <th>操作</th>
              </tr>
            </thead>

            <tbody>
              {employeeUsers.map((user) => {
                const isEditing = editingEmployeeId === user.id;

                return (
                  <tr key={user.id}>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editEmployee.employee_number}
                          onChange={(e) =>
                            setEditEmployee({
                              ...editEmployee,
                              employee_number: e.target.value,
                            })
                          }
                        />
                      ) : (
                        user.email
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editEmployee.name}
                          onChange={(e) =>
                            setEditEmployee({
                              ...editEmployee,
                              name: e.target.value,
                            })
                          }
                        />
                      ) : (
                        user.name
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editEmployee.hourly_wage}
                          onChange={(e) =>
                            setEditEmployee({
                              ...editEmployee,
                              hourly_wage: e.target.value,
                            })
                          }
                          min="0"
                        />
                      ) : (
                        `${user.hourly_wage.toLocaleString()}円`
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <div className="table-action-buttons">
                          <button
                            type="button"
                            className="table-save-button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleUpdateEmployee(user.id);
                            }}
                          >
                            保存
                          </button>

                          <button
                            type="button"
                            className="table-cancel-button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCancelEditEmployee();
                            }}
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <div className="table-action-buttons">
                          <button
                            type="button"
                            className="table-edit-button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStartEditEmployee(user);
                            }}
                          >
                            編集
                          </button>

                          <button
                            type="button"
                            className="table-delete-button"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            削除
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
              onFocus={() => {
                if (saleForm.amount === "0") {
                  setSaleForm({
                    ...saleForm,
                    amount: "",
                  });
                }
              }}
              onChange={(e) =>
                setSaleForm({
                  ...saleForm,
                  amount: e.target.value,
                })
              }
              min="0"
              placeholder="例：300000"
              required
            />
          </label>

          <label>
            客数
            <input
              type="number"
              value={saleForm.customer_count}
              onFocus={() => {
                if (saleForm.customer_count === "0") {
                  setSaleForm({
                    ...saleForm,
                    customer_count: "",
                  });
                }
              }}
              onChange={(e) =>
                setSaleForm({
                  ...saleForm,
                  customer_count: e.target.value,
                })
              }
              min="0"
              placeholder="例：100"
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
              placeholder="例：雨天・イベント日など"
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
              {employeeUsers.length === 0 && (
                <option value={0}>従業員を先に登録してください</option>
              )}

              {employeeUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}（{user.email}）
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
              onFocus={() => {
                if (shiftForm.break_minutes === "0") {
                  setShiftForm({
                    ...shiftForm,
                    break_minutes: "",
                  });
                }
              }}
              onChange={(e) =>
                setShiftForm({
                  ...shiftForm,
                  break_minutes: e.target.value,
                })
              }
              min="0"
              placeholder="例：60"
              required
            />
          </label>

          <button type="submit">シフトを作成</button>
        </form>

        {shiftMessage && <p className="form-message">{shiftMessage}</p>}
      </section>

      <section className="owner-section shift-print-area">
        <h2>シフト表</h2>

        <p className="form-message">
          表示期間：{weekStartDate} 〜 {weekEndDate}
        </p>

        <p className="form-message print-hide">
          PC・スマホどちらも上部の「シフト表印刷」ボタンから印刷専用ページで印刷できます。
        </p>

        <div className="timeline-wrap">
          <ShiftTimeline
            shifts={weeklyTimelineShifts}
            onDeleteShift={handleDeleteShift}
          />
        </div>

        <div className="shift-template-actions-bottom print-hide">
          <button type="button" onClick={handlePrevWeek}>
            前の週
          </button>

          <button type="button" onClick={handleNextWeek}>
            次の週
          </button>

          <button type="button" onClick={handleCreateTemplateFromWeek}>
            この週をテンプレート化
          </button>

          <button type="button" onClick={handleApplyTemplates}>
            この週にテンプレートを反映
          </button>
        </div>

        {templateMessage && (
          <p className="form-message print-hide">{templateMessage}</p>
        )}
      </section>
    </div>
  );
}

export default OwnerDashboard;