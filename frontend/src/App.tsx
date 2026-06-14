import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import RequireRole from "./components/RequireRole";

import LoginPage from "./pages/LoginPage";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import PasswordChangePage from "./pages/PasswordChangePage";
import ShiftPrintPage from "./pages/ShiftPrintPage";

import OwnerDashboard from "./pages/owner/OwnerDashboardHome";
import OwnerEmployeesPage from "./pages/owner/OwnerEmployeesPage";
import OwnerSalesPage from "./pages/owner/OwnerSalesPage";
import OwnerShiftsPage from "./pages/owner/OwnerShiftsPage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        <Route element={<RequireRole allowedRoles={["employee"]} />}>
          <Route path="/employee" element={<EmployeeDashboard />} />
        </Route>

        <Route element={<RequireRole allowedRoles={["manager", "owner"]} />}>
          <Route path="/manager" element={<ManagerDashboard />} />

          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/owner/ownerdashboard" element={<OwnerDashboard />} />

          <Route path="/owner/shifts" element={<OwnerShiftsPage />} />

          {/* シフト表 */}
          <Route path="/owner/timeline" element={<OwnerShiftsPage />} />

          {/* 従業員管理 */}
          <Route path="/owner/employees" element={<OwnerEmployeesPage />} />

          {/* 売上管理 */}
          <Route path="/owner/sales" element={<OwnerSalesPage />} />

          {/* 印刷 */}
          <Route path="/owner/print/shifts" element={<ShiftPrintPage />} />
          <Route path="/print-shift" element={<ShiftPrintPage />} />
        </Route>

        <Route
          element={
            <RequireRole allowedRoles={["owner", "manager", "employee"]} />
          }
        >
          <Route path="/change-password" element={<PasswordChangePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}