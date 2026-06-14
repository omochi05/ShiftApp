import { Link, useNavigate } from "react-router-dom";
import "./OwnerDashboardHome.css";

const menuCards = [
  {
    title: "シフト管理",
    label: "SHIFT",
    description: "従業員のシフトを作成・編集・削除します。",
    to: "/owner/shifts",
    color: "green",
  },
  {
    title: "シフト表",
    label: "TABLE",
    description: "週ごとのシフト表を確認します。",
    to: "/owner/timeline",
    color: "purple",
  },
  {
    title: "売上管理",
    label: "SALES",
    description: "日別売上を登録し、人件費率を確認します。",
    to: "/owner/sales",
    color: "orange",
  },
  {
    title: "従業員管理",
    label: "STAFF",
    description: "従業員の追加・編集・削除を行います。",
    to: "/owner/employees",
    color: "cyan",
  },
  {
    title: "印刷",
    label: "PRINT",
    description: "A3横のシフト表を印刷・PDF保存します。",
    to: "/owner/print/shifts",
    color: "gray",
  },
  {
    title: "パスワード変更",
    label: "SECURITY",
    description: "ログインパスワードを変更できます。",
    to: "/change-password",
    color: "red",
  },
];

export default function OwnerDashboardHome() {
  const navigate = useNavigate();

  const ownerName =
    localStorage.getItem("ownerName") ||
    localStorage.getItem("loginName") ||
    "オーナー";

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
  };

  return (
    <main className="owner-home">
      <header className="owner-menu-bar">
        <Link to="/owner/ownerdashboard">管理メニュー</Link>
        <Link to="/owner/shifts">シフト管理</Link>
        <Link to="/owner/timeline">シフト表</Link>
        <Link to="/owner/sales">売上管理</Link>
        <Link to="/owner/employees">従業員管理</Link>
        <Link to="/owner/print/shifts">印刷</Link>
        <Link to="/change-password">パスワード変更</Link>

        <button type="button" onClick={handleLogout}>
          ログアウト
        </button>
      </header>

      <section className="owner-home-hero">
        <p className="owner-home-label">OWNER DASHBOARD</p>
        <h1>管理メニュー</h1>
        <p>
          {ownerName}さん、使用したい機能を選択してください。
          売上・シフト・従業員管理をページごとに分けています。
        </p>
      </section>

      <section className="owner-home-grid">
        {menuCards.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className={`owner-home-card owner-home-card-${card.color}`}
          >
            <div className="owner-home-card-top">
              <span>{card.label}</span>
              <strong>→</strong>
            </div>

            <h2>{card.title}</h2>
            <p>{card.description}</p>
          </Link>
        ))}

        <button
          type="button"
          className="owner-home-card owner-home-card-dark"
          onClick={handleLogout}
        >
          <div className="owner-home-card-top">
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