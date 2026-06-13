import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

type RequireRoleProps = {
  allowedRoles: string[];
  children: ReactNode;
};

export default function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const loginUserId = localStorage.getItem("loginUserId");
  const loginRole = localStorage.getItem("loginRole");
  const employeeNumber = localStorage.getItem("employeeNumber");

  if (!loginUserId || !loginRole) {
    return <Navigate to="/" replace />;
  }

  if (employeeNumber === "9999") {
    return <>{children}</>;
  }

  if (!allowedRoles.includes(loginRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}