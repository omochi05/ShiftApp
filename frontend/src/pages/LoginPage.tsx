import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import "./LoginPage.css";

type LoginResponse = {
  id: number;
  name: string;
  employee_number: string;
  role: "owner" | "manager" | "employee";
  access_token: string;
  token_type: string;
};

function getHomePath(role: string, employeeNumber: string) {
  if (employeeNumber === "9999") {
    return "/owner";
  }

  if (role === "owner") {
    return "/owner";
  }

  if (role === "manager") {
    return "/manager";
  }

  return "/employee";
}

export default function LoginPage() {
  const navigate = useNavigate();

  const [employeeNumber, setEmployeeNumber] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const clearLoginStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedEmployeeNumber = employeeNumber.trim();

    if (!trimmedEmployeeNumber) {
      setMessage("従業員番号を入力してください");
      return;
    }

    if (!password) {
      setMessage("パスワードを入力してください");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      clearLoginStorage();

      const res = await api.post<LoginResponse>("/auth/login", {
        employee_number: trimmedEmployeeNumber,
        password,
      });

      localStorage.setItem("accessToken", res.data.access_token);
      localStorage.setItem("loginUserId", String(res.data.id));
      localStorage.setItem("loginName", res.data.name);
      localStorage.setItem("employeeNumber", res.data.employee_number);
      localStorage.setItem("loginRole", res.data.role);

      sessionStorage.setItem("loginPassed", "true");

      // 既存コードとの互換用
      if (res.data.role === "owner" || res.data.employee_number === "9999") {
        localStorage.setItem("ownerLogin", "true");
        localStorage.setItem("ownerId", String(res.data.id));
        localStorage.setItem("ownerName", res.data.name);
        localStorage.setItem("ownerNumber", res.data.employee_number);
      }

      const homePath = getHomePath(res.data.role, res.data.employee_number);

      navigate(homePath, { replace: true });
    } catch (error: any) {
      console.error("ログイン失敗:", error);

      clearLoginStorage();

      setMessage(
        error.response?.data?.detail ||
          "従業員番号またはパスワードが違います"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="seven-login-page">
      <div className="simple-login-shell">
        <section className="simple-login-card">
          <div className="seven-app-mark">
            <div className="seven-app-icon">
              <span>7</span>
            </div>

            <div>
              <p>SEVENSHIFT</p>
              <h1>SevenShift Manager</h1>
            </div>
          </div>

          <div className="seven-login-card-header">
            <h2>ログイン</h2>
            <span>従業員番号と4桁のパスワードを入力してください。</span>
          </div>

          <form className="seven-login-form" onSubmit={handleLogin}>
            <label>
              従業員番号
              <input
                type="text"
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                placeholder="例：001"
                autoComplete="username"
                disabled={loading}
              />
            </label>

            <label>
              パスワード
              <input
                type="password"
                inputMode="numeric"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="数字4桁"
                autoComplete="current-password"
                disabled={loading}
                maxLength={4}
              />
            </label>

            {message && <p className="seven-login-message">{message}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          <p className="seven-login-footer">SHIFT MANAGEMENT SYSTEM</p>
        </section>
      </div>
    </main>
  );
}