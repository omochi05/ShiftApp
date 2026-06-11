import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../api/client";
import "./OwnerSalesPage.css";

type Sale = {
  id: number;
  sale_date: string;
  amount: number;
};

type Shift = {
  id: number;
  user_id: number;
  user_name: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
};

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  hourly_wage: number;
};

type SaleForm = {
  sale_date: string;
  amount: string;
};

function getTodayDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString()}円`;
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function getShiftDurationMinutes(shift: Shift) {
  const start = timeToMinutes(shift.start_time);
  let end = timeToMinutes(shift.end_time);

  if (end <= start) {
    end += 24 * 60;
  }

  return Math.max(0, end - start - (shift.break_minutes || 0));
}

function calculateShiftCost(shift: Shift, users: User[]) {
  const user = users.find((u) => u.id === shift.user_id);
  const hourlyWage = user?.hourly_wage || 0;

  const minutes = getShiftDurationMinutes(shift);
  return (minutes / 60) * hourlyWage;
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

export default function OwnerSalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [saleForm, setSaleForm] = useState<SaleForm>({
    sale_date: getTodayDate(),
    amount: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setMessage("");

      const [salesRes, shiftsRes, usersRes] = await Promise.all([
        api.get<Sale[]>("/sales/"),
        api.get<Shift[]>("/shifts/"),
        api.get<User[]>("/users/"),
      ]);

      setSales(salesRes.data);
      setShifts(shiftsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error("売上管理データ取得失敗:", error);
      setMessage("売上管理データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sortedSales = useMemo(() => {
    return [...sales].sort((a, b) => {
      if (a.sale_date < b.sale_date) return 1;
      if (a.sale_date > b.sale_date) return -1;
      return b.id - a.id;
    });
  }, [sales]);

  const totalSales = useMemo(() => {
    return sales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);
  }, [sales]);

  const totalLaborCost = useMemo(() => {
    return shifts.reduce((sum, shift) => {
      return sum + calculateShiftCost(shift, users);
    }, 0);
  }, [shifts, users]);

  const laborCostRate = totalSales > 0 ? (totalLaborCost / totalSales) * 100 : 0;

  const selectedDateShifts = useMemo(() => {
    return shifts.filter((shift) => shift.work_date === saleForm.sale_date);
  }, [shifts, saleForm.sale_date]);

  const selectedDateLaborCost = useMemo(() => {
    return selectedDateShifts.reduce((sum, shift) => {
      return sum + calculateShiftCost(shift, users);
    }, 0);
  }, [selectedDateShifts, users]);

  const selectedDateSale = useMemo(() => {
    return sales.find((sale) => sale.sale_date === saleForm.sale_date);
  }, [sales, saleForm.sale_date]);

  const selectedDateLaborRate =
    Number(saleForm.amount || selectedDateSale?.amount || 0) > 0
      ? (selectedDateLaborCost /
          Number(saleForm.amount || selectedDateSale?.amount || 0)) *
        100
      : 0;

  const handleCreateSale = async (e: FormEvent) => {
    e.preventDefault();

    if (!saleForm.sale_date) {
      setMessage("日付を入力してください");
      return;
    }

    if (!saleForm.amount || Number(saleForm.amount) <= 0) {
      setMessage("売上金額を入力してください");
      return;
    }

    try {
      setMessage("");

      await api.post("/sales/", {
        sale_date: saleForm.sale_date,
        amount: Number(saleForm.amount),
      });

      setMessage("売上を登録しました");

      setSaleForm({
        sale_date: getTodayDate(),
        amount: "",
      });

      await fetchData();
    } catch (error: any) {
      console.error("売上登録失敗:", error);
      console.error("レスポンス:", error.response?.data);

      setMessage(formatApiError(error, "売上登録に失敗しました"));
    }
  };

  const handleDeleteSale = async (sale: Sale) => {
    const ok = window.confirm(
      `${sale.sale_date} の売上 ${formatCurrency(
        sale.amount
      )} を削除しますか？`
    );

    if (!ok) return;

    try {
      setMessage("");

      await api.delete(`/sales/${sale.id}`);

      setMessage("売上を削除しました");
      await fetchData();
    } catch (error: any) {
      console.error("売上削除失敗:", error);
      console.error("レスポンス:", error.response?.data);

      setMessage(formatApiError(error, "売上削除に失敗しました"));
    }
  };

  return (
    <div className="owner-sales-page">
      <section className="owner-sales-hero">
        <div>
          <p className="owner-sales-label">Sales</p>
          <h2>売上管理</h2>
          <p>
            日別売上を登録し、人件費とのバランスを確認します。
            売上とシフト情報をもとに人件費率を計算できます。
          </p>
        </div>
      </section>

      <section className="owner-sales-summary-grid">
        <div className="owner-sales-summary-card">
          <span>総売上</span>
          <strong>{formatCurrency(totalSales)}</strong>
        </div>

        <div className="owner-sales-summary-card">
          <span>総人件費</span>
          <strong>{formatCurrency(totalLaborCost)}</strong>
        </div>

        <div className="owner-sales-summary-card">
          <span>人件費率</span>
          <strong>{laborCostRate.toFixed(1)}%</strong>
        </div>
      </section>

      <section className="owner-sales-section">
        <div className="owner-section-title-row">
          <div>
            <h3>売上登録</h3>
            <p>日付と売上金額を入力してください。</p>
          </div>
        </div>

        <form className="owner-sales-form" onSubmit={handleCreateSale}>
          <label>
            日付
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
                  amount: e.target.value,
                })
              }
              min="0"
              placeholder="例：85000"
              required
            />
          </label>

          <div className="owner-sales-preview">
            <span>この日の人件費</span>
            <strong>{formatCurrency(selectedDateLaborCost)}</strong>
            <small>人件費率 {selectedDateLaborRate.toFixed(1)}%</small>
          </div>

          <button type="submit">売上を登録</button>
        </form>

        {message && <p className="owner-sales-message">{message}</p>}
      </section>

      <section className="owner-sales-section">
        <div className="owner-section-title-row">
          <div>
            <h3>売上一覧</h3>
            <p>登録済みの売上を確認できます。</p>
          </div>

          <button
            type="button"
            className="owner-sales-refresh-button"
            onClick={fetchData}
          >
            再読み込み
          </button>
        </div>

        {loading ? (
          <div className="owner-sales-loading">読み込み中...</div>
        ) : (
          <div className="owner-sales-table-wrap">
            <table className="owner-sales-table">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>売上</th>
                  <th>その日の人件費</th>
                  <th>人件費率</th>
                  <th>操作</th>
                </tr>
              </thead>

              <tbody>
                {sortedSales.length === 0 ? (
                  <tr>
                    <td colSpan={5}>売上がまだ登録されていません</td>
                  </tr>
                ) : (
                  sortedSales.map((sale) => {
                    const dailyShifts = shifts.filter(
                      (shift) => shift.work_date === sale.sale_date
                    );

                    const dailyLaborCost = dailyShifts.reduce((sum, shift) => {
                      return sum + calculateShiftCost(shift, users);
                    }, 0);

                    const dailyRate =
                      sale.amount > 0 ? (dailyLaborCost / sale.amount) * 100 : 0;

                    return (
                      <tr key={sale.id}>
                        <td>{sale.sale_date}</td>
                        <td>{formatCurrency(sale.amount)}</td>
                        <td>{formatCurrency(dailyLaborCost)}</td>
                        <td>
                          <span
                            className={
                              dailyRate >= 35
                                ? "owner-sales-rate danger"
                                : dailyRate >= 25
                                ? "owner-sales-rate warning"
                                : "owner-sales-rate good"
                            }
                          >
                            {dailyRate.toFixed(1)}%
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="owner-sales-delete-button"
                            onClick={() => handleDeleteSale(sale)}
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}