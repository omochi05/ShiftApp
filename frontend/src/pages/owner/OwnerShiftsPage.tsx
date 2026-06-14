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
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
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
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [targetMonth, setTargetMonth] = useState(getCurrentMonth());
  const [openedEmployeeIds, setOpenedEmployeeIds] = useState<number[]>([]);
  const [selectedShiftIds, setSelectedShiftIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);

  const [shiftForm, setShiftForm] = useState<ShiftForm>({
    ...initialShiftForm,
    work_date: getTodayDate(),
  });

  const [editingShiftId, setEditingShiftId] = useState<number | null>(null);
  const [editShiftForm, setEditShiftForm] = useState<ShiftForm>({
    ...initialShiftForm,
    work_date: getTodayDate(),
  });

  /**
   * シフト登録対象。
   * 管理者画面から入った場合でも、
   * オーナー・管理者・従業員を全員シフトに登録できる。
   */
  const shiftUsers = useMemo(() => {
    return users
        .filter(
        (user) =>
            user.email !== "9999" &&
            (user.role === "owner" ||
            user.role === "manager" ||
            user.role === "employee")
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

  const monthlyShifts = useMemo(() => {
    return shifts.filter((shift) => shift.work_date.startsWith(targetMonth));
  }, [shifts, targetMonth]);

  const sortedMonthlyShifts = useMemo(() => {
    const seen = new Set<string>();

    return [...monthlyShifts]
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
        if (a.work_date < b.work_date) return -1;
        if (a.work_date > b.work_date) return 1;

        if (a.start_time < b.start_time) return -1;
        if (a.start_time > b.start_time) return 1;

        return a.id - b.id;
      });
  }, [monthlyShifts]);

  const employeeMonthlySummaries = useMemo<EmployeeMonthlySummary[]>(() => {
    return shiftUsers.map((user) => {
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
  }, [shiftUsers, sortedMonthlyShifts]);

  const totalMonthlyMinutes = useMemo(() => {
    return employeeMonthlySummaries.reduce((sum, item) => {
      return sum + item.totalMinutes;
    }, 0);
  }, [employeeMonthlySummaries]);

  const monthlyShiftIds = useMemo(() => {
    return sortedMonthlyShifts.map((shift) => shift.id);
  }, [sortedMonthlyShifts]);

  const selectedMonthlyShiftIds = useMemo(() => {
    return selectedShiftIds.filter((id) => monthlyShiftIds.includes(id));
  }, [selectedShiftIds, monthlyShiftIds]);

  const fetchData = async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? true;

    try {
      if (showLoading) {
        setLoading(true);
      }

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
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData({ showLoading: true });
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
    setOpenedEmployeeIds(shiftUsers.map((user) => user.id));
  };

  const closeAllLogs = () => {
    setOpenedEmployeeIds([]);
  };

  const toggleShiftSelection = (shiftId: number) => {
    setSelectedShiftIds((prev) => {
      if (prev.includes(shiftId)) {
        return prev.filter((id) => id !== shiftId);
      }

      return [...prev, shiftId];
    });
  };

  const selectAllMonthlyShifts = () => {
    setSelectedShiftIds((prev) => {
      const merged = new Set([...prev, ...monthlyShiftIds]);
      return Array.from(merged);
    });
  };

  const clearSelectedShifts = () => {
    setSelectedShiftIds((prev) =>
      prev.filter((id) => !monthlyShiftIds.includes(id))
    );
  };

  const validateShiftForm = (form: ShiftForm) => {
    if (!form.user_id) {
      return "勤務者を選択してください";
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
        created_by: Number(localStorage.getItem("loginUserId") || 0) || null,
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

        try {
        await fetchData({ showLoading: false });
        } catch (reloadError) {
        console.error("シフト作成後の再読み込み失敗:", reloadError);
        setMessage(
            "シフトは作成しましたが、再読み込みに失敗しました。画面を更新してください。"
        );
        }
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
        start_time: shift.start_time.slice(0, 5),
        end_time: shift.end_time.slice(0, 5),
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
      created_by: Number(localStorage.getItem("loginUserId") || 0) || null,
    });

    setMessage("シフトを更新しました");

    handleCancelEditShift();

    try {
      await fetchData({ showLoading: false });
    } catch (reloadError) {
      console.error("シフト更新後の再読み込み失敗:", reloadError);
      setMessage(
        "シフトは更新しましたが、再読み込みに失敗しました。画面を更新してください。"
      );
    }
  } catch (error: any) {
    console.error("シフト更新失敗:", error);
    console.error("レスポンス:", error.response?.data);

    setMessage(formatApiError(error, "シフト更新に失敗しました"));
  }
};

  const deleteShiftById = async (shiftId: number) => {
    try {
      await api.delete(`/shifts/${shiftId}`);
    } catch (firstError: any) {
      const status = firstError.response?.status;

      if (
        status === 404 ||
        status === 405 ||
        status === 307 ||
        status === 308
      ) {
        await api.delete(`/shifts/${shiftId}/`);
      } else {
        throw firstError;
      }
    }
  };

  const handleDeleteShift = async (shift: Shift) => {
    const ok = window.confirm(
      `${shift.work_date} ${shift.user_name}さんのシフトを削除しますか？`
    );

    if (!ok) return;

    try {
      setDeleting(true);
      setMessage("");

      await deleteShiftById(shift.id);

      setSelectedShiftIds((prev) => prev.filter((id) => id !== shift.id));
      setMessage("シフトを削除しました");

      await fetchData({ showLoading: false });
    } catch (error: any) {
      console.error("シフト削除失敗:", error);
      console.error("レスポンス:", error.response?.data);

      setMessage(formatApiError(error, "シフト削除に失敗しました"));
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDeleteShifts = async () => {
    if (selectedMonthlyShiftIds.length === 0) {
      setMessage("削除するシフトを選択してください");
      return;
    }

    const ok = window.confirm(
      `選択したシフト ${selectedMonthlyShiftIds.length}件を一括削除しますか？`
    );

    if (!ok) return;

    try {
      setDeleting(true);
      setMessage("");

      for (const shiftId of selectedMonthlyShiftIds) {
        await deleteShiftById(shiftId);
      }

      setSelectedShiftIds((prev) =>
        prev.filter((id) => !selectedMonthlyShiftIds.includes(id))
      );

      setMessage(`シフトを${selectedMonthlyShiftIds.length}件削除しました`);

      await fetchData({ showLoading: false });
    } catch (error: any) {
      console.error("シフト一括削除失敗:", error);
      console.error("レスポンス:", error.response?.data);

      setMessage(formatApiError(error, "シフト一括削除に失敗しました"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="owner-shifts-page">
      <OwnerHamburgerMenu />
      <section className="owner-shifts-hero">
        <div>
          <p className="owner-shifts-label">Shift Management</p>
          <h2>シフト管理</h2>
          <p>
            オーナー・管理者・従業員をシフトに登録できます。
            登録したシフトはシフト表、人件費計算、従業員画面にも反映されます。
          </p>
        </div>
      </section>

      <section className="owner-shifts-month-filter">
        <label>
          対象月
          <input
            type="month"
            value={targetMonth}
            onChange={(e) => {
              setTargetMonth(e.target.value);
              setEditingShiftId(null);
            }}
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
          <strong>{sortedMonthlyShifts.length}件</strong>
        </div>

        <div className="owner-shifts-summary-card">
          <span>対象月の総勤務時間</span>
          <strong>{formatDuration(totalMonthlyMinutes)}</strong>
        </div>

        <div className="owner-shifts-summary-card">
          <span>登録スタッフ数</span>
          <strong>{shiftUsers.length}人</strong>
        </div>
      </section>

      <section className="owner-shifts-section">
        <div className="owner-shifts-section-title">
          <div>
            <h3>シフト作成</h3>
            <p>勤務者・勤務日・勤務時間を入力してください。</p>
          </div>
        </div>

        <form className="owner-shifts-form" onSubmit={handleCreateShift}>
          <label>
            勤務者
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

          <button type="submit" disabled={deleting}>
            シフトを作成
          </button>
        </form>

        {message && <p className="owner-shifts-message">{message}</p>}
      </section>

      <section className="owner-shifts-section">
        <div className="owner-shifts-section-title owner-shifts-log-title">
          <div>
            <h3>スタッフ別シフト一覧</h3>
            <p>
              チェックしたシフトは一括削除できます。削除後も画面位置はそのままです。
            </p>
          </div>

          <button
            type="button"
            className="owner-shifts-refresh-button"
            onClick={() => fetchData({ showLoading: true })}
            disabled={deleting}
          >
            再読み込み
          </button>
        </div>

        <div className="owner-shifts-bulk-bar">
          <div>
            <strong>選択中：{selectedMonthlyShiftIds.length}件</strong>
            <span>対象月：{targetMonth}</span>
          </div>

          <div className="owner-shifts-bulk-actions">
            <button
              type="button"
              className="owner-shifts-select-button"
              onClick={selectAllMonthlyShifts}
              disabled={deleting || sortedMonthlyShifts.length === 0}
            >
              対象月を全選択
            </button>

            <button
              type="button"
              className="owner-shifts-clear-button"
              onClick={clearSelectedShifts}
              disabled={deleting || selectedMonthlyShiftIds.length === 0}
            >
              選択解除
            </button>

            <button
              type="button"
              className="owner-shifts-bulk-delete-button"
              onClick={handleBulkDeleteShifts}
              disabled={deleting || selectedMonthlyShiftIds.length === 0}
            >
              {deleting ? "削除中..." : "一括削除"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="owner-shifts-loading">読み込み中...</div>
        ) : employeeMonthlySummaries.length === 0 ? (
          <div className="owner-shifts-empty">
            スタッフがまだ登録されていません。
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
                      <span>
                        {summary.user.email} / {getRoleLabel(summary.user.role)}
                      </span>
                      <h4>{summary.user.name}</h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleEmployeeLog(summary.user.id)}
                      disabled={deleting}
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
                            const isSelected = selectedShiftIds.includes(
                              shift.id
                            );

                            return (
                              <article
                                key={shift.id}
                                className={`owner-shift-log-card ${
                                  isSelected ? "selected" : ""
                                }`}
                              >
                                {isEditing ? (
                                  <>
                                    <div className="owner-shift-card-edit-grid">
                                      <label>
                                        勤務者
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
                                          {shiftUsers.map((user) => (
                                            <option
                                              key={user.id}
                                              value={user.id}
                                            >
                                              {user.name}（
                                              {getRoleLabel(user.role)} /{" "}
                                              {user.email}）
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
                                        disabled={deleting}
                                      >
                                        保存
                                      </button>

                                      <button
                                        type="button"
                                        className="owner-shift-cancel-button"
                                        onClick={handleCancelEditShift}
                                        disabled={deleting}
                                      >
                                        キャンセル
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="owner-shift-log-select-row">
                                      <label>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() =>
                                            toggleShiftSelection(shift.id)
                                          }
                                          disabled={deleting}
                                        />
                                        一括削除に選択
                                      </label>
                                    </div>

                                    <div className="owner-shift-log-header">
                                      <div>
                                        <span>{shift.work_date}</span>
                                        <strong>
                                          {shift.start_time.slice(0, 5)} 〜{" "}
                                          {shift.end_time.slice(0, 5)}
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
                                        disabled={deleting}
                                      >
                                        編集
                                      </button>

                                      <button
                                        type="button"
                                        className="owner-shift-delete-button"
                                        onClick={() => handleDeleteShift(shift)}
                                        disabled={deleting}
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