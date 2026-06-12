import { HashRouter, Routes, Route } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import ManagerDashboard from "./pages/ManagerDashboard";
import ShiftPrintPage from "./pages/ShiftPrintPage";
import PasswordChangePage from "./pages/PasswordChangePage";

import RequireRole from "./components/RequireRole";

import OwnerLayout from "./pages/owner/OwnerLayout";
import OwnerDashboardHome from "./pages/owner/OwnerDashboardHome";
import OwnerEmployeesPage from "./pages/owner/OwnerEmployeesPage";
import OwnerSalesPage from "./pages/owner/OwnerSalesPage";
import OwnerShiftsPage from "./pages/owner/OwnerShiftsPage";
import OwnerShiftTimelinePage from "./pages/owner/OwnerShiftTimelinePage";

function AppLayout() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      <Route
          path="/owner"
          element={
            <RequireRole allowedRoles={["owner", "manager"]}>
              <OwnerLayout />
            </RequireRole>
          }
        >
        <Route index element={<OwnerDashboardHome />} />
        <Route path="shifts" element={<OwnerShiftsPage />} />
        <Route path="timeline" element={<OwnerShiftTimelinePage />} />
        <Route
            path="sales"
            element={
              <RequireRole allowedRoles={["owner"]}>
                <OwnerSalesPage />
              </RequireRole>
            }
          />
        <Route path="employees" element={<OwnerEmployeesPage />} />
        <Route path="print/shifts" element={<ShiftPrintPage />} />
      </Route>

      <Route
        path="/manager"
        element={
          <RequireRole allowedRoles={["manager"]}>
            <ManagerDashboard />
          </RequireRole>
        }
      />

      <Route
        path="/change-password"
        element={
          <RequireRole allowedRoles={["owner", "manager", "employee"]}>
            <PasswordChangePage />
          </RequireRole>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppLayout />
    </HashRouter>
  );
}