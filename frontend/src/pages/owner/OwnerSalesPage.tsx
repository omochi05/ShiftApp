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

type PeriodMode = "week" | "month";

type WeekdayAnalysis = {
  weekdayIndex: number;
  weekdayName: string;
  sales: number;
  laborCost: number;
  shiftCount: number;
  laborRate: number;
  status: "good" | "warning" | "danger" | "none";
  statusLabel: string;
  advice: string;
};

const weekdayNames = ["日", "月", "火", "水", "木", "金", "土"];

function getTodayDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getCurrentMonth() {
  return getTodayDate().slice(0, 7);
}

function toDate(dateText: string) {
  return new Date(`${dateText}T00:00:00`);
}

function formatDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getMonday(dateText: string) {
  const date = toDate(dateText);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function addDays(date: Date, days: number) {
  const copied = new Date(date);
  copied.setDate(copied.getDate() + days);
  return copied;
}

function getWeekdayIndex(dateText: string) {
  return toDate(dateText).getDay();
}

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString()}円`;
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function getOverlapMinutes(
  start: number,
  end: number,
  rangeStart: number,
  rangeEnd: number
) {
  const overlapStart = Math.max(start, rangeStart);
  const overlapEnd = Math.min(end, rangeEnd);
  return Math.max(0, overlapEnd - overlapStart);
}

function calculateShiftCost(shift: Shift, users: User[]) {
  const user = users.find((u) => u.id === shift.user_id);
  const hourlyWage = user?.hourly_wage || 0;

  let start = timeToMinutes(shift.start_time);
  let end = timeToMinutes(shift.end_time);

  if (end <= start) {
    end += 24 * 60;
  }

  const breakMinutes = shift.break_minutes || 0;

  const rawNightMinutes =
    getOverlapMinutes(start, end, 0, 6 * 60) +
    getOverlapMinutes(start, end, 22 * 60, 30 * 60);

  const rawEarlyMinutes = getOverlapMinutes(start, end, 6 * 60, 9 * 60);
  const rawNormalMinutes = getOverlapMinutes(start, end, 9 * 60, 22 * 60);

  let remainingBreak = breakMinutes;

  const normalBreak = Math.min(rawNormalMinutes, remainingBreak);
  const normalMinutes = Math.max(0, rawNormalMinutes - normalBreak);
  remainingBreak -= normalBreak;

  const earlyBreak = Math.min(rawEarlyMinutes, remainingBreak);
  const earlyMinutes = Math.max(0, rawEarlyMinutes - earlyBreak);
  remainingBreak -= earlyBreak;

  const nightBreak = Math.min(rawNightMinutes, remainingBreak);
  const nightMinutes = Math.max(0, rawNightMinutes - nightBreak);

  const normalCost = (normalMinutes / 60) * hourlyWage;
  const earlyCost = (earlyMinutes / 60) * hourlyWage;
  const nightCost = (nightMinutes / 60) * hourlyWage * 1.25;

  return normalCost + earlyCost + nightCost;
}

function getRateStatus(rate: number, sales: number) {
  if (sales <= 0) {
    return {
      status: "none" as const,
      statusLabel: "未登録",
    };
  }

  if (rate >= 35) {
    return {
      status: "danger" as const,
      statusLabel: "高い",
    };
  }

  if (rate >= 25) {
    return {
      status: "warning" as const,
      statusLabel: "注意",
    };
  }

  return {
    status: "good" as const,
    statusLabel: "良好",
  };
}

function createAdvice(weekdayName: string, sales: number, laborCost: number) {
  if (sales <= 0 && laborCost > 0) {
    return `${weekdayName}曜日は売上未登録ですが、人件費が発生しています。売上入力漏れがないか確認してください。`;
  }

  if (sales <= 0) {
    return `${weekdayName}曜日はまだ売上データがありません。売上を登録すると分析できます。`;
  }

  const rate = (laborCost / sales) * 100;

  if (rate >= 35) {
    return `${weekdayName}曜日は人件費率が高めです。売上に対して人員が多い可能性があります。ピーク時間以外の人数や勤務時間を見直しましょう。`;
  }

  if (rate >= 25) {
    return `${weekdayName}曜日は人件費率に注意が必要です。売上が低い時間帯に人数が多くなっていないか確認しましょう。`;
  }

  return `${weekdayName}曜日は人件費率が良好です。現在の人員配置は売上とのバランスが取れています。`;
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

  const [periodMode, setPeriodMode] = useState<PeriodMode>("week");
  const [targetDate, setTargetDate] = useState(getTodayDate());
  const [targetMonth, setTargetMonth] = useState(getCurrentMonth());

  const [isAiOpen, setIsAiOpen] = useState(true);

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

  const periodLabel = useMemo(() => {
    if (periodMode === "month") {
      return `${targetMonth} の集計`;
    }

    const monday = getMonday(targetDate);
    const sunday = addDays(monday, 6);

    return `${formatDate(monday)} 〜 ${formatDate(sunday)} の集計`;
  }, [periodMode, targetDate, targetMonth]);

  const filteredSales = useMemo(() => {
    if (periodMode === "month") {
      return sales.filter((sale) => sale.sale_date.startsWith(targetMonth));
    }

    const monday = formatDate(getMonday(targetDate));
    const sunday = formatDate(addDays(getMonday(targetDate), 6));

    return sales.filter(
      (sale) => sale.sale_date >= monday && sale.sale_date <= sunday
    );
  }, [sales, periodMode, targetDate, targetMonth]);

  const filteredShifts = useMemo(() => {
    if (periodMode === "month") {
      return shifts.filter((shift) => shift.work_date.startsWith(targetMonth));
    }

    const monday = formatDate(getMonday(targetDate));
    const sunday = formatDate(addDays(getMonday(targetDate), 6));

    return shifts.filter(
      (shift) => shift.work_date >= monday && shift.work_date <= sunday
    );
  }, [shifts, periodMode, targetDate, targetMonth]);

  const sortedSales = useMemo(() => {
    return [...filteredSales].sort((a, b) => {
      if (a.sale_date < b.sale_date) return 1;
      if (a.sale_date > b.sale_date) return -1;
      return b.id - a.id;
    });
  }, [filteredSales]);

  const totalSales = useMemo(() => {
    return filteredSales.reduce(
      (sum, sale) => sum + Number(sale.amount || 0),
      0
    );
  }, [filteredSales]);

  const totalLaborCost = useMemo(() => {
    return filteredShifts.reduce((sum, shift) => {
      return sum + calculateShiftCost(shift, users);
    }, 0);
  }, [filteredShifts, users]);

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

  const selectedDateBaseSale = Number(
    saleForm.amount || selectedDateSale?.amount || 0
  );

  const selectedDateLaborRate =
    selectedDateBaseSale > 0
      ? (selectedDateLaborCost / selectedDateBaseSale) * 100
      : 0;

  const weekdayAnalysis = useMemo<WeekdayAnalysis[]>(() => {
    return weekdayNames.map((weekdayName, weekdayIndex) => {
      const weekdaySales = filteredSales.filter(
        (sale) => getWeekdayIndex(sale.sale_date) === weekdayIndex
      );

      const weekdayShifts = filteredShifts.filter(
        (shift) => getWeekdayIndex(shift.work_date) === weekdayIndex
      );

      const salesTotal = weekdaySales.reduce(
        (sum, sale) => sum + Number(sale.amount || 0),
        0
      );

      const laborTotal = weekdayShifts.reduce((sum, shift) => {
        return sum + calculateShiftCost(shift, users);
      }, 0);

      const rate = salesTotal > 0 ? (laborTotal / salesTotal) * 100 : 0;
      const statusResult = getRateStatus(rate, salesTotal);

      return {
        weekdayIndex,
        weekdayName,
        sales: salesTotal,
        laborCost: laborTotal,
        shiftCount: weekdayShifts.length,
        laborRate: rate,
        status: statusResult.status,
        statusLabel: statusResult.statusLabel,
        advice: createAdvice(weekdayName, salesTotal, laborTotal),
      };
    });
  }, [filteredSales, filteredShifts, users]);

  const aiSupportMessages = useMemo(() => {
    const dangerWeekdays = weekdayAnalysis.filter(
      (item) => item.status === "danger"
    );

    const warningWeekdays = weekdayAnalysis.filter(
      (item) => item.status === "warning"
    );

    const bestWeekday = [...weekdayAnalysis]
      .filter((item) => item.sales > 0)
      .sort((a, b) => a.laborRate - b.laborRate)[0];

    const messages: string[] = [];

    if (dangerWeekdays.length > 0) {
      messages.push(
        `${dangerWeekdays
          .map((item) => `${item.weekdayName}曜日`)
          .join("・")}は人件費率が高めです。固定シフト人数や勤務時間を見直す候補です。`
      );
    }

    if (warningWeekdays.length > 0) {
      messages.push(
        `${warningWeekdays
          .map((item) => `${item.weekdayName}曜日`)
          .join("・")}は注意ラインです。売上が低い時間帯に人員が厚くなっていないか確認しましょう。`
      );
    }

    if (bestWeekday) {
      messages.push(
        `${bestWeekday.weekdayName}曜日は人件費率が${bestWeekday.laborRate.toFixed(
          1
        )}%で良好です。この曜日の配置バランスを他の曜日の参考にできます。`
      );
    }

    if (messages.length === 0) {
      messages.push(
        "対象期間の売上とシフトを登録すると、曜日ごとの人件費率をもとに改善ポイントを表示します。"
      );
    }

    return messages;
  }, [weekdayAnalysis]);

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

      try {
        await api.delete(`/sales/${sale.id}`);
      } catch (firstError: any) {
        const status = firstError.response?.status;

        if (
          status === 404 ||
          status === 405 ||
          status === 307 ||
          status === 308
        ) {
          await api.delete(`/sales/${sale.id}/`);
        } else {
          throw firstError;
        }
      }

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
          <p className="owner-sales-label">Sales Analysis</p>
          <h2>売上管理</h2>
          <p>
            週ごと・月ごとに売上と人件費率を確認できます。
            AIサポートが人件費が高い曜日を見つけて改善ポイントを表示します。
          </p>
        </div>
      </section>

      <section className="owner-sales-filter-section">
        <div className="owner-sales-period-tabs">
          <button
            type="button"
            className={periodMode === "week" ? "active" : ""}
            onClick={() => setPeriodMode("week")}
          >
            週ごと
          </button>

          <button
            type="button"
            className={periodMode === "month" ? "active" : ""}
            onClick={() => setPeriodMode("month")}
          >
            月ごと
          </button>
        </div>

        <div className="owner-sales-period-inputs">
          {periodMode === "week" ? (
            <label>
              対象週
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </label>
          ) : (
            <label>
              対象月
              <input
                type="month"
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
              />
            </label>
          )}
        </div>

        <p className="owner-sales-period-label">{periodLabel}</p>
      </section>

      <section className="owner-sales-summary-grid">
        <div className="owner-sales-summary-card">
          <span>対象期間の売上</span>
          <strong>{formatCurrency(totalSales)}</strong>
        </div>

        <div className="owner-sales-summary-card">
          <span>対象期間の人件費</span>
          <strong>{formatCurrency(totalLaborCost)}</strong>
        </div>

        <div className="owner-sales-summary-card">
          <span>対象期間の人件費率</span>
          <strong>{laborCostRate.toFixed(1)}%</strong>
        </div>
      </section>

      <section className={`owner-sales-ai-section ${isAiOpen ? "open" : ""}`}>
        <button
          type="button"
          className="owner-sales-ai-toggle"
          onClick={() => setIsAiOpen((prev) => !prev)}
        >
          <span>
            <small>AI Support</small>
            <strong>AIサポート</strong>
          </span>

          <em>{isAiOpen ? "閉じる" : "開く"}</em>
        </button>

        {isAiOpen && (
          <div className="owner-sales-ai-list">
            {aiSupportMessages.map((text, index) => (
              <div key={index} className="owner-sales-ai-message">
                <strong>{index + 1}</strong>
                <p>{text}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="owner-sales-section">
        <div className="owner-section-title-row">
          <div>
            <h3>曜日別 売上・人件費分析</h3>
            <p>
              対象期間内で、曜日ごとに人件費が高くなっていないか確認できます。
            </p>
          </div>
        </div>

        <div className="owner-weekday-analysis-grid">
          {weekdayAnalysis.map((item) => (
            <article
              key={item.weekdayIndex}
              className={`owner-weekday-card ${item.status}`}
            >
              <div className="owner-weekday-card-header">
                <span>{item.weekdayName}</span>
                <strong>{item.statusLabel}</strong>
              </div>

              <dl>
                <div>
                  <dt>売上</dt>
                  <dd>{formatCurrency(item.sales)}</dd>
                </div>

                <div>
                  <dt>人件費</dt>
                  <dd>{formatCurrency(item.laborCost)}</dd>
                </div>

                <div>
                  <dt>人件費率</dt>
                  <dd>
                    {item.sales > 0 ? `${item.laborRate.toFixed(1)}%` : "-"}
                  </dd>
                </div>

                <div>
                  <dt>シフト数</dt>
                  <dd>{item.shiftCount}件</dd>
                </div>
              </dl>

              <p>{item.advice}</p>
            </article>
          ))}
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
            <p>対象期間内の売上を確認できます。</p>
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
                  <th>曜日</th>
                  <th>売上</th>
                  <th>その日の人件費</th>
                  <th>人件費率</th>
                  <th>操作</th>
                </tr>
              </thead>

              <tbody>
                {sortedSales.length === 0 ? (
                  <tr>
                    <td colSpan={6}>対象期間の売上がまだ登録されていません</td>
                  </tr>
                ) : (
                  sortedSales.map((sale) => {
                    const dailyShifts = filteredShifts.filter(
                      (shift) => shift.work_date === sale.sale_date
                    );

                    const dailyLaborCost = dailyShifts.reduce((sum, shift) => {
                      return sum + calculateShiftCost(shift, users);
                    }, 0);

                    const dailyRate =
                      sale.amount > 0
                        ? (dailyLaborCost / sale.amount) * 100
                        : 0;

                    const dailyStatus = getRateStatus(dailyRate, sale.amount);

                    return (
                      <tr key={sale.id}>
                        <td>{sale.sale_date}</td>
                        <td>{weekdayNames[getWeekdayIndex(sale.sale_date)]}</td>
                        <td>{formatCurrency(sale.amount)}</td>
                        <td>{formatCurrency(dailyLaborCost)}</td>
                        <td>
                          <span
                            className={`owner-sales-rate ${dailyStatus.status}`}
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