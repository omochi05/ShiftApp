import { useState } from "react";
import { Outlet } from "react-router-dom";
import OwnerNavigation from "../../components/owner/OwnerNavigation";
import "./OwnerLayout.css";

export default function OwnerLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const ownerName = localStorage.getItem("ownerName") || "オーナー";

  return (
    <div className="owner-layout">
      <aside className="owner-layout-sidebar">
        <OwnerNavigation />
      </aside>

      <div className="owner-layout-main">
        <header className="owner-layout-header">
          <div>
            <h1>オーナー管理画面</h1>
            <p>作成者：{ownerName}</p>
          </div>

          <button
            type="button"
            className="owner-layout-menu-button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            {isMenuOpen ? "閉じる" : "メニュー"}
          </button>
        </header>

        {isMenuOpen && (
          <div className="owner-layout-mobile-menu">
            <OwnerNavigation onCloseMenu={() => setIsMenuOpen(false)} />
          </div>
        )}

        <main className="owner-layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}