import { Link, useNavigate } from "react-router-dom";
import OwnerHamburgerMenu from "../components/OwnerHamburgerMenu";
import "./ManagerDashboard.css";

const managerCards = [
  {
    title: "シフト管理",
    label: "SHIFT",
    description: "従業員のシフトを作成・編集できます。",
    to: "/manager/shifts",
    color: "green",
  },
  {
    title: "シフト表",
    label: "TABLE",
    description: "週ごとのシフト表を確認できます。",
    to: "/manager/timeline",
    color: "purple",
  },
  {
    title: "従業員一覧",
    label: "STAFF",
    description: "従業員・管理者・オーナーを確認できます。",
    to: "/manager/employees",
    color: "cyan",
  },
  {
    title: "印刷ページ",
    label: "PRINT",
    description: "シフト表を印刷・PDF保存できます。",
    to: "/manager/print/shifts",
    color: "gray",
  },
  {
    title: "パスワード変更",
    label: "SECURITY",
    description: "ログインパスワードを変更できます。",
    to: "/manager/change-password",
    color: "red",
  },
];

export default function ManagerDashboard() {
  const navigate = useNavigate();

  const managerName =
    localStorage.getItem("loginName") ||
    localStorage.getItem("ownerName") ||
    "管理者";

  const employeeNumber = localStorage.getItem("employeeNumber") || "-";

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();

    navigate("/");
  };

  return (
    <main className="manager-page">
      <OwnerHamburgerMenu />

      <section className="manager-hero">
        <div>
          <p className="manager-label">MANAGER DASHBOARD</p>
          <h1>管理者画面</h1>
          <p>
            管理者はシフト管理・シフト表・従業員確認を行えます。
            売上管理はオーナー専用です。
          </p>
        </div>

        <div className="manager-user-card">
          <span>ログイン中</span>
          <strong>{managerName}</strong>
          <small>従業員番号：{employeeNumber}</small>
        </div>
      </section>

      <section className="manager-menu-grid">
        {managerCards.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className={`manager-menu-card manager-menu-card-${card.color}`}
          >
            <div className="manager-menu-card-top">
              <span>{card.label}</span>
              <strong>→</strong>
            </div>

            <h2>{card.title}</h2>
            <p>{card.description}</p>
          </Link>
        ))}

        <button
          type="button"
          className="manager-menu-card manager-menu-card-dark"
          onClick={handleLogout}
        >
          <div className="manager-menu-card-top">
            <span>LOGOUT</span>
            <strong>→</strong>
          </div>

          <h2>ログアウト</h2>
          <p>ログイン画面に戻ります。</p>
        </button>
      </section>
    </main>
  );
}