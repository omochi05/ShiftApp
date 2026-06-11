import { HashRouter, Routes, Route } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import ManagerDashboard from "./pages/ManagerDashboard";
import ShiftPrintPage from "./pages/ShiftPrintPage";

import OwnerLayout from "./pages/owner/OwnerLayout";
import OwnerDashboardHome from "./pages/owner/OwnerDashboardHome";
import OwnerPlaceholderPage from "./pages/owner/OwnerPlaceholderPage";
import OwnerEmployeesPage from "./pages/owner/OwnerEmployeesPage";
import OwnerSalesPage from "./pages/owner/OwnerSalesPage";
import OwnerShiftsPage from "./pages/owner/OwnerShiftsPage";

function AppLayout() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      <Route path="/owner" element={<OwnerLayout />}>
        <Route index element={<OwnerDashboardHome />} />

        <Route path="shifts" element={<OwnerShiftsPage />} />

        <Route
          path="timeline"
          element={
            <OwnerPlaceholderPage
              title="シフト表"
              description="ここに週ごとのシフト表を移動します。"
            />
          }
        />

        <Route path="sales" element={<OwnerSalesPage />} />

        <Route path="employees" element={<OwnerEmployeesPage />} />

        <Route
          path="templates"
          element={
            <OwnerPlaceholderPage
              title="固定シフト"
              description="ここに固定シフトテンプレート機能を移動します。"
            />
          }
        />
      </Route>

      <Route path="/owner/print/shifts" element={<ShiftPrintPage />} />

      <Route path="/manager" element={<ManagerDashboard />} />
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