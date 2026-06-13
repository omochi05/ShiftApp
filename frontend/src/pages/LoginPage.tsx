import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import "./LoginPage.css";

type LoginUser = {
  id: number;
  name: string;
  employee_number: string;
  role: string;
  hourly_wage: number;
};

export default function LoginPage() {
  const navigate = useNavigate();

  const [employeeNumber, setEmployeeNumber] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizeFourDigitPassword = (value: string) =>
    value.replace(/\D/g, "").slice(0, 4);

  const clearOldLoginStorage = () => {
    localStorage.removeItem("loginUserId");
    localStorage.removeItem("loginName");
    localStorage.removeItem("loginRole");
    localStorage.removeItem("employeeNumber");

    localStorage.removeItem("ownerLogin");
    localStorage.removeItem("ownerId");
    localStorage.removeItem("ownerName");
    localStorage.removeItem("ownerNumber");
  };

  const saveLoginStorage = (user: LoginUser) => {
    const storedRole = user.employee_number === "9999" ? "employee" : user.role;

    localStorage.setItem("loginUserId", String(user.id));
    localStorage.setItem("loginName", user.name);
    localStorage.setItem("loginRole", storedRole);
    localStorage.setItem("employeeNumber", user.employee_number);
    localStorage.setItem("ownerName", user.name);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    const cleanEmployeeNumber = employeeNumber.trim();
    const cleanPassword = password.trim();

    if (!cleanEmployeeNumber) {
      setMessage("従業員番号を入力してください");
      return;
    }

    if (!/^\d{4}$/.test(cleanPassword)) {
      setMessage("パスワードは4桁の数字で入力してください");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const res = await api.post<LoginUser>("/users/login", {
        employee_number: cleanEmployeeNumber,
        password: cleanPassword,
      });

      const user = res.data;

      clearOldLoginStorage();
      saveLoginStorage(user);

      if (user.employee_number === "9999") {
        navigate("/employee");
        return;
      }

      if (user.role === "owner") {
        navigate("/owner");
        return;
      }

      if (user.role === "manager") {
        navigate("/manager");
        return;
      }

      if (user.role === "employee") {
        navigate("/employee");
        return;
      }

      setMessage("ログインしましたが、対応する画面が見つかりません。");
    } catch (error: any) {
      console.error("ログイン失敗:", error);
      setMessage(error.response?.data?.detail || "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="seven-login-page">
      <main className="seven-login-shell simple-login-shell">
        <section className="seven-login-card simple-login-card">
          <div className="seven-color-lines">
            <span className="seven-line-green" />
            <span className="seven-line-orange" />
            <span className="seven-line-red" />
          </div>

          <div className="seven-app-mark">
            <div className="seven-app-icon">
              <span>7</span>
            </div>

            <div>
              <p>STORE SHIFT SYSTEM</p>
              <h1>SevenShift Manager</h1>
            </div>
          </div>

          <div className="seven-login-card-header">
            <h2>ログイン</h2>
            <span>従業員番号と4桁パスワードを入力してください。</span>
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
              />
            </label>

            <label>
              4桁パスワード
              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(normalizeFourDigitPassword(e.target.value))
                }
                placeholder="例：1234"
                inputMode="numeric"
                maxLength={4}
                autoComplete="current-password"
              />
            </label>

            {message && <p className="seven-login-message">{message}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          <p className="seven-login-footer">
            Staff scheduling / attendance management
          </p>
        </section>
      </main>
    </div>
  );
}