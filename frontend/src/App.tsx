import { HashRouter, Routes, Route } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import ManagerDashboard from "./pages/ManagerDashboard";
import ShiftPrintPage from "./pages/ShiftPrintPage";

import OwnerLayout from "./pages/owner/OwnerLayout";
import OwnerDashboardHome from "./pages/owner/OwnerDashboardHome";
import OwnerPlaceholderPage from "./pages/owner/OwnerPlaceholderPage";

function AppLayout() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      <Route path="/owner" element={<OwnerLayout />}>
        <Route index element={<OwnerDashboardHome />} />

        <Route
          path="shifts"
          element={
            <OwnerPlaceholderPage
              title="シフト管理"
              description="ここにシフト作成・編集・削除機能を移動します。"
            />
          }
        />

        <Route
          path="timeline"
          element={
            <OwnerPlaceholderPage
              title="シフト表"
              description="ここに週ごとのシフト表を移動します。"
            />
          }
        />

        <Route
          path="sales"
          element={
            <OwnerPlaceholderPage
              title="売上管理"
              description="ここに売上登録と売上一覧を移動します。"
            />
          }
        />

        <Route
          path="employees"
          element={
            <OwnerPlaceholderPage
              title="従業員管理"
              description="ここに従業員追加・編集・削除機能を移動します。"
            />
          }
        />

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