import { Navigate, Outlet } from "react-router-dom";

type RequireRoleProps = {
  allowedRoles: string[];
};

function getHomePath(role: string | null, employeeNumber: string | null) {
  if (employeeNumber === "9999") {
    return "/owner";
  }

  if (role === "owner") {
    return "/owner";
  }

  if (role === "manager") {
    return "/manager";
  }

  if (role === "employee") {
    return "/employee";
  }

  return "/";
}

export default function RequireRole({ allowedRoles }: RequireRoleProps) {
  const accessToken = localStorage.getItem("accessToken");
  const loginRole = localStorage.getItem("loginRole");
  const loginUserId = localStorage.getItem("loginUserId");
  const employeeNumber = localStorage.getItem("employeeNumber");
  const loginPassed = sessionStorage.getItem("loginPassed");

  const isLoggedIn = Boolean(
    accessToken && loginRole && loginUserId && loginPassed === "true"
  );

  if (!isLoggedIn) {
    localStorage.clear();
    sessionStorage.clear();

    return <Navigate to="/" replace />;
  }

  if (employeeNumber === "9999") {
    return <Outlet />;
  }

  if (!loginRole || !allowedRoles.includes(loginRole)) {
    return <Navigate to={getHomePath(loginRole, employeeNumber)} replace />;
  }

  return <Outlet />;
}