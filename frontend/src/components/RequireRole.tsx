import { Navigate, Outlet } from "react-router-dom";

type RequireRoleProps = {
  allowedRoles: string[];
};

export default function RequireRole({ allowedRoles }: RequireRoleProps) {
  const accessToken = localStorage.getItem("accessToken");
  const loginRole = localStorage.getItem("loginRole");
  const employeeNumber = localStorage.getItem("employeeNumber");
  const loginUserId = localStorage.getItem("loginUserId");

  const loginPassed = sessionStorage.getItem("loginPassed");

  const isLoggedIn = Boolean(
    accessToken && loginRole && loginUserId && loginPassed === "true"
  );

  if (!isLoggedIn) {
    localStorage.removeItem("accessToken");

    localStorage.removeItem("loginUserId");
    localStorage.removeItem("loginName");
    localStorage.removeItem("loginRole");
    localStorage.removeItem("employeeNumber");

    localStorage.removeItem("ownerLogin");
    localStorage.removeItem("ownerId");
    localStorage.removeItem("ownerName");
    localStorage.removeItem("ownerNumber");

    sessionStorage.removeItem("loginPassed");

    return <Navigate to="/" replace />;
  }

  // メンテナンス用 9999 は全画面OK
  if (employeeNumber === "9999") {
    return <Outlet />;
  }

  if (!loginRole || !allowedRoles.includes(loginRole)) {
    localStorage.clear();
    sessionStorage.clear();

    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}