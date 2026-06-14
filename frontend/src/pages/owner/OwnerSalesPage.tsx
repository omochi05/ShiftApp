import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { api } from "../../api/client";
import OwnerHamburgerMenu from "../../components/OwnerHamburgerMenu";
import "./OwnerSalesPage.css";

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

type SaleForm = {
  sale_date: string;
  amount: string;
  customer_count: string;
  memo: string;
};

function getTodayText() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function getCurrentWeekNumber() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), 0, 1);
  const pastDays = Math.floor(
    (now.getTime() - firstDay.getTime()) / 86400000
  );

  return Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
}

function formatYen(value: number | null | undefined) {
  return `${Number(value || 0).toLocaleString()}円`;
}

function formatPercent(value: number | null | undefined) {
  return `${Number(value || 0).toFixed(1)}%`;
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
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [week, setWeek] = useState(getCurrentWeekNumber());

  const [monthlyDashboard, setMonthlyDashboard] =
    useState<OwnerDashboardMonthly | null>(null);

  const [weeklyDashboard, setWeeklyDashboard] =
    useState<OwnerWeeklyDashboard | null>(null);

  const [weekdayDashboard, setWeekdayDashboard] = useState<
    OwnerWeekdayDashboard[]
  >([]);

  const [saleForm, setSaleForm] = useState<SaleForm>({
    sale_date: getTodayText(),
    amount: "",
    customer_count: "",
    memo: "",
  });

  const [loading, setLoading] = useState(true);
  const [saleMessage, setSaleMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedMonthText = useMemo(() => {
    return `${year}年${month}月`;
  }, [year, month]);

  const monthlyProfit = useMemo(() => {
    if (!monthlyDashboard) {
      return 0;
    }

    return (
      Number(monthlyDashboard.total_sales || 0) -
      Number(monthlyDashboard.total_labor_cost || 0)
    );
  }, [monthlyDashboard]);

  const fetchMonthlyDashboard = async () => {
    const res = await api.get<OwnerDashboardMonthly>(
      `/owner/dashboard/month?year=${year}&month=${month}`
    );

    setMonthlyDashboard(res.data);
  };

  const fetchWeeklyDashboard = async () => {
    try {
      const res = await api.get<OwnerWeeklyDashboard>(
        `/owner/dashboard/week?year=${year}&week=${week}`
      );

      setWeeklyDashboard(res.data);
    } catch (error) {
      console.error("週間売上ダッシュボード取得失敗:", error);
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
      console.error("曜日別売上ダッシュボード取得失敗:", error);
      setWeekdayDashboard([]);
    }
  };

  const loadSalesData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      await Promise.all([
        fetchMonthlyDashboard(),
        fetchWeeklyDashboard(),
        fetchWeekdayDashboard(),
      ]);
    } catch (error: any) {
      console.error("売上データ取得失敗:", error);
      setErrorMessage(formatApiError(error, "売上データの取得に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, week]);

  const handleCreateSale = async (e: FormEvent) => {
    e.preventDefault();

    if (!saleForm.sale_date) {
      setSaleMessage("売上日を入力してください");
      return;
    }

    if (!saleForm.amount) {
      setSaleMessage("売上金額を入力してください");
      return;
    }

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

      await loadSalesData();
    } catch (error: any) {
      console.error("売上登録失敗:", error);

      if (error.response?.status === 400 || error.response?.status === 409) {
        setSaleMessage("同じ日付の売上がすでに登録されています");
        return;
      }

      setSaleMessage(formatApiError(error, "売上登録に失敗しました"));
    }
  };

  return (
    <div className="owner-sales-page">
      <OwnerHamburgerMenu />

      <section className="owner-sales-hero">
        <div>
          <p className="owner-sales-label">SALES MANAGEMENT</p>
          <h2>売上管理</h2>
          <p>
            日別売上を登録し、月間売上・人件費・人件費率を確認できます。
            このページはオーナー専用です。
          </p>
        </div>

        <div className="owner-sales-period-card">
          <span>対象期間</span>
          <strong>{selectedMonthText}</strong>
          <small>第{week}週</small>
        </div>
      </section>

      <section className="owner-sales-filter-section">
        <div className="owner-section-title-row">
          <div>
            <h3>集計期間</h3>
            <p>確認したい年月・週を選択してください。</p>
          </div>

          <button
            type="button"
            className="owner-sales-refresh-button"
            onClick={loadSalesData}
          >
            再読み込み
          </button>
        </div>

        <div className="owner-sales-filter-grid">
          <label>
            年
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              min="2020"
              max="2100"
            />
          </label>

          <label>
            月
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((m) => (
                <option key={m} value={m}>
                  {m}月
                </option>
              ))}
            </select>
          </label>

          <label>
            週
            <input
              type="number"
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              min="1"
              max="53"
            />
          </label>
        </div>
      </section>

      <section className="owner-sales-summary-grid">
        <article className="owner-sales-summary-card owner-sales-summary-blue">
          <span>月間売上</span>
          <strong>{formatYen(monthlyDashboard?.total_sales)}</strong>
          <p>{selectedMonthText} の売上合計</p>
        </article>

        <article className="owner-sales-summary-card owner-sales-summary-green">
          <span>月間人件費</span>
          <strong>{formatYen(monthlyDashboard?.total_labor_cost)}</strong>
          <p>登録シフトから計算</p>
        </article>

        <article className="owner-sales-summary-card owner-sales-summary-orange">
          <span>人件費率</span>
          <strong>{formatPercent(monthlyDashboard?.labor_cost_rate)}</strong>
          <p>売上に対する人件費の割合</p>
        </article>

        <article className="owner-sales-summary-card owner-sales-summary-dark">
          <span>概算利益</span>
          <strong>{formatYen(monthlyProfit)}</strong>
          <p>売上 - 人件費</p>
        </article>
      </section>

      <section className="owner-sales-section">
        <div className="owner-section-title-row">
          <div>
            <h3>売上登録</h3>
            <p>日付・売上金額・客数・メモを入力してください。</p>
          </div>
        </div>

        <form className="owner-sales-form" onSubmit={handleCreateSale}>
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
                  amount: e.target.value,
                })
              }
              min="0"
              placeholder="例：150000"
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
                  customer_count: e.target.value,
                })
              }
              min="0"
              placeholder="例：320"
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

        {saleMessage && <p className="owner-sales-message">{saleMessage}</p>}
        {errorMessage && <p className="owner-sales-error">{errorMessage}</p>}
      </section>

      <section className="owner-sales-section">
        <div className="owner-section-title-row">
          <div>
            <h3>週間集計</h3>
            <p>選択した週の売上・人件費・利益を確認できます。</p>
          </div>
        </div>

        {loading ? (
          <div className="owner-sales-loading">読み込み中...</div>
        ) : weeklyDashboard ? (
          <div className="owner-sales-weekly-grid">
            <article>
              <span>週間売上</span>
              <strong>{formatYen(weeklyDashboard.total_sales)}</strong>
            </article>

            <article>
              <span>週間人件費</span>
              <strong>{formatYen(weeklyDashboard.total_labor_cost)}</strong>
            </article>

            <article>
              <span>週間人件費率</span>
              <strong>{formatPercent(weeklyDashboard.labor_cost_rate)}</strong>
            </article>

            <article>
              <span>週間利益</span>
              <strong>{formatYen(weeklyDashboard.profit)}</strong>
            </article>
          </div>
        ) : (
          <div className="owner-sales-empty">
            この週の集計データはまだありません。
          </div>
        )}
      </section>

      <section className="owner-sales-section">
        <div className="owner-section-title-row">
          <div>
            <h3>曜日別集計</h3>
            <p>曜日ごとの売上・人件費率を確認できます。</p>
          </div>
        </div>

        {loading ? (
          <div className="owner-sales-loading">読み込み中...</div>
        ) : weekdayDashboard.length === 0 ? (
          <div className="owner-sales-empty">
            曜日別データはまだありません。
          </div>
        ) : (
          <div className="owner-sales-table-wrap">
            <table className="owner-sales-table">
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
                    <td>{formatYen(item.total_sales)}</td>
                    <td>{formatYen(item.total_labor_cost)}</td>
                    <td>{formatPercent(item.labor_cost_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}