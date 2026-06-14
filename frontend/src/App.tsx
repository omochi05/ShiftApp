import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import RequireRole from "./components/RequireRole";

import LoginPage from "./pages/LoginPage";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import PasswordChangePage from "./pages/PasswordChangePage";
import ShiftPrintPage from "./pages/ShiftPrintPage";

import OwnerDashboardHome from "./pages/owner/OwnerDashboardHome";
import OwnerEmployeesPage from "./pages/owner/OwnerEmployeesPage";
import OwnerSalesPage from "./pages/owner/OwnerSalesPage";
import OwnerShiftTimelinePage from "./pages/owner/OwnerShiftTimelinePage";
import OwnerShiftsPage from "./pages/owner/OwnerShiftsPage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        {/* 従業員専用 */}
        <Route element={<RequireRole allowedRoles={["employee"]} />}>
          <Route path="/employee" element={<EmployeeDashboard />} />
          <Route
            path="/employee/change-password"
            element={<PasswordChangePage />}
          />
        </Route>

        {/* 管理者専用 */}
        <Route element={<RequireRole allowedRoles={["manager"]} />}>
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/manager/shifts" element={<OwnerShiftsPage />} />
          <Route path="/manager/timeline" element={<OwnerShiftTimelinePage />} />
          <Route path="/manager/employees" element={<OwnerEmployeesPage />} />
          <Route path="/manager/print/shifts" element={<ShiftPrintPage />} />
          <Route
            path="/manager/change-password"
            element={<PasswordChangePage />}
          />
        </Route>

        {/* オーナー専用 */}
        <Route element={<RequireRole allowedRoles={["owner"]} />}>
          <Route path="/owner" element={<OwnerDashboardHome />} />
          <Route
            path="/owner/ownerdashboard"
            element={<OwnerDashboardHome />}
          />
          <Route path="/owner/shifts" element={<OwnerShiftsPage />} />
          <Route path="/owner/timeline" element={<OwnerShiftTimelinePage />} />
          <Route path="/owner/sales" element={<OwnerSalesPage />} />
          <Route path="/owner/employees" element={<OwnerEmployeesPage />} />
          <Route path="/owner/print/shifts" element={<ShiftPrintPage />} />
          <Route
            path="/owner/change-password"
            element={<PasswordChangePage />}
          />
        </Route>

        {/* 旧URL対策 */}
        <Route
          element={
            <RequireRole allowedRoles={["owner", "manager", "employee"]} />
          }
        >
          <Route path="/change-password" element={<PasswordChangePage />} />
          <Route path="/print-shift" element={<ShiftPrintPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}