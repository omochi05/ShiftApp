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

export default function LoginPage() {
  const navigate = useNavigate();

  const [employeeNumber, setEmployeeNumber] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const clearLoginStorage = () => {
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

      // URL直接入力対策用：ログイン成功したタブだけ通す
      sessionStorage.setItem("loginPassed", "true");

      // 既存のオーナー判定コードとの互換用
      if (res.data.role === "owner" || res.data.employee_number === "9999") {
        localStorage.setItem("ownerLogin", "true");
        localStorage.setItem("ownerId", String(res.data.id));
        localStorage.setItem("ownerName", res.data.name);
        localStorage.setItem("ownerNumber", res.data.employee_number);
      }

      if (res.data.employee_number === "9999") {
        navigate("/employee");
        return;
      }

      if (res.data.role === "owner") {
        navigate("/owner");
        return;
      }

      if (res.data.role === "manager") {
        navigate("/manager");
        return;
      }

      navigate("/employee");
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
            <span>従業員番号とパスワードを入力してください。</span>
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                autoComplete="current-password"
                disabled={loading}
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