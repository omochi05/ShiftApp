import type { ReactNode } from "react";
import { HashRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import OwnerDashboard from "./pages/OwnerDashboard";
import ShiftPrintPage from "./pages/ShiftPrintPage";
import "./App.css";

function RequireOwnerLogin({ children }: { children: ReactNode }) {
  const isLoggedIn = localStorage.getItem("ownerLogin") === "true";

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const isLoggedIn = localStorage.getItem("ownerLogin") === "true";
  const ownerName = localStorage.getItem("ownerName");

  const handleLogout = () => {
    localStorage.removeItem("ownerLogin");
    localStorage.removeItem("ownerId");
    localStorage.removeItem("ownerName");
    localStorage.removeItem("ownerNumber");

    window.location.href = "/#/";
  };

  return (
    <HashRouter>
      <div>
        {isLoggedIn && (
          <nav
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid #334155",
              background: "#0f172a",
              color: "#ffffff",
              display: "flex",
              gap: "14px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <strong style={{ marginRight: "auto" }}>
              ShiftApp {ownerName ? ` / ${ownerName}` : ""}
            </strong>

            <Link to="/owner" style={navLinkStyle}>
              オーナー
            </Link>

            <Link to="/print/shifts" style={navLinkStyle}>
              シフト表印刷
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #475569",
                background: "#111827",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              ログアウト
            </button>
          </nav>
        )}

        <Routes>
          <Route path="/" element={<LoginPage />} />

          <Route
            path="/owner"
            element={
              <RequireOwnerLogin>
                <OwnerDashboard />
              </RequireOwnerLogin>
            }
          />

          <Route
            path="/print/shifts"
            element={
              <RequireOwnerLogin>
                <ShiftPrintPage />
              </RequireOwnerLogin>
            }
          />

          <Route
            path="*"
            element={
              isLoggedIn ? (
                <Navigate to="/owner" replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </div>
    </HashRouter>
  );
}

const navLinkStyle: React.CSSProperties = {
  color: "#dbeafe",
  textDecoration: "none",
  fontWeight: "bold",
};

export default App;