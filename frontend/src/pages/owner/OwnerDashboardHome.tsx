import { Link } from "react-router-dom";
import "./OwnerDashboardHome.css";

const menuCards = [
  {
    title: "シフト管理",
    description: "従業員のシフトを作成・編集・削除します。",
    to: "/owner/shifts",
    color: "green",
  },
  {
    title: "シフト表",
    description: "週ごとのシフト表を確認します。",
    to: "/owner/timeline",
    color: "purple",
  },
  {
    title: "売上管理",
    description: "日別売上を登録し、人件費率を確認します。",
    to: "/owner/sales",
    color: "orange",
  },
  {
    title: "従業員管理",
    description: "従業員の追加・編集・削除を行います。",
    to: "/owner/employees",
    color: "cyan",
  },
  {
    title: "固定シフト",
    description: "週シフトをテンプレート化して反映します。",
    to: "/owner/templates",
    color: "pink",
  },
  {
    title: "印刷",
    description: "A3横のシフト表を印刷・PDF保存します。",
    to: "/owner/print/shifts",
    color: "gray",
  },
];

export default function OwnerDashboardHome() {
  const ownerName = localStorage.getItem("ownerName") || "オーナー";

  return (
    <div className="owner-home">
      <section className="owner-home-hero">
        <div>
          <p className="owner-home-label">Owner Dashboard</p>
          <h2>管理メニュー</h2>
          <p>
            {ownerName}さん、使用したい機能を選択してください。
            売上・シフト・従業員管理をページごとに分けています。
          </p>
        </div>
      </section>

      <section className="owner-home-grid">
        {menuCards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className={`owner-home-card owner-home-card-${card.color}`}
          >
            <div className="owner-home-card-top">
              <span>{card.title}</span>
              <strong>→</strong>
            </div>

            <p>{card.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}