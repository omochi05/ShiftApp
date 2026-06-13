import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import "./ManagerDashboard.css";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  hourly_wage: number;
};

function getRoleLabel(role: string) {
  if (role === "owner") {
    return "オーナー";
  }

  if (role === "manager") {
    return "管理者";
  }

  return "従業員";
}

export default function ManagerDashboard() {
  const navigate = useNavigate();

  const loginName = localStorage.getItem("loginName") || "管理者";
  const employeeNumber = localStorage.getItem("employeeNumber") || "-";

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [message, setMessage] = useState("");

  const roleUsers = useMemo(() => {
    return users
      .filter((user) => user.role === "owner" || user.role === "manager")
      .sort((a, b) => {
        if (a.role !== b.role) {
          return a.role === "owner" ? -1 : 1;
        }

        return a.id - b.id;
      });
  }, [users]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setMessage("");

      const res = await api.get<User[]>("/users/");
      setUsers(res.data);
    } catch (error: any) {
      console.error("権限ユーザー取得失敗:", error);
      setMessage(
        error.response?.data?.detail || "権限ユーザーの取得に失敗しました"
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("loginUserId");
    localStorage.removeItem("loginName");
    localStorage.removeItem("loginRole");
    localStorage.removeItem("employeeNumber");

    localStorage.removeItem("ownerLogin");
    localStorage.removeItem("ownerId");
    localStorage.removeItem("ownerName");
    localStorage.removeItem("ownerNumber");

    navigate("/");
  };

  return (
    <div className="manager-page">
      <header className="manager-header">
        <div>
          <p className="manager-label">MANAGER DASHBOARD</p>
          <h1>管理者画面</h1>
          <span>
            管理者はシフト管理・シフト表・従業員確認を行えます。
            売上管理はオーナー専用です。
          </span>
        </div>

        <div className="manager-user-card">
          <span>ログイン中</span>
          <strong>{loginName}</strong>
          <small>従業員番号：{employeeNumber}</small>
        </div>
      </header>

      <section className="manager-menu-grid">
        <button
          type="button"
          className="manager-menu-card manager-green"
          onClick={() => navigate("/owner/shifts")}
        >
          <span>SHIFT</span>
          <strong>シフト管理</strong>
          <small>オーナーと同じシフトデータを作成・編集できます</small>
        </button>

        <button
          type="button"
          className="manager-menu-card manager-purple"
          onClick={() => navigate("/owner/timeline")}
        >
          <span>TABLE</span>
          <strong>シフト表</strong>
          <small>オーナーと同じ週シフト表を確認できます</small>
        </button>

        <button
          type="button"
          className="manager-menu-card manager-cyan"
          onClick={() => navigate("/owner/employees")}
        >
          <span>STAFF</span>
          <strong>従業員一覧</strong>
          <small>従業員・管理者・オーナーを確認できます</small>
        </button>

        <button
          type="button"
          className="manager-menu-card manager-gray"
          onClick={() => navigate("/owner/print/shifts")}
        >
          <span>PRINT</span>
          <strong>印刷ページ</strong>
          <small>シフト表を印刷・PDF保存できます</small>
        </button>

        <button
          type="button"
          className="manager-menu-card manager-red"
          onClick={() => navigate("/change-password")}
        >
          <span>SECURITY</span>
          <strong>パスワード変更</strong>
          <small>4桁パスワードを変更できます</small>
        </button>

        <button
          type="button"
          className="manager-menu-card manager-dark"
          onClick={handleLogout}
        >
          <span>LOGOUT</span>
          <strong>ログアウト</strong>
          <small>ログイン画面に戻ります</small>
        </button>
      </section>

      <section className="manager-role-section">
        <div className="manager-role-title">
          <div>
            <p>ROLE USERS</p>
            <h2>オーナー・管理者一覧</h2>
            <span>
              現在登録されているオーナーロール・管理者ロールのユーザーを確認できます。
            </span>
          </div>

          <button type="button" onClick={fetchUsers}>
            再読み込み
          </button>
        </div>

        {message && <p className="manager-role-message">{message}</p>}

        {loadingUsers ? (
          <div className="manager-role-loading">読み込み中...</div>
        ) : roleUsers.length === 0 ? (
          <div className="manager-role-empty">
            オーナー・管理者が登録されていません。
          </div>
        ) : (
          <div className="manager-role-table-wrap">
            <table className="manager-role-table">
              <thead>
                <tr>
                  <th>従業員番号</th>
                  <th>名前</th>
                  <th>権限</th>
                  <th>時給</th>
                </tr>
              </thead>

              <tbody>
                {roleUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.name}</td>
                    <td>
                      <span
                        className={`manager-role-badge manager-role-${user.role}`}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td>{Number(user.hourly_wage || 0).toLocaleString()}円</td>
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