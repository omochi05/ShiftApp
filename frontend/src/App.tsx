import { HashRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import OwnerDashboard from "./pages/OwnerDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import ShiftPrintPage from "./pages/ShiftPrintPage";

function AppLayout() {
  const navigate = useNavigate();

  const isOwnerLogin = localStorage.getItem("ownerLogin") === "true";
  const isManagerLogin = localStorage.getItem("managerLogin") === "true";

  const handleLogout = () => {
    localStorage.removeItem("ownerLogin");
    localStorage.removeItem("ownerId");
    localStorage.removeItem("ownerName");
    localStorage.removeItem("ownerNumber");

    localStorage.removeItem("managerLogin");
    localStorage.removeItem("managerId");
    localStorage.removeItem("managerName");
    localStorage.removeItem("managerNumber");

    navigate("/");
  };

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            isOwnerLogin ? (
              <Navigate to="/owner" replace />
            ) : isManagerLogin ? (
              <Navigate to="/manager" replace />
            ) : (
              <LoginPage />
            )
          }
        />

        <Route
          path="/owner"
          element={isOwnerLogin ? <OwnerDashboard /> : <Navigate to="/" replace />}
        />

        <Route
          path="/manager"
          element={
            isManagerLogin ? <ManagerDashboard /> : <Navigate to="/" replace />
          }
        />

        <Route
          path="/owner/print/shifts"
          element={
            isOwnerLogin || isManagerLogin ? (
              <ShiftPrintPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <button
        type="button"
        onClick={handleLogout}
        style={{ display: "none" }}
        aria-hidden="true"
      >
        logout
      </button>
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppLayout />
    </HashRouter>
  );
}