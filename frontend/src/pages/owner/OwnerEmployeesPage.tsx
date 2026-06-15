import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { api } from "../../api/client";
import OwnerHamburgerMenu from "../../components/OwnerHamburgerMenu";
import "./OwnerEmployeesPage.css";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  hourly_wage?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
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

function getEmployeeNumberValue(user: User) {
  const value = Number(user.email);

  if (Number.isNaN(value)) {
    return 999999;
  }

  return value;
}

function sortUsersByEmployeeNumber(users: User[]) {
  return [...users].sort((a, b) => {
    const aNumber = getEmployeeNumberValue(a);
    const bNumber = getEmployeeNumberValue(b);

    if (aNumber !== bNumber) {
      return aNumber - bNumber;
    }

    return a.id - b.id;
  });
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
  const loginRole = localStorage.getItem("loginRole");
  const employeeNumber = localStorage.getItem("employeeNumber");

  const canViewWage = loginRole === "owner" || employeeNumber === "9999";
  const canCreateOwner = loginRole === "owner" || employeeNumber === "9999";

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
    return sortUsersByEmployeeNumber(users);
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

    if (!canCreateOwner && newEmployee.role === "owner") {
      setMessage("管理者はオーナーを作成できません");
      return;
    }

    try {
      setMessage("");

      await api.post("/users/", {
        name: newEmployee.name.trim(),
        email: newEmployee.employee_number.trim(),
        password: "1234",
        role: newEmployee.role,
        hourly_wage: canViewWage ? Number(newEmployee.hourly_wage || 0) : 0,
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
      hourly_wage: String(user.hourly_wage ?? ""),
    });

    setMessage("");
  };

  const handleCancelEditEmployee = () => {
    setEditingEmployeeId(null);
    setEditEmployee(initialEmployeeForm);
  };

  const handleUpdateEmployee = async (userId: number) => {
    if (!editEmployee.employee_number.trim()) {
      setMessage("従業員番号を入力してください");
      return;
    }

    if (!editEmployee.name.trim()) {
      setMessage("名前を入力してください");
      return;
    }

    const targetUser = users.find((user) => user.id === userId);

    if (!targetUser) {
      setMessage("更新対象のユーザーが見つかりません");
      return;
    }

    if (isMaintenanceUser(targetUser)) {
      setMessage("メンテナンス用アカウントはこの画面では編集できません");
      return;
    }

    if (editEmployee.employee_number.trim() === "9999") {
      setMessage("9999はメンテナンス用のため使用できません");
      return;
    }

    if (!canCreateOwner && editEmployee.role === "owner") {
      setMessage("管理者はオーナー権限を付与できません");
      return;
    }

    try {
      setMessage("");

      await api.put(`/users/${userId}`, {
        name: editEmployee.name.trim(),
        email: editEmployee.employee_number.trim(),
        role: editEmployee.role,
        hourly_wage: canViewWage
          ? Number(editEmployee.hourly_wage || 0)
          : Number(targetUser.hourly_wage || 0),
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

  const handleDeleteUser = async (userId: number) => {
    const targetUser = users.find((user) => user.id === userId);

    if (!targetUser) {
      setMessage("削除対象のユーザーが見つかりません");
      return;
    }

    if (isMaintenanceUser(targetUser)) {
      setMessage("メンテナンス用アカウントは削除できません");
      return;
    }

    const ok = window.confirm(
      `${targetUser.name}（${targetUser.email}）を削除しますか？\nこのユーザーのシフトや関連データも削除される可能性があります。`
    );

    if (!ok) {
      return;
    }

    try {
      setMessage("");

      await api.delete(`/users/${userId}`);

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
            一覧は従業員番号が小さい順に表示されます。
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
            <p>従業員番号・名前・権限を入力してください。</p>
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
              {canCreateOwner && <option value="owner">オーナー</option>}
            </select>
          </label>

          {canViewWage && (
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
              />
            </label>
          )}

          <button type="submit">ユーザーを追加</button>
        </form>

        {message && <p className="owner-employees-message">{message}</p>}
      </section>

      <section className="owner-employees-section">
        <div className="owner-section-title-row">
          <div>
            <h3>ユーザー一覧</h3>
            <p>登録済みのユーザーを従業員番号の小さい順に表示します。</p>
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
        ) : visibleUsers.length === 0 ? (
          <div className="owner-employees-empty">
            登録済みユーザーがいません。
          </div>
        ) : (
          <div className="owner-employees-table-wrap">
            <table className="owner-employees-table">
              <thead>
                <tr>
                  <th>従業員番号</th>
                  <th>名前</th>
                  <th>権限</th>
                  {canViewWage && <th>時給</th>}
                  <th>操作</th>
                </tr>
              </thead>

              <tbody>
                {visibleUsers.map((user) => {
                  const isEditing = editingEmployeeId === user.id;
                  const maintenance = isMaintenanceUser(user);

                  return (
                    <tr key={user.id}>
                      <td>
                        {isEditing && !maintenance ? (
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
                        {isEditing && !maintenance ? (
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
                        {isEditing && !maintenance ? (
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
                            {canCreateOwner && (
                              <option value="owner">オーナー</option>
                            )}
                          </select>
                        ) : (
                          getRoleLabel(user)
                        )}
                      </td>

                      {canViewWage && (
                        <td>
                          {isEditing && !maintenance ? (
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
                      )}

                      <td>
                        {maintenance ? (
                          <span className="owner-employees-locked">
                            保護中
                          </span>
                        ) : isEditing ? (
                          <div className="owner-employees-actions">
                            <button
                              type="button"
                              onClick={() => handleUpdateEmployee(user.id)}
                            >
                              保存
                            </button>
                            <button
                              type="button"
                              className="owner-employees-secondary-button"
                              onClick={handleCancelEditEmployee}
                            >
                              キャンセル
                            </button>
                          </div>
                        ) : (
                          <div className="owner-employees-actions">
                            <button
                              type="button"
                              onClick={() => handleStartEditEmployee(user)}
                            >
                              編集
                            </button>
                            <button
                              type="button"
                              className="owner-employees-danger-button"
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
        )}
      </section>
    </div>
  );
}