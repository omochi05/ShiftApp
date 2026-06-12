import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../api/client";
import "./OwnerEmployeesPage.css";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  hourly_wage: number;
};

type NewEmployee = {
  employee_number: string;
  name: string;
  hourly_wage: string;
};

type EditEmployeeForm = {
  employee_number: string;
  name: string;
  hourly_wage: string;
};

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

export default function OwnerEmployeesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const [newEmployee, setNewEmployee] = useState<NewEmployee>({
    employee_number: "",
    name: "",
    hourly_wage: "",
  });

  /**
   * 編集中の従業員ID
   * null のときは誰も編集中ではない
   */
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(
    null
  );

  /**
   * 従業員IDごとに編集内容を保持する
   * これで2番目以降の保存も正しくその人の内容を使える
   */
  const [editingEmployees, setEditingEmployees] = useState<
    Record<number, EditEmployeeForm>
  >({});

  const employeeUsers = useMemo(() => {
    return users.filter((user) => user.role === "employee");
  }, [users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setMessage("");

      const res = await api.get<User[]>("/users/");
      setUsers(res.data);
    } catch (error) {
      console.error("従業員取得失敗:", error);
      setMessage("従業員情報の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateEmployee = async (e: FormEvent) => {
    e.preventDefault();

    if (!newEmployee.employee_number.trim()) {
      setMessage("従業員番号を入力してください");
      return;
    }

    if (!newEmployee.name.trim()) {
      setMessage("名前を入力してください");
      return;
    }

    try {
      setMessage("");

      await api.post("/users/", {
        name: newEmployee.name.trim(),
        email: newEmployee.employee_number.trim(),
        password: "unused",
        role: "employee",
        hourly_wage: Number(newEmployee.hourly_wage || 0),
      });

      setMessage("従業員を追加しました");

      setNewEmployee({
        employee_number: "",
        name: "",
        hourly_wage: "",
      });

      await fetchUsers();
    } catch (error: any) {
      console.error("従業員追加失敗:", error);
      console.error("レスポンス:", error.response?.data);

      setMessage(formatApiError(error, "従業員の追加に失敗しました"));
    }
  };

  const handleStartEditEmployee = (user: User) => {
    setEditingEmployeeId(user.id);

    setEditingEmployees((prev) => ({
      ...prev,
      [user.id]: {
        employee_number: user.email ?? "",
        name: user.name ?? "",
        hourly_wage: String(user.hourly_wage ?? 0),
      },
    }));

    setMessage("");
  };

  const handleChangeEditEmployee = (
    userId: number,
    field: keyof EditEmployeeForm,
    value: string
  ) => {
    setEditingEmployees((prev) => {
      const current = prev[userId] ?? {
        employee_number: "",
        name: "",
        hourly_wage: "",
      };

      return {
        ...prev,
        [userId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const handleCancelEditEmployee = (userId: number) => {
    setEditingEmployeeId(null);

    setEditingEmployees((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });

    setMessage("");
  };

const handleUpdateEmployee = async (userId: number) => {
    const form = editingEmployees[userId];

    if (!form) {
        setMessage("編集データが見つかりません");
        return;
    }

    if (!form.employee_number.trim()) {
        setMessage("従業員番号を入力してください");
        return;
    }

    if (!form.name.trim()) {
        setMessage("名前を入力してください");
        return;
    }

    const updatedEmployee = {
        name: form.name.trim(),
        email: form.employee_number.trim(),
        role: "employee",
        hourly_wage: Number(form.hourly_wage || 0),
    };

    try {
        setSavingUserId(userId);
        setMessage("");

        await api.put(`/users/${userId}`, updatedEmployee);

        /**
         * 保存成功後、画面上の一覧もすぐ更新する
         */
        setUsers((prev) =>
        prev.map((user) =>
            user.id === userId
            ? {
                ...user,
                name: updatedEmployee.name,
                email: updatedEmployee.email,
                role: updatedEmployee.role,
                hourly_wage: updatedEmployee.hourly_wage,
                }
            : user
        )
        );

        /**
         * 編集モードを解除する
         */
        setEditingEmployeeId(null);

        setEditingEmployees((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
        });

        setMessage("従業員情報を更新しました");

        /**
         * DBの最新状態も取り直す
         */
        await fetchUsers();
    } catch (error: any) {
        console.error("従業員更新失敗:", error);
        console.error("レスポンス:", error.response?.data);

        setMessage(formatApiError(error, "従業員情報の更新に失敗しました"));
    } finally {
        setSavingUserId(null);
    }
    };
    const handleDeleteUser = async (userId: number) => {
        const targetUser = users.find((user) => user.id === userId);

        if (!targetUser) {
        setMessage("削除対象の従業員が見つかりません");
        return;
        }

        const ok = window.confirm(
        `${targetUser.name}（${targetUser.email}）を削除しますか？\nこの従業員のシフトや関連データも削除される可能性があります。`
        );

        if (!ok) {
        return;
        }

        try {
        setMessage("");

        await api.delete(`/users/${userId}`);

        setMessage("従業員を削除しました");

        if (editingEmployeeId === userId) {
            setEditingEmployeeId(null);
        }

        setEditingEmployees((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
        });

        await fetchUsers();
        } catch (error: any) {
        console.error("従業員削除失敗:", error);
        console.error("レスポンス:", error.response?.data);

        setMessage(formatApiError(error, "従業員の削除に失敗しました"));
        }
    };

  return (
    <div className="owner-employees-page">
      <section className="owner-employees-hero">
        <div>
          <p className="owner-employees-label">Employees</p>
          <h2>従業員管理</h2>
          <p>
            従業員の追加・編集・削除、時給の変更を行います。
            シフト作成や人件費計算に使われる大事な情報です。
          </p>
        </div>

        <div className="owner-employees-count-card">
          <span>登録従業員</span>
          <strong>{employeeUsers.length}人</strong>
        </div>
      </section>

      <section className="owner-employees-section">
        <div className="owner-section-title-row">
          <div>
            <h3>従業員追加</h3>
            <p>従業員番号・名前・時給を入力してください。</p>
          </div>
        </div>

        <form className="owner-employees-form" onSubmit={handleCreateEmployee}>
          <label>
            従業員番号
            <input
              type="text"
              value={newEmployee.employee_number}
              onChange={(e) =>
                setNewEmployee((prev) => ({
                  ...prev,
                  employee_number: e.target.value,
                }))
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
                setNewEmployee((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
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
              onChange={(e) =>
                setNewEmployee((prev) => ({
                  ...prev,
                  hourly_wage: e.target.value,
                }))
              }
              min="0"
              placeholder="例：1200"
              required
            />
          </label>

          <button type="submit">従業員を追加</button>
        </form>

        {message && <p className="owner-employees-message">{message}</p>}
      </section>

      <section className="owner-employees-section">
        <div className="owner-section-title-row">
          <div>
            <h3>従業員一覧</h3>
            <p>登録済みの従業員を確認できます。</p>
          </div>

          <button
            type="button"
            className="owner-employees-refresh-button"
            onClick={fetchUsers}
          >
            再読み込み
          </button>
        </div>

        {loading ? (
          <div className="owner-employees-loading">読み込み中...</div>
        ) : (
          <div className="owner-employees-table-wrap">
            <table className="owner-employees-table">
              <thead>
                <tr>
                  <th>従業員番号</th>
                  <th>名前</th>
                  <th>時給</th>
                  <th>操作</th>
                </tr>
              </thead>

              <tbody>
                {employeeUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4}>従業員がまだ登録されていません</td>
                  </tr>
                ) : (
                  employeeUsers.map((user) => {
                    const isEditing = editingEmployeeId === user.id;

                    const editForm = editingEmployees[user.id] ?? {
                      employee_number: user.email ?? "",
                      name: user.name ?? "",
                      hourly_wage: String(user.hourly_wage ?? 0),
                    };

                    return (
                      <tr key={user.id}>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.employee_number}
                              onChange={(e) =>
                                handleChangeEditEmployee(
                                  user.id,
                                  "employee_number",
                                  e.target.value
                                )
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
                              value={editForm.name}
                              onChange={(e) =>
                                handleChangeEditEmployee(
                                  user.id,
                                  "name",
                                  e.target.value
                                )
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
                              value={editForm.hourly_wage}
                              onChange={(e) =>
                                handleChangeEditEmployee(
                                  user.id,
                                  "hourly_wage",
                                  e.target.value
                                )
                              }
                              min="0"
                            />
                          ) : (
                            `${Number(user.hourly_wage || 0).toLocaleString()}円`
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <div className="owner-table-actions">
                              <button
                                type="button"
                                className="owner-table-save-button"
                                onClick={() => handleUpdateEmployee(user.id)}
                                disabled={savingUserId === user.id}
                              >
                                {savingUserId === user.id ? "保存中..." : "保存"}
                              </button>

                              <button
                                type="button"
                                className="owner-table-cancel-button"
                                onClick={() => handleCancelEditEmployee(user.id)}
                                disabled={savingUserId === user.id}
                              >
                                キャンセル
                              </button>
                            </div>
                          ) : (
                            <div className="owner-table-actions">
                              <button
                                type="button"
                                className="owner-table-edit-button"
                                onClick={() => handleStartEditEmployee(user)}
                              >
                                編集
                              </button>

                              <button
                                type="button"
                                className="owner-table-delete-button"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                削除
                              </button>
                            </div>
                          )}
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