import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

type UserRole = "owner" | "manager" | "employee";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("owner@example.com");
  const [password, setPassword] = useState("password");
  const [role, setRole] = useState<UserRole>("owner");
  const [message, setMessage] = useState("");

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!email.trim() || !password.trim()) {
      setMessage("メールアドレスとパスワードを入力してください");
      return;
    }

    localStorage.setItem("ownerName", "オーナー");
    localStorage.setItem("loginRole", role);

    if (role === "owner") {
      navigate("/owner");
      return;
    }

    if (role === "manager") {
      navigate("/manager");
      return;
    }

    setMessage("従業員画面は現在準備中です");
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

          <p className="seven-brand-label">SHIFT MANAGEMENT SYSTEM</p>

          <h1>
            シフト管理を
            <br />
            もっと見やすく
          </h1>

          <p className="seven-brand-description">
            勤務予定、印刷用シフト表、売上・人件費確認までまとめて管理できます。
          </p>

          <div className="seven-feature-list">
            <div>
              <strong>週シフト</strong>
              <span>6:00〜翌6:00表示</span>
            </div>

            <div>
              <strong>印刷対応</strong>
              <span>A3横・PDF保存</span>
            </div>

            <div>
              <strong>売上分析</strong>
              <span>人件費率を確認</span>
            </div>
          </div>
        </div>
      </section>

      <section className="seven-login-right">
        <form className="seven-login-card" onSubmit={handleLogin}>
          <div className="seven-login-header">
            <div className="seven-mini-mark">
              <span />
              <span />
              <span />
            </div>

            <div>
              <p>WELCOME BACK</p>
              <h2>ログイン</h2>
            </div>
          </div>

          <label className="seven-form-field">
            メールアドレス
            <input
              type="email"
              value={email}
              placeholder="owner@example.com"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="seven-form-field">
            パスワード
            <input
              type="password"
              value={password}
              placeholder="password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <label className="seven-form-field">
            ロール
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
            >
              <option value="owner">オーナー</option>
              <option value="manager">管理者</option>
              <option value="employee">従業員</option>
            </select>
          </label>

          {message && <p className="seven-login-message">{message}</p>}

          <button type="submit" className="seven-login-button">
            ログイン
          </button>

          <p className="seven-login-note">
            テスト用：オーナーを選択してログインすると管理画面へ移動します。
          </p>
        </form>
      </section>
    </main>
  );
}