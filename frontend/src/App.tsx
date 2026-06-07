import { HashRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import OwnerDashboard from "./pages/OwnerDashboard";
import ShiftPrintPage from "./pages/ShiftPrintPage";
import "./App.css";

function RequireOwnerLogin({ children }: { children: JSX.Element }) {
  const isLoggedIn = localStorage.getItem("ownerLogin") === "true";

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const isLoggedIn = localStorage.getItem("ownerLogin") === "true";

  const handleLogout = () => {
    localStorage.removeItem("ownerLogin");
    localStorage.removeItem("ownerName");
    localStorage.removeItem("ownerId");
    window.location.href = "/#/";
  };

  return (
    <HashRouter>
      <div>
        <nav style={{ padding: "16px", borderBottom: "1px solid #ddd" }}>
          <Link to="/" style={{ marginRight: "16px" }}>
            ログイン
          </Link>

          {isLoggedIn && (
            <>
              <Link to="/owner" style={{ marginRight: "16px" }}>
                オーナー
              </Link>

              <Link to="/print/shifts" style={{ marginRight: "16px" }}>
                シフト表印刷
              </Link>

              <button type="button" onClick={handleLogout}>
                ログアウト
              </button>
            </>
          )}
        </nav>

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

          <Route path="*" element={<Navigate to="/owner" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;