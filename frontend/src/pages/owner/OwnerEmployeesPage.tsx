import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../api/client";
import "./OwnerEmployeesPage.css";
import OwnerHamburgerMenu from "../../components/OwnerHamburgerMenu";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  hourly_wage: number;
};

type EmployeeForm = {
  employee_number: string;
  name: string;
  role: string;
  hourly_wage: string;
};

const initialEmployeeForm: EmployeeForm = {
  employee_number: "",
  name: "",
  role: "employee",
  hourly_wage: "",
};

function isMaintenanceUser(user: User) {
  return user.email === "9999";
}

function getRoleLabel(user: User) {
  if (isMaintenanceUser(user)) {
    return "メンテナンス";
  }

  if (user.role === "owner") {
    return "オーナー";
  }

  if (user.role === "manager") {
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

export default function OwnerEmployeesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [newEmployee, setNewEmployee] =
    useState<EmployeeForm>(initialEmployeeForm);

  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(
    null
  );

  const [editEmployee, setEditEmployee] =
    useState<EmployeeForm>(initialEmployeeForm);

  const visibleUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (a.email === "9999") {
        return -1;
      }

      if (b.email === "9999") {
        return 1;
      }

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

    if (newEmployee.employee_number.trim() === "9999") {
      setMessage("9999はメンテナンス用のため追加画面では作成できません");
      return;
    }

    try {
      setMessage("");

      await api.post("/users/", {
        name: newEmployee.name.trim(),
        email: newEmployee.employee_number.trim(),
        password: "1234",
        role: newEmployee.role,
        hourly_wage: Number(newEmployee.hourly_wage || 0),
      });

      setMessage("ユーザーを追加しました");

      setNewEmployee(initialEmployeeForm);

      await fetchUsers();
    } catch (error: any) {
      console.error("ユーザー追加失敗:", error);
      console.error("レスポンス:", error.response?.data);

      setMessage(formatApiError(error, "ユーザーの追加に失敗しました"));
    }
  };

  const handleStartEditEmployee = (user: User) => {
    setEditingEmployeeId(user.id);

    setEditEmployee({
      employee_number: user.email,
      name: user.name,
      role: user.role,
      hourly_wage: String(user.hourly_wage),
    });

    setMessage("");
  };

  const handleCancelEditEmployee = () => {
    setEditingEmployeeId(null);
    setEditEmployee(initialEmployeeForm);
  };

  const handleUpdateEmployee = async (user: User) => {
    if (!editEmployee.employee_number.trim()) {
      setMessage("従業員番号を入力してください");
      return;
    }

    if (!editEmployee.name.trim()) {
      setMessage("名前を入力してください");
      return;
    }

    if (isMaintenanceUser(user) && editEmployee.employee_number !== "9999") {
      setMessage("メンテナンス用アカウントの従業員番号は変更できません");
      return;
    }

    if (!isMaintenanceUser(user) && editEmployee.employee_number === "9999") {
      setMessage("9999はメンテナンス用のため使用できません");
      return;
    }

    try {
      setMessage("");

      await api.put(`/users/${user.id}`, {
        name: editEmployee.name.trim(),
        email: isMaintenanceUser(user)
          ? "9999"
          : editEmployee.employee_number.trim(),
        role: isMaintenanceUser(user) ? "owner" : editEmployee.role,
        hourly_wage: Number(editEmployee.hourly_wage || 0),
      });

      setMessage("ユーザー情報を更新しました");

      handleCancelEditEmployee();
      await fetchUsers();
    } catch (error: any) {
      console.error("ユーザー更新失敗:", error);
      console.error("レスポンス:", error.response?.data);

      setMessage(formatApiError(error, "ユーザー情報の更新に失敗しました"));
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (isMaintenanceUser(user)) {
      setMessage("メンテナンス用アカウントは削除できません");
      return;
    }

    if (user.role === "owner") {
      setMessage("オーナーは画面から削除できません");
      return;
    }

    const ok = window.confirm(
      `${user.name}（${user.email}）を削除しますか？\nこのユーザーのシフトや関連データも削除される可能性があります。`
    );

    if (!ok) {
      return;
    }

    try {
      setMessage("");

      await api.delete(`/users/${user.id}`);

      setMessage("ユーザーを削除しました");

      await fetchUsers();
    } catch (error: any) {
      console.error("ユーザー削除失敗:", error);
      console.error("レスポンス:", error.response?.data);

      setMessage(formatApiError(error, "ユーザーの削除に失敗しました"));
    }
  };

  return (
    <div className="owner-employees-page">
      <OwnerHamburgerMenu />
      <section className="owner-employees-hero">
        <div>
          <p className="owner-employees-label">Employees</p>
          <h2>従業員管理</h2>
          <p>
            従業員・管理者・オーナーの確認、時給や権限の変更を行います。
            メンテナンス用アカウントも確認できます。
          </p>
        </div>

        <div className="owner-employees-count-card">
          <span>登録ユーザー</span>
          <strong>{visibleUsers.length}人</strong>
        </div>
      </section>

      <section className="owner-employees-section">
        <div className="owner-section-title-row">
          <div>
            <h3>ユーザー追加</h3>
            <p>従業員番号・名前・権限・時給を入力してください。</p>
          </div>
        </div>

        <form className="owner-employees-form" onSubmit={handleCreateEmployee}>
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
              placeholder="例：001"
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
            権限
            <select
              value={newEmployee.role}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  role: e.target.value,
                })
              }
            >
              <option value="employee">従業員</option>
              <option value="manager">管理者</option>
              <option value="owner">オーナー</option>
            </select>
          </label>

          <label>
            時給
            <input
              type="number"
              value={newEmployee.hourly_wage}
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

          <button type="submit">ユーザーを追加</button>
        </form>

        {message && <p className="owner-employees-message">{message}</p>}
      </section>

      <section className="owner-employees-section">
        <div className="owner-section-title-row">
          <div>
            <h3>ユーザー一覧</h3>
            <p>登録済みのユーザーを確認できます。</p>
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
                  <th>権限</th>
                  <th>時給</th>
                  <th>操作</th>
                </tr>
              </thead>

              <tbody>
                {visibleUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5}>ユーザーがまだ登録されていません</td>
                  </tr>
                ) : (
                  visibleUsers.map((user) => {
                    const isEditing = editingEmployeeId === user.id;
                    const isMaintenance = isMaintenanceUser(user);

                    return (
                      <tr key={user.id}>
                        <td>
                          {isEditing && !isMaintenance ? (
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
                          {isEditing && !isMaintenance ? (
                            <select
                              value={editEmployee.role}
                              onChange={(e) =>
                                setEditEmployee({
                                  ...editEmployee,
                                  role: e.target.value,
                                })
                              }
                            >
                              <option value="employee">従業員</option>
                              <option value="manager">管理者</option>
                              <option value="owner">オーナー</option>
                            </select>
                          ) : (
                            getRoleLabel(user)
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
                            `${Number(user.hourly_wage || 0).toLocaleString()}円`
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <div className="owner-table-actions">
                              <button
                                type="button"
                                className="owner-table-save-button"
                                onClick={() => handleUpdateEmployee(user)}
                              >
                                保存
                              </button>

                              <button
                                type="button"
                                className="owner-table-cancel-button"
                                onClick={handleCancelEditEmployee}
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

                              {!isMaintenance && user.role !== "owner" && (
                                <button
                                  type="button"
                                  className="owner-table-delete-button"
                                  onClick={() => handleDeleteUser(user)}
                                >
                                  削除
                                </button>
                              )}
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