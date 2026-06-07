import { HashRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import OwnerDashboard from "./pages/OwnerDashboard";
import "./App.css";

function App() {
  return (
    <HashRouter>
      <div>
        <nav style={{ padding: "16px", borderBottom: "1px solid #ddd" }}>
          <Link to="/" style={{ marginRight: "16px" }}>
            ログイン
          </Link>

          <Link to="/owner">オーナー</Link>
        </nav>

        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/owner" element={<OwnerDashboard />} />

          {/* 存在しないURLはオーナー画面へ */}
          <Route path="*" element={<Navigate to="/owner" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;