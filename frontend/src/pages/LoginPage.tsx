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

  const normalizeFourDigitPassword = (value: string) => {
    return value.replace(/\D/g, "").slice(0, 4);
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

      localStorage.setItem("loginUserId", String(user.id));
      localStorage.setItem("loginName", user.name);
      localStorage.setItem("loginRole", user.role);
      localStorage.setItem("employeeNumber", user.employee_number);

      /**
       * 既存のオーナー画面で ownerName を使っている場合のために残す
       */
      localStorage.setItem("ownerName", user.name);

      if (user.role === "owner") {
        navigate("/owner");
        return;
      }

      if (user.role === "manager") {
        navigate("/manager");
        return;
      }

      setMessage("ログインしました。従業員画面は現在準備中です。");
    } catch (error: any) {
      console.error("ログイン失敗:", error);
      setMessage(error.response?.data?.detail || "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="seven-login-page">
      <main className="seven-login-shell">
        <section className="seven-brand-card">
          <div className="seven-color-lines">
            <span className="seven-line-green" />
            <span className="seven-line-orange" />
            <span className="seven-line-red" />
          </div>

          <p className="seven-brand-label">SHIFT MANAGEMENT</p>

          <h1>
            ShiftApp
            <span>シフト管理システム</span>
          </h1>

          <p className="seven-brand-text">
            従業員番号と4桁パスワードでログインできます。
            オーナー・管理者・従業員ごとに画面を切り替えます。
          </p>

          <div className="seven-feature-list">
            <div>
              <strong>シフト管理</strong>
              <span>週ごとの勤務表を確認・編集</span>
            </div>

            <div>
              <strong>人件費管理</strong>
              <span>時給・勤務時間から自動計算</span>
            </div>

            <div>
              <strong>印刷対応</strong>
              <span>A3サイズのシフト表を作成</span>
            </div>
          </div>
        </section>

        <section className="seven-login-card">
          <div className="seven-login-card-header">
            <p>LOGIN</p>
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

          <p className="seven-login-help">
            初期パスワードは <strong>1234</strong> です。
            パスワード変更はログイン後の管理画面から行えます。
          </p>
        </section>
      </main>
    </div>
  );
}