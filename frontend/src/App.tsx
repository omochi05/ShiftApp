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

function getMondayOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay(); // 日=0, 月=1, 火=2...
  const monday = new Date(now);

  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(now.getDate() + diff);

  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, "0");
  const dd = String(monday.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function App() {
  const isLoggedIn = localStorage.getItem("ownerLogin") === "true";
  const ownerName = localStorage.getItem("ownerName");

  const printWeekStartDate = getMondayOfCurrentWeek();

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
          <nav className="app-nav">
            <strong className="app-nav-title">
              ShiftApp {ownerName ? ` / ${ownerName}` : ""}
            </strong>

            <Link to="/owner" className="app-nav-link">
              オーナー
            </Link>

            <Link
              to={`/print/shifts?weekStartDate=${printWeekStartDate}`}
              className="app-nav-link"
            >
              シフト表印刷
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="app-nav-logout"
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
            path="/owner/print/shifts"
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

export default App;