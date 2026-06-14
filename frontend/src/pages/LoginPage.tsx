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
        password: password,
      });

      localStorage.setItem("accessToken", res.data.access_token);
      localStorage.setItem("loginUserId", String(res.data.id));
      localStorage.setItem("loginName", res.data.name);
      localStorage.setItem("employeeNumber", res.data.employee_number);
      localStorage.setItem("loginRole", res.data.role);

      // 既存のオーナー判定コードと互換性を残す
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

      setMessage(
        error.response?.data?.detail ||
          "従業員番号またはパスワードが違います"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-mark">7</div>

          <div className="login-brand-text">
            <p>SevenShift Manager</p>
            <h1>ログイン</h1>
          </div>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
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

          {message && <p className="login-message">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}