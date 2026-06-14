import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../api/client";
import "./OwnerShiftsPage.css";
import OwnerHamburgerMenu from "../../components/OwnerHamburgerMenu";

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
  user_name?: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  created_by?: number;
};

type ShiftForm = {
  user_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: string;
};

function getTodayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getRoleLabel(role: string) {
  if (role === "owner") {
    return "オーナー";
  }

  if (role === "manager") {
    return "管理者";
  }

  return "従業員";
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
  const loginUserId = Number(localStorage.getItem("loginUserId") || 0);
  const loginRole = localStorage.getItem("loginRole") || "";
  const loginName = localStorage.getItem("loginName") || "ユーザー";

  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [newShift, setNewShift] = useState<ShiftForm>({
    user_id: "",
    work_date: getTodayDate(),
    start_time: "09:00",
    end_time: "17:00",
    break_minutes: "60",
  });

  const [editingShiftId, setEditingShiftId] = useState<number | null>(null);
  const [editShift, setEditShift] = useState<ShiftForm>({
    user_id: "",
    work_date: "",
    start_time: "",
    end_time: "",
    break_minutes: "",
  });

  /**
   * シフト登録対象
   * 管理者画面から入った場合でも、
   * オーナー・管理者・従業員を全員シフトに登録できる
   */
  const shiftUsers = useMemo(() => {
    return users
      .filter(
        (user) =>
          user.role === "owner" ||
          user.role === "manager" ||
          user.role === "employee"
      )
      .sort((a, b) => {
        const roleOrder: Record<string, number> = {
          owner: 1,
          manager: 2,
          employee: 3,
        };

        const roleA = roleOrder[a.role] ?? 99;
        const roleB = roleOrder[b.role] ?? 99;

        if (roleA !== roleB) {
          return roleA - roleB;
        }

        return a.id - b.id;
      });
  }, [users]);

  const userNameMap = useMemo(() => {
    const map = new Map<number, string>();

    users.forEach((user) => {
      map.set(user.id, user.name);
    });

    return map;
  }, [users]);

  const displayedShifts = useMemo(() => {
    const seen = new Set<string>();

    return shifts
      .map((shift) => ({
        ...shift,
        user_name:
          shift.user_name || userNameMap.get(shift.user_id) || `ID:${shift.user_id}`,
      }))
      .filter((shift) => {
        const key = [
          shift.user_id,
          shift.work_date,
          shift.start_time.slice(0, 5),
          shift.end_time.slice(0, 5),
          shift.break_minutes,
        ].join("-");

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        if (a.work_date !== b.work_date) {
          return a.work_date.localeCompare(b.work_date);
        }

        if (a.start_time !== b.start_time) {
          return a.start_time.localeCompare(b.start_time);
        }

        return a.user_id - b.user_id;
      });
  }, [shifts, userNameMap]);

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
    } catch (error: any) {
      console.error("シフト管理データ取得失敗:", error);
      setMessage(formatApiError(error, "シフト情報の取得に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateShift = async (e: FormEvent) => {
    e.preventDefault();

    if (!newShift.user_id) {
      setMessage("勤務者を選択してください");
      return;
    }

    if (!newShift.work_date) {
      setMessage("勤務日を入力してください");
      return;
    }

    if (!newShift.start_time || !newShift.end_time) {
      setMessage("開始時間と終了時間を入力してください");
      return;
    }

    try {
      setMessage("");

      await api.post("/shifts/", {
        user_id: Number(newShift.user_id),
        work_date: newShift.work_date,
        start_time: newShift.start_time,
        end_time: newShift.end_time,
        break_minutes: Number(newShift.break_minutes || 0),
        created_by: loginUserId || 1,
      });

      setMessage("シフトを登録しました");

      setNewShift((prev) => ({
        ...prev,
        user_id: "",
        start_time: "09:00",
        end_time: "17:00",
        break_minutes: "60",
      }));

      await fetchData();
    } catch (error: any) {
      console.error("シフト登録失敗:", error);
      setMessage(formatApiError(error, "シフト登録に失敗しました"));
    }
  };

  const handleStartEdit = (shift: Shift) => {
    setEditingShiftId(shift.id);

    setEditShift({
      user_id: String(shift.user_id),
      work_date: shift.work_date,
      start_time: shift.start_time.slice(0, 5),
      end_time: shift.end_time.slice(0, 5),
      break_minutes: String(shift.break_minutes || 0),
    });

    setMessage("");
  };

  const handleCancelEdit = () => {
    setEditingShiftId(null);

    setEditShift({
      user_id: "",
      work_date: "",
      start_time: "",
      end_time: "",
      break_minutes: "",
    });

    setMessage("");
  };

  const handleUpdateShift = async (shiftId: number) => {
    if (!editShift.user_id) {
      setMessage("勤務者を選択してください");
      return;
    }

    if (!editShift.work_date) {
      setMessage("勤務日を入力してください");
      return;
    }

    if (!editShift.start_time || !editShift.end_time) {
      setMessage("開始時間と終了時間を入力してください");
      return;
    }

    try {
      setMessage("");

      await api.put(`/shifts/${shiftId}`, {
        user_id: Number(editShift.user_id),
        work_date: editShift.work_date,
        start_time: editShift.start_time,
        end_time: editShift.end_time,
        break_minutes: Number(editShift.break_minutes || 0),
        created_by: loginUserId || 1,
      });

      setMessage("シフトを更新しました");

      setEditingShiftId(null);

      await fetchData();
    } catch (error: any) {
      console.error("シフト更新失敗:", error);
      setMessage(formatApiError(error, "シフト更新に失敗しました"));
    }
  };

  const handleDeleteShift = async (shiftId: number) => {
    const ok = window.confirm("このシフトを削除しますか？");

    if (!ok) {
      return;
    }

    try {
      setMessage("");

      await api.delete(`/shifts/${shiftId}`);

      setMessage("シフトを削除しました");

      await fetchData();
    } catch (error: any) {
      console.error("シフト削除失敗:", error);
      setMessage(formatApiError(error, "シフト削除に失敗しました"));
    }
  };

  return (
    <div className="owner-shifts-page">
      <OwnerHamburgerMenu />
      <section className="owner-shifts-hero">
        <div>
          <p className="owner-shifts-label">SHIFT MANAGEMENT</p>
          <h2>シフト管理</h2>
          <p>
            シフトの追加・編集・削除を行います。
            管理者画面から入った場合でも、オーナー・管理者・従業員をシフトに登録できます。
          </p>
        </div>

        <div className="owner-shifts-count-card">
          <span>ログイン中</span>
          <strong>{loginName}</strong>
          <small>{loginRole === "manager" ? "管理者" : "オーナー"}</small>
        </div>
      </section>

      <section className="owner-shifts-section">
        <div className="owner-section-title-row">
          <div>
            <h3>シフト追加</h3>
            <p>勤務者・勤務日・勤務時間を入力してください。</p>
          </div>

          <button
            type="button"
            className="owner-shifts-refresh-button"
            onClick={fetchData}
          >
            再読み込み
          </button>
        </div>

        <form className="owner-shifts-form" onSubmit={handleCreateShift}>
          <label>
            勤務者
            <select
              value={newShift.user_id}
              onChange={(e) =>
                setNewShift((prev) => ({
                  ...prev,
                  user_id: e.target.value,
                }))
              }
              required
            >
              <option value="">勤務者を選択</option>

              {shiftUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}（{getRoleLabel(user.role)} / {user.email}）
                </option>
              ))}
            </select>
          </label>

          <label>
            勤務日
            <input
              type="date"
              value={newShift.work_date}
              onChange={(e) =>
                setNewShift((prev) => ({
                  ...prev,
                  work_date: e.target.value,
                }))
              }
              required
            />
          </label>

          <label>
            開始時間
            <input
              type="time"
              value={newShift.start_time}
              onChange={(e) =>
                setNewShift((prev) => ({
                  ...prev,
                  start_time: e.target.value,
                }))
              }
              required
            />
          </label>

          <label>
            終了時間
            <input
              type="time"
              value={newShift.end_time}
              onChange={(e) =>
                setNewShift((prev) => ({
                  ...prev,
                  end_time: e.target.value,
                }))
              }
              required
            />
          </label>

          <label>
            休憩
            <input
              type="number"
              value={newShift.break_minutes}
              onChange={(e) =>
                setNewShift((prev) => ({
                  ...prev,
                  break_minutes: e.target.value,
                }))
              }
              min="0"
              step="5"
              placeholder="例：60"
            />
          </label>

          <button type="submit">シフトを追加</button>
        </form>

        {message && <p className="owner-shifts-message">{message}</p>}
      </section>

      <section className="owner-shifts-section">
        <div className="owner-section-title-row">
          <div>
            <h3>シフト一覧</h3>
            <p>登録済みのシフトを確認・編集できます。</p>
          </div>
        </div>

        {loading ? (
          <div className="owner-shifts-loading">読み込み中...</div>
        ) : displayedShifts.length === 0 ? (
          <div className="owner-shifts-empty">
            シフトがまだ登録されていません。
          </div>
        ) : (
          <div className="owner-shifts-table-wrap">
            <table className="owner-shifts-table">
              <thead>
                <tr>
                  <th>勤務者</th>
                  <th>勤務日</th>
                  <th>開始</th>
                  <th>終了</th>
                  <th>休憩</th>
                  <th>操作</th>
                </tr>
              </thead>

              <tbody>
                {displayedShifts.map((shift) => {
                  const isEditing = editingShiftId === shift.id;

                  return (
                    <tr key={shift.id}>
                      <td>
                        {isEditing ? (
                          <select
                            value={editShift.user_id}
                            onChange={(e) =>
                              setEditShift((prev) => ({
                                ...prev,
                                user_id: e.target.value,
                              }))
                            }
                          >
                            <option value="">勤務者を選択</option>

                            {shiftUsers.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name}（{getRoleLabel(user.role)} /{" "}
                                {user.email}）
                              </option>
                            ))}
                          </select>
                        ) : (
                          shift.user_name
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editShift.work_date}
                            onChange={(e) =>
                              setEditShift((prev) => ({
                                ...prev,
                                work_date: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          shift.work_date
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            type="time"
                            value={editShift.start_time}
                            onChange={(e) =>
                              setEditShift((prev) => ({
                                ...prev,
                                start_time: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          shift.start_time.slice(0, 5)
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            type="time"
                            value={editShift.end_time}
                            onChange={(e) =>
                              setEditShift((prev) => ({
                                ...prev,
                                end_time: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          shift.end_time.slice(0, 5)
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editShift.break_minutes}
                            onChange={(e) =>
                              setEditShift((prev) => ({
                                ...prev,
                                break_minutes: e.target.value,
                              }))
                            }
                            min="0"
                            step="5"
                          />
                        ) : (
                          `${shift.break_minutes || 0}分`
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <div className="owner-table-actions">
                            <button
                              type="button"
                              className="owner-table-save-button"
                              onClick={() => handleUpdateShift(shift.id)}
                            >
                              保存
                            </button>

                            <button
                              type="button"
                              className="owner-table-cancel-button"
                              onClick={handleCancelEdit}
                            >
                              キャンセル
                            </button>
                          </div>
                        ) : (
                          <div className="owner-table-actions">
                            <button
                              type="button"
                              className="owner-table-edit-button"
                              onClick={() => handleStartEdit(shift)}
                            >
                              編集
                            </button>

                            <button
                              type="button"
                              className="owner-table-delete-button"
                              onClick={() => handleDeleteShift(shift.id)}
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
        )}
      </section>
    </div>
  );
}