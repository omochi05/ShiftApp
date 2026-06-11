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

  const sortedShifts = useMemo(() => {
    return [...shifts].sort((a, b) => {
      if (a.work_date < b.work_date) return 1;
      if (a.work_date > b.work_date) return -1;

      if (a.start_time < b.start_time) return -1;
      if (a.start_time > b.start_time) return 1;

      return b.id - a.id;
    });
  }, [shifts]);

  const todayShiftCount = useMemo(() => {
    const today = getTodayDate();
    return shifts.filter((shift) => shift.work_date === today).length;
  }, [shifts]);

  const totalShiftHours = useMemo(() => {
    const totalMinutes = shifts.reduce((sum, shift) => {
      return sum + getShiftDurationMinutes(shift);
    }, 0);

    return formatDuration(totalMinutes);
  }, [shifts]);

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
            従業員ごとのシフトを作成・編集・削除できます。
            登録したシフトはシフト表、売上分析、人件費計算に反映されます。
          </p>
        </div>
      </section>

      <section className="owner-shifts-summary-grid">
        <div className="owner-shifts-summary-card">
          <span>登録シフト数</span>
          <strong>{shifts.length}件</strong>
        </div>

        <div className="owner-shifts-summary-card">
          <span>本日のシフト</span>
          <strong>{todayShiftCount}件</strong>
        </div>

        <div className="owner-shifts-summary-card">
          <span>総勤務時間</span>
          <strong>{totalShiftHours}</strong>
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
        <div className="owner-shifts-section-title">
          <div>
            <h3>シフト一覧</h3>
            <p>登録済みのシフトを確認・編集できます。</p>
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
        ) : sortedShifts.length === 0 ? (
          <div className="owner-shifts-empty">
            まだシフトが登録されていません。
          </div>
        ) : (
          <>
            <div className="owner-shifts-card-list">
              {sortedShifts.map((shift) => {
                const isEditing = editingShiftId === shift.id;

                return (
                  <article key={shift.id} className="owner-shift-card">
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
                            onClick={() => handleUpdateShift(shift.id)}
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
                        <div className="owner-shift-card-header">
                          <div>
                            <span>{shift.work_date}</span>
                            <h4>{shift.user_name}</h4>
                          </div>

                          <strong>
                            {formatDuration(getShiftDurationMinutes(shift))}
                          </strong>
                        </div>

                        <dl className="owner-shift-card-detail">
                          <div>
                            <dt>勤務時間</dt>
                            <dd>
                              {shift.start_time} 〜 {shift.end_time}
                            </dd>
                          </div>

                          <div>
                            <dt>休憩</dt>
                            <dd>{shift.break_minutes || 0}分</dd>
                          </div>
                        </dl>

                        <div className="owner-shift-card-actions">
                          <button
                            type="button"
                            className="owner-shift-edit-button"
                            onClick={() => handleStartEditShift(shift)}
                          >
                            編集
                          </button>

                          <button
                            type="button"
                            className="owner-shift-delete-button"
                            onClick={() => handleDeleteShift(shift)}
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

            <div className="owner-shifts-table-wrap">
              <table className="owner-shifts-table">
                <thead>
                  <tr>
                    <th>勤務日</th>
                    <th>従業員</th>
                    <th>開始</th>
                    <th>終了</th>
                    <th>休憩</th>
                    <th>勤務時間</th>
                    <th>操作</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedShifts.map((shift) => (
                    <tr key={shift.id}>
                      <td>{shift.work_date}</td>
                      <td>{shift.user_name}</td>
                      <td>{shift.start_time}</td>
                      <td>{shift.end_time}</td>
                      <td>{shift.break_minutes || 0}分</td>
                      <td>{formatDuration(getShiftDurationMinutes(shift))}</td>
                      <td>
                        <div className="owner-shifts-table-actions">
                          <button
                            type="button"
                            className="owner-shift-edit-button"
                            onClick={() => handleStartEditShift(shift)}
                          >
                            編集
                          </button>

                          <button
                            type="button"
                            className="owner-shift-delete-button"
                            onClick={() => handleDeleteShift(shift)}
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}