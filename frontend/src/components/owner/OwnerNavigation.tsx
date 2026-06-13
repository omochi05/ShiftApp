import { NavLink, useNavigate } from "react-router-dom";
import "./OwnerNavigation.css";

type OwnerNavigationProps = {
  onCloseMenu?: () => void;
};

type OwnerLink = {
  to: string;
  label: string;
  description: string;
  color: string;
  end?: boolean;
  ownerOnly?: boolean;
  maintenanceOnly?: boolean;
};

const ownerLinks: OwnerLink[] = [
  {
    to: "/owner",
    label: "ダッシュボード",
    description: "全体確認",
    color: "blue",
    end: true,
  },
  {
    to: "/owner/shifts",
    label: "シフト管理",
    description: "作成・編集",
    color: "green",
  },
  {
    to: "/owner/timeline",
    label: "シフト表",
    description: "週シフト確認",
    color: "purple",
  },
  {
    to: "/owner/sales",
    label: "売上管理",
    description: "売上・人件費率",
    color: "orange",
    ownerOnly: true,
  },
  {
    to: "/owner/employees",
    label: "従業員管理",
    description: "追加・編集",
    color: "cyan",
  },
  {
    to: "/owner/print/shifts",
    label: "印刷",
    description: "PDF・印刷",
    color: "gray",
  },
  {
    to: "/manager",
    label: "管理者画面",
    description: "メンテナンス確認",
    color: "blue",
    maintenanceOnly: true,
  },
  {
    to: "/employee",
    label: "従業員画面",
    description: "メンテナンス確認",
    color: "green",
    maintenanceOnly: true,
  },
  {
    to: "/change-password",
    label: "パスワード変更",
    description: "4桁パスワード",
    color: "red",
  },
];

export default function OwnerNavigation({ onCloseMenu }: OwnerNavigationProps) {
  const navigate = useNavigate();

  const loginRole = localStorage.getItem("loginRole");
  const employeeNumber = localStorage.getItem("employeeNumber");
  const isMaintenance = employeeNumber === "9999";

  const visibleLinks = ownerLinks.filter((link) => {
    if (link.maintenanceOnly && !isMaintenance) {
      return false;
    }

    if (link.ownerOnly && loginRole !== "owner" && !isMaintenance) {
      return false;
    }

    return true;
  });

  const handleLogout = () => {
    localStorage.removeItem("loginUserId");
    localStorage.removeItem("loginName");
    localStorage.removeItem("loginRole");
    localStorage.removeItem("employeeNumber");

    localStorage.removeItem("ownerLogin");
    localStorage.removeItem("ownerId");
    localStorage.removeItem("ownerName");
    localStorage.removeItem("ownerNumber");

    if (onCloseMenu) {
      onCloseMenu();
    }

    navigate("/");
  };

  return (
    <nav className="owner-navigation">
      <div className="owner-navigation-title">
        <strong>ShiftApp</strong>
        <span>
          {isMaintenance
            ? "メンテナンス"
            : loginRole === "manager"
            ? "管理者メニュー"
            : "オーナー管理"}
        </span>
      </div>

      <div className="owner-navigation-links">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `owner-nav-link owner-nav-${link.color} ${
                isActive ? "active" : ""
              }`
            }
            onClick={onCloseMenu}
          >
            <span className="owner-nav-dot" />
            <span className="owner-nav-text">
              <strong>{link.label}</strong>
              <small>{link.description}</small>
            </span>
          </NavLink>
        ))}
      </div>

      <button type="button" className="owner-nav-logout" onClick={handleLogout}>
        ログアウト
      </button>
    </nav>
  );
}