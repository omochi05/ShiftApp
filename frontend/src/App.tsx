import { HashRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import OwnerDashboard from "./pages/OwnerDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
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

          <Link to="/employee/2">従業員</Link>
        </nav>

        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/employee/:userId" element={<EmployeeDashboard />} />

          {/* 存在しないURLはログイン画面へ戻す */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;