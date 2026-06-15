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

function getHomePath() {
  const role = localStorage.getItem("loginRole");
  const employeeNumber = localStorage.getItem("employeeNumber");

  if (employeeNumber === "9999") return "/owner";
  if (role === "owner") return "/owner";
  if (role === "manager") return "/manager";
  if (role === "employee") return "/employee";

  return "/";
}

function LoginRoute() {
  const accessToken = localStorage.getItem("accessToken");
  const loginRole = localStorage.getItem("loginRole");
  const loginUserId = localStorage.getItem("loginUserId");
  const loginPassed = sessionStorage.getItem("loginPassed");

  const isLoggedIn = Boolean(
    accessToken && loginRole && loginUserId && loginPassed === "true"
  );

  if (isLoggedIn) {
    return <Navigate to={getHomePath()} replace />;
  }

  return <LoginPage />;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LoginRoute />} />

        <Route element={<RequireRole allowedRoles={["employee"]} />}>
          <Route path="/employee" element={<EmployeeDashboard />} />
          <Route
            path="/employee/change-password"
            element={<PasswordChangePage />}
          />
        </Route>

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