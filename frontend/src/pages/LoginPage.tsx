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
        password,
      });

      localStorage.setItem("accessToken", res.data.access_token);
      localStorage.setItem("loginUserId", String(res.data.id));
      localStorage.setItem("loginName", res.data.name);
      localStorage.setItem("employeeNumber", res.data.employee_number);
      localStorage.setItem("loginRole", res.data.role);

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
    <main className="seven-login-page">
      <section className="seven-login-left">
        <div className="seven-brand-card">
          <div className="seven-color-lines">
            <span className="seven-line-green" />
            <span className="seven-line-orange" />
            <span className="seven-line-red" />
          </div>

          <p className="seven-brand-label">SEVENSHIFT MANAGER</p>

          <h1>
            シフト管理を
            <br />
            もっと見やすく。
          </h1>

          <p className="seven-brand-description">
            オーナー・管理者・従業員が、それぞれの役割に合わせて
            シフト確認、給与確認、通知確認を行える管理システムです。
          </p>

          <div className="seven-feature-list">
            <div>
              <strong>シフト確認</strong>
              <span>週ごとの勤務予定を確認</span>
            </div>

            <div>
              <strong>通知</strong>
              <span>変更や登録をすぐ確認</span>
            </div>

            <div>
              <strong>権限管理</strong>
              <span>役割ごとに画面を制御</span>
            </div>
          </div>
        </div>
      </section>

      <section className="seven-login-right">
        <div className="seven-login-card">
          <div className="seven-login-header">
            <div className="seven-mini-mark">
              <span />
              <span />
              <span />
            </div>

            <div>
              <p>LOGIN</p>
              <h2>ログイン</h2>
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <label className="seven-form-field">
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

            <label className="seven-form-field">
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

            <button
              type="submit"
              className="seven-login-button"
              disabled={loading}
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          <p className="seven-login-note">
            従業員番号とパスワードを入力してください。
          </p>
        </div>
      </section>
    </main>
  );
}