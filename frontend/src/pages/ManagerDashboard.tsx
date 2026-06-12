import { useNavigate } from "react-router-dom";
import "./ManagerDashboard.css";

export default function ManagerDashboard() {
  const navigate = useNavigate();

  const loginName = localStorage.getItem("loginName") || "管理者";
  const employeeNumber = localStorage.getItem("employeeNumber") || "-";

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
          <small>従業員・管理者の情報を確認できます</small>
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
    </div>
  );
}