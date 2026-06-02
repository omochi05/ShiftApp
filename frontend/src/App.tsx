import { HashRouter, Routes, Route, Link } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import OwnerDashboard from "./pages/OwnerDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";

function App() {
  return (
    <HashRouter>
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
      </Routes>
    </HashRouter>
  );
}

export default App;