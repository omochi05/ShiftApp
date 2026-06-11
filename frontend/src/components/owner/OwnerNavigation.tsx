import { NavLink, useNavigate } from "react-router-dom";
import "./OwnerNavigation.css";

type OwnerNavigationProps = {
  onCloseMenu?: () => void;
};

const ownerLinks = [
  {
    to: "/owner",
    label: "ダッシュボード",
    end: true,
  },
  {
    to: "/owner/shifts",
    label: "シフト管理",
  },
  {
    to: "/owner/timeline",
    label: "シフト表",
  },
  {
    to: "/owner/sales",
    label: "売上管理",
  },
  {
    to: "/owner/employees",
    label: "従業員管理",
  },
  {
    to: "/owner/templates",
    label: "固定シフト",
  },
  {
    to: "/owner/print/shifts",
    label: "印刷",
  },
];

export default function OwnerNavigation({ onCloseMenu }: OwnerNavigationProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("ownerLogin");
    localStorage.removeItem("ownerId");
    localStorage.removeItem("ownerName");
    localStorage.removeItem("ownerNumber");

    navigate("/");
  };

  return (
    <nav className="owner-navigation">
      <div className="owner-navigation-title">
        <strong>ShiftApp</strong>
        <span>オーナー管理</span>
      </div>

      <div className="owner-navigation-links">
        {ownerLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              isActive ? "owner-nav-link active" : "owner-nav-link"
            }
            onClick={onCloseMenu}
          >
            {link.label}
          </NavLink>
        ))}
      </div>

      <button
        type="button"
        className="owner-nav-logout"
        onClick={handleLogout}
      >
        ログアウト
      </button>
    </nav>
  );
}