import { HashRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import OwnerDashboard from "./pages/OwnerDashboard";
import ShiftPrintPage from "./pages/ShiftPrintPage";
import "./App.css";

function App() {
  return (
    <HashRouter>
      <div>
        <nav style={{ padding: "16px", borderBottom: "1px solid #ddd" }}>
          <Link to="/" style={{ marginRight: "16px" }}>
            ログイン
          </Link>

          <Link to="/owner" style={{ marginRight: "16px" }}>
            オーナー
          </Link>

          <Link to="/print/shifts">シフト表印刷</Link>
        </nav>

        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/print/shifts" element={<ShiftPrintPage />} />
          <Route path="*" element={<Navigate to="/owner" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;