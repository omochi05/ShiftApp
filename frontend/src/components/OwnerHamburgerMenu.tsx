import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./OwnerHamburgerMenu.css";

export default function OwnerHamburgerMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const loginRole = localStorage.getItem("loginRole");
  const employeeNumber = localStorage.getItem("employeeNumber");

  const isOwnerOrManager =
    loginRole === "owner" || loginRole === "manager" || employeeNumber === "9999";

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
  };

  if (!isOwnerOrManager) {
    return null;
  }

  return (
    <>
      <header className="owner-hamburger-header">
        <Link to="/owner/ownerdashboard" className="owner-hamburger-logo">
          SevenShift Manager
        </Link>

        <button
          type="button"
          className={`owner-hamburger-button ${open ? "is-open" : ""}`}
          onClick={() => setOpen((current) => !current)}
          aria-label="メニューを開閉"
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {open && (
        <div
          className="owner-hamburger-backdrop"
          onClick={() => setOpen(false)}
        />
      )}

      <nav className={`owner-hamburger-menu ${open ? "is-open" : ""}`}>
        <div className="owner-hamburger-menu-head">
          <strong>管理メニュー</strong>

          <button type="button" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>

        <Link to="/owner/ownerdashboard" onClick={() => setOpen(false)}>
          管理メニュー
        </Link>

        <Link to="/owner/shifts" onClick={() => setOpen(false)}>
          シフト管理
        </Link>

        <Link to="/owner/timeline" onClick={() => setOpen(false)}>
          シフト表
        </Link>

        <Link to="/owner/sales" onClick={() => setOpen(false)}>
          売上管理
        </Link>

        <Link to="/owner/employees" onClick={() => setOpen(false)}>
          従業員管理
        </Link>

        <Link to="/owner/print/shifts" onClick={() => setOpen(false)}>
          印刷
        </Link>

        <Link to="/change-password" onClick={() => setOpen(false)}>
          パスワード変更
        </Link>

        <button
          type="button"
          className="owner-hamburger-logout"
          onClick={handleLogout}
        >
          ログアウト
        </button>
      </nav>
    </>
  );
}