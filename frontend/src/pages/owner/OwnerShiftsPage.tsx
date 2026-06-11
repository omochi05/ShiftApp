import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../api/client";
import "./OwnerShiftsPage.css";

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
  user_name: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
};

type ShiftForm = {
  user_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: string;
};

type EmployeeMonthlySummary = {
  user: User;
  shifts: Shift[];
  totalMinutes: number;
};

const initialShiftForm: ShiftForm = {
  user_id: "",
  work_date: "",
  start_time: "09:00",
  end_time: "17:00",
  break_minutes: "60",
};

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

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours <= 0) {
    return `${mins}分`;
  }

  if (mins === 0) {
    return `${hours}時間`;
  }

  return `${hours}時間${mins}分`;
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

export default function OwnerShiftsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [targetMonth, setTargetMonth] = useState(getCurrentMonth());
  const [openedEmployeeIds, setOpenedEmployeeIds] = useState<number[]>([]);

  const [shiftForm, setShiftForm] = useState<ShiftForm>({
    ...initialShiftForm,
    work_date: getTodayDate(),
  });

  const [editingShiftId, setEditingShiftId] = useState<number | null>(null);
  const [editShiftForm, setEditShiftForm] = useState<ShiftForm>({
    ...initialShiftForm,
    work_date: getTodayDate(),
  });

  const employeeUsers = useMemo(() => {
    return users.filter((user) => user.role === "employee");
  }, [users]);

  const monthlyShifts = useMemo(() => {
    return shifts.filter((shift) => shift.work_date.startsWith(targetMonth));
  }, [shifts, targetMonth]);

  const sortedMonthlyShifts = useMemo(() => {
    return [...monthlyShifts].sort((a, b) => {
      if (a.work_date < b.work_date) return -1;
      if (a.work_date > b.work_date) return 1;

      if (a.start_time < b.start_time) return -1;
      if (a.start_time > b.start_time) return 1;

      return a.id - b.id;
    });
  }, [monthlyShifts]);

  const employeeMonthlySummaries = useMemo<EmployeeMonthlySummary[]>(() => {
    return employeeUsers.map((user) => {
      const userShifts = sortedMonthlyShifts.filter(
        (shift) => shift.user_id === user.id
      );

      const totalMinutes = userShifts.reduce((sum, shift) => {
        return sum + getShiftDurationMinutes(shift);
      }, 0);

      return {
        user,
        shifts: userShifts,
        totalMinutes,
      };
    });
  }, [employeeUsers, sortedMonthlyShifts]);

  const totalMonthlyMinutes = useMemo(() => {
    return employeeMonthlySummaries.reduce((sum, item) => {
      return sum + item.totalMinutes;
    }, 0);
  }, [employeeMonthlySummaries]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setMessage("");

      const [usersRes, shiftsRes] = await Promise.all([
        api.get<User[]>("/users/"),
        api.get<Shift[]>("/shifts/"),
      ]);

      setUsers(usersRes.data);
      setShifts(shiftsRes.data);
    } catch (error) {
      console.error("シフト管理データ取得失敗:", error);
      setMessage("シフト管理データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleEmployeeLog = (userId: number) => {
    setOpenedEmployeeIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }

      return [...prev, userId];
    });
  };

  const openAllLogs = () => {
    setOpenedEmployeeIds(employeeUsers.map((user) => user.id));
  };

  const closeAllLogs = () => {
    setOpenedEmployeeIds([]);
  };

  const validateShiftForm = (form: ShiftForm) => {
    if (!form.user_id) {
      return "従業員を選択してください";
    }

    if (!form.work_date) {
      return "勤務日を入力してください";
    }

    if (!form.start_time) {
      return "開始時間を入力してください";
    }

    if (!form.end_time) {
      return "終了時間を入力してください";
    }

    if (Number(form.break_minutes || 0) < 0) {
      return "休憩時間は0分以上で入力してください";
    }

    return "";
  };

  const handleCreateShift = async (e: FormEvent) => {
    e.preventDefault();

    const errorMessage = validateShiftForm(shiftForm);
    if (errorMessage) {
      setMessage(errorMessage);
      return;
    }

    try {
      setMessage("");

      await api.post("/shifts/", {
        user_id: Number(shiftForm.user_id),
        work_date: shiftForm.work_date,
        start_time: shiftForm.start_time,
        end_time: shiftForm.end_time,
        break_minutes: Number(shiftForm.break_minutes || 0),
      });

      setMessage("シフトを作成しました");

      setShiftForm({
        ...initialShiftForm,
        work_date: shiftForm.work_date,
      });

      const createdUserId = Number(shiftForm.user_id);
      setOpenedEmployeeIds((prev) =>
        prev.includes(createdUserId) ? prev : [...prev, createdUserId]
      );

      await fetchData();
    } catch (error: any) {
      console.error("シフト作成失敗:", error);
      console.error("レスポンス:", error.response?.data);

      setMessage(formatApiError(error, "シフト作成に失敗しました"));
    }
  };

  const handleStartEditShift = (shift: Shift) => {
    setEditingShiftId(shift.id);

    setEditShiftForm({
      user_id: String(shift.user_id),
      work_date: shift.work_date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      break_minutes: String(shift.break_minutes || 0),
    });

    setMessage("");
  };

  const handleCancelEditShift = () => {
    setEditingShiftId(null);

    setEditShiftForm({
      ...initialShiftForm,
      work_date: getTodayDate(),
    });
  };

  const handleUpdateShift = async (shiftId: number) => {
    const errorMessage = validateShiftForm(editShiftForm);
    if (errorMessage) {
      setMessage(errorMessage);
      return;
    }

    try {
      setMessage("");

      await api.put(`/shifts/${shiftId}`, {
        user_id: Number(editShiftForm.user_id),
        work_date: editShiftForm.work_date,
        start_time: editShiftForm.start_time,
        end_time: editShiftForm.end_time,
        break_minutes: Number(editShiftForm.break_minutes || 0),
      });

      setMessage("シフトを更新しました");

      handleCancelEditShift();
      await fetchData();
    } catch (error: any) {
      console.error("シフト更新失敗:", error);
      console.error("レスポンス:", error.response?.data);

      setMessage(formatApiError(error, "シフト更新に失敗しました"));
    }
  };

  const handleDeleteShift = async (shift: Shift) => {
    const ok = window.confirm(
      `${shift.work_date} ${shift.user_name}さんのシフトを削除しますか？`
    );

    if (!ok) return;

    try {
      setMessage("");

      try {
        await api.delete(`/shifts/${shift.id}`);
      } catch (firstError: any) {
        const status = firstError.response?.status;

        if (
          status === 404 ||
          status === 405 ||
          status === 307 ||
          status === 308
        ) {
          await api.delete(`/shifts/${shift.id}/`);
        } else {
          throw firstError;
        }
      }

      setMessage("シフトを削除しました");
      await fetchData();
    } catch (error: any) {
      console.error("シフト削除失敗:", error);
      console.error("レスポンス:", error.response?.data);

      setMessage(formatApiError(error, "シフト削除に失敗しました"));
    }
  };

  return (
    <div className="owner-shifts-page">
      <section className="owner-shifts-hero">
        <div>
          <p className="owner-shifts-label">Shift Management</p>
          <h2>シフト管理</h2>
          <p>
            従業員ごとの月間労働時間とシフト登録ログを確認できます。
            登録したシフトは売上分析や人件費計算にも反映されます。
          </p>
        </div>
      </section>

      <section className="owner-shifts-month-filter">
        <label>
          対象月
          <input
            type="month"
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
          />
        </label>

        <div>
          <button type="button" onClick={openAllLogs}>
            全員のログを開く
          </button>

          <button type="button" onClick={closeAllLogs}>
            全員のログを閉じる
          </button>
        </div>
      </section>

      <section className="owner-shifts-summary-grid">
        <div className="owner-shifts-summary-card">
          <span>対象月のシフト数</span>
          <strong>{monthlyShifts.length}件</strong>
        </div>

        <div className="owner-shifts-summary-card">
          <span>対象月の総勤務時間</span>
          <strong>{formatDuration(totalMonthlyMinutes)}</strong>
        </div>

        <div className="owner-shifts-summary-card">
          <span>登録従業員数</span>
          <strong>{employeeUsers.length}人</strong>
        </div>
      </section>

      <section className="owner-shifts-section">
        <div className="owner-shifts-section-title">
          <div>
            <h3>シフト作成</h3>
            <p>従業員・勤務日・勤務時間を入力してください。</p>
          </div>
        </div>

        <form className="owner-shifts-form" onSubmit={handleCreateShift}>
          <label>
            従業員
            <select
              value={shiftForm.user_id}
              onChange={(e) =>
                setShiftForm({
                  ...shiftForm,
                  user_id: e.target.value,
                })
              }
              required
            >
              <option value="">選択してください</option>
              {employeeUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}（{user.email}）
                </option>
              ))}
            </select>
          </label>

          <label>
            勤務日
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
            開始時間
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
            終了時間
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
            休憩時間
            <select
              value={shiftForm.break_minutes}
              onChange={(e) =>
                setShiftForm({
                  ...shiftForm,
                  break_minutes: e.target.value,
                })
              }
            >
              <option value="0">0分</option>
              <option value="15">15分</option>
              <option value="30">30分</option>
              <option value="45">45分</option>
              <option value="60">60分</option>
              <option value="90">90分</option>
              <option value="120">120分</option>
            </select>
          </label>

          <button type="submit">シフトを作成</button>
        </form>

        {message && <p className="owner-shifts-message">{message}</p>}
      </section>

      <section className="owner-shifts-section">
        <div className="owner-shifts-section-title owner-shifts-log-title">
          <div>
            <h3>従業員別シフト一覧</h3>
            <p>
              従業員を全員表示し、対象月の労働時間と登録ログを確認できます。
            </p>
          </div>

          <button
            type="button"
            className="owner-shifts-refresh-button"
            onClick={fetchData}
          >
            再読み込み
          </button>
        </div>

        {loading ? (
          <div className="owner-shifts-loading">読み込み中...</div>
        ) : employeeMonthlySummaries.length === 0 ? (
          <div className="owner-shifts-empty">
            従業員がまだ登録されていません。
          </div>
        ) : (
          <div className="owner-employee-shift-list">
            {employeeMonthlySummaries.map((summary) => {
              const isOpen = openedEmployeeIds.includes(summary.user.id);

              return (
                <article
                  key={summary.user.id}
                  className={`owner-employee-shift-card ${
                    isOpen ? "open" : ""
                  }`}
                >
                  <div className="owner-employee-shift-header">
                    <div>
                      <span>{summary.user.email}</span>
                      <h4>{summary.user.name}</h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleEmployeeLog(summary.user.id)}
                    >
                      {isOpen ? "ログを閉じる" : "ログを見る"}
                    </button>
                  </div>

                  <div className="owner-employee-shift-summary">
                    <div>
                      <span>月間勤務時間</span>
                      <strong>{formatDuration(summary.totalMinutes)}</strong>
                    </div>

                    <div>
                      <span>登録ログ</span>
                      <strong>{summary.shifts.length}件</strong>
                    </div>

                    <div>
                      <span>対象月</span>
                      <strong>{targetMonth}</strong>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="owner-employee-log-area">
                      {summary.shifts.length === 0 ? (
                        <p className="owner-employee-log-empty">
                          対象月のシフト登録ログはありません。
                        </p>
                      ) : (
                        <div className="owner-employee-log-list">
                          {summary.shifts.map((shift) => {
                            const isEditing = editingShiftId === shift.id;

                            return (
                              <article
                                key={shift.id}
                                className="owner-shift-log-card"
                              >
                                {isEditing ? (
                                  <>
                                    <div className="owner-shift-card-edit-grid">
                                      <label>
                                        従業員
                                        <select
                                          value={editShiftForm.user_id}
                                          onChange={(e) =>
                                            setEditShiftForm({
                                              ...editShiftForm,
                                              user_id: e.target.value,
                                            })
                                          }
                                        >
                                          <option value="">
                                            選択してください
                                          </option>
                                          {employeeUsers.map((user) => (
                                            <option
                                              key={user.id}
                                              value={user.id}
                                            >
                                              {user.name}（{user.email}）
                                            </option>
                                          ))}
                                        </select>
                                      </label>

                                      <label>
                                        勤務日
                                        <input
                                          type="date"
                                          value={editShiftForm.work_date}
                                          onChange={(e) =>
                                            setEditShiftForm({
                                              ...editShiftForm,
                                              work_date: e.target.value,
                                            })
                                          }
                                        />
                                      </label>

                                      <label>
                                        開始
                                        <input
                                          type="time"
                                          value={editShiftForm.start_time}
                                          onChange={(e) =>
                                            setEditShiftForm({
                                              ...editShiftForm,
                                              start_time: e.target.value,
                                            })
                                          }
                                        />
                                      </label>

                                      <label>
                                        終了
                                        <input
                                          type="time"
                                          value={editShiftForm.end_time}
                                          onChange={(e) =>
                                            setEditShiftForm({
                                              ...editShiftForm,
                                              end_time: e.target.value,
                                            })
                                          }
                                        />
                                      </label>

                                      <label>
                                        休憩
                                        <select
                                          value={editShiftForm.break_minutes}
                                          onChange={(e) =>
                                            setEditShiftForm({
                                              ...editShiftForm,
                                              break_minutes: e.target.value,
                                            })
                                          }
                                        >
                                          <option value="0">0分</option>
                                          <option value="15">15分</option>
                                          <option value="30">30分</option>
                                          <option value="45">45分</option>
                                          <option value="60">60分</option>
                                          <option value="90">90分</option>
                                          <option value="120">120分</option>
                                        </select>
                                      </label>
                                    </div>

                                    <div className="owner-shift-card-actions">
                                      <button
                                        type="button"
                                        className="owner-shift-save-button"
                                        onClick={() =>
                                          handleUpdateShift(shift.id)
                                        }
                                      >
                                        保存
                                      </button>

                                      <button
                                        type="button"
                                        className="owner-shift-cancel-button"
                                        onClick={handleCancelEditShift}
                                      >
                                        キャンセル
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="owner-shift-log-header">
                                      <div>
                                        <span>{shift.work_date}</span>
                                        <strong>
                                          {shift.start_time} 〜{" "}
                                          {shift.end_time}
                                        </strong>
                                      </div>

                                      <em>
                                        {formatDuration(
                                          getShiftDurationMinutes(shift)
                                        )}
                                      </em>
                                    </div>

                                    <dl className="owner-shift-log-detail">
                                      <div>
                                        <dt>休憩</dt>
                                        <dd>{shift.break_minutes || 0}分</dd>
                                      </div>

                                      <div>
                                        <dt>勤務時間</dt>
                                        <dd>
                                          {formatDuration(
                                            getShiftDurationMinutes(shift)
                                          )}
                                        </dd>
                                      </div>
                                    </dl>

                                    <div className="owner-shift-card-actions">
                                      <button
                                        type="button"
                                        className="owner-shift-edit-button"
                                        onClick={() =>
                                          handleStartEditShift(shift)
                                        }
                                      >
                                        編集
                                      </button>

                                      <button
                                        type="button"
                                        className="owner-shift-delete-button"
                                        onClick={() =>
                                          handleDeleteShift(shift)
                                        }
                                      >
                                        削除
                                      </button>
                                    </div>
                                  </>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}