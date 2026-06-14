import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./OwnerHamburgerMenu.css";

export default function OwnerHamburgerMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const loginRole = localStorage.getItem("loginRole");
  const employeeNumber = localStorage.getItem("employeeNumber");

  const isOwner = loginRole === "owner" || employeeNumber === "9999";
  const isManager = loginRole === "manager";

  const isOwnerOrManager = isOwner || isManager;

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
  };

  if (!isOwnerOrManager) {
    return null;
  }

  const homePath = isOwner ? "/owner" : "/manager";
  const shiftPath = isOwner ? "/owner/shifts" : "/manager/shifts";
  const timelinePath = isOwner ? "/owner/timeline" : "/manager/timeline";
  const employeesPath = isOwner ? "/owner/employees" : "/manager/employees";
  const printPath = isOwner ? "/owner/print/shifts" : "/manager/print/shifts";
  const passwordPath = isOwner
    ? "/owner/change-password"
    : "/manager/change-password";

  return (
    <>
      <header className="owner-hamburger-header">
        <Link to={homePath} className="owner-hamburger-logo">
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

        <Link to={homePath} onClick={() => setOpen(false)}>
          管理メニュー
        </Link>

        <Link to={shiftPath} onClick={() => setOpen(false)}>
          シフト管理
        </Link>

        <Link to={timelinePath} onClick={() => setOpen(false)}>
          シフト表
        </Link>

        {isOwner && (
          <Link to="/owner/sales" onClick={() => setOpen(false)}>
            売上管理
          </Link>
        )}

        <Link to={employeesPath} onClick={() => setOpen(false)}>
          従業員管理
        </Link>

        <Link to={printPath} onClick={() => setOpen(false)}>
          印刷
        </Link>

        <Link to={passwordPath} onClick={() => setOpen(false)}>
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