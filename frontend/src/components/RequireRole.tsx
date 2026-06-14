import { Navigate, Outlet } from "react-router-dom";

type RequireRoleProps = {
  allowedRoles: string[];
};

export default function RequireRole({ allowedRoles }: RequireRoleProps) {
  const accessToken = localStorage.getItem("accessToken");
  const loginRole = localStorage.getItem("loginRole");
  const employeeNumber = localStorage.getItem("employeeNumber");
  const loginUserId = localStorage.getItem("loginUserId");

  const isLoggedIn = Boolean(accessToken && loginRole && loginUserId);

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  // メンテナンス用 9999 は全画面OK
  if (employeeNumber === "9999") {
    return <Outlet />;
  }

  if (!loginRole || !allowedRoles.includes(loginRole)) {
    localStorage.clear();
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}