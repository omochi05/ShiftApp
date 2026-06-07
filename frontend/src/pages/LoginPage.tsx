import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

function LoginPage() {
  const navigate = useNavigate();

  const [employeeNumber, setEmployeeNumber] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const res = await api.post("/auth/login", {
        employee_number: employeeNumber,
        password: password,
      });

      localStorage.setItem("ownerLogin", "true");
      localStorage.setItem("ownerId", String(res.data.id));
      localStorage.setItem("ownerName", res.data.name);
      localStorage.setItem("ownerNumber", res.data.employee_number);

      navigate("/owner");
    } catch (error: any) {
      console.error("ログイン失敗:", error);

      const detail = error.response?.data?.detail;

      if (detail) {
        setMessage(detail);
      } else {
        setMessage("ログインできませんでした。従業員番号とパスワードを確認してください。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.backgroundGlow} />

      <form style={styles.card} onSubmit={handleLogin}>
        <div style={styles.logoArea}>
          <div style={styles.logo}>S</div>
          <h1 style={styles.title}>ShiftApp</h1>
          <p style={styles.subtitle}>オーナー専用ログイン</p>
        </div>

        <div style={styles.notice}>
          <strong>管理者専用</strong>
          <span>ログイン後、売上・人件費・シフト表を管理できます。</span>
        </div>

        <label style={styles.label}>
          従業員番号
          <input
            style={styles.input}
            type="text"
            value={employeeNumber}
            onChange={(e) => setEmployeeNumber(e.target.value)}
            placeholder="例：OWNER001"
            autoComplete="username"
            required
          />
        </label>

        <label style={styles.label}>
          パスワード
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            autoComplete="current-password"
            required
          />
        </label>

        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "ログイン中..." : "オーナーとしてログイン"}
        </button>

        {message && <p style={styles.error}>{message}</p>}

        <p style={styles.helpText}>
          ※ 従業員ログインはありません。オーナーのみ利用できます。
        </p>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "16px",
    background:
      "linear-gradient(135deg, #020617 0%, #0f172a 50%, #111827 100%)",
    color: "#ffffff",
    position: "relative",
    overflow: "hidden",
  },
  backgroundGlow: {
    position: "absolute",
    width: "280px",
    height: "280px",
    borderRadius: "999px",
    background: "rgba(37, 99, 235, 0.25)",
    filter: "blur(70px)",
    top: "-80px",
    right: "-80px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    display: "grid",
    gap: "16px",
    padding: "26px",
    border: "1px solid rgba(148, 163, 184, 0.25)",
    borderRadius: "20px",
    background: "rgba(15, 23, 42, 0.92)",
    boxShadow: "0 24px 80px rgba(0, 0, 0, 0.35)",
    backdropFilter: "blur(10px)",
    zIndex: 1,
  },
  logoArea: {
    display: "grid",
    justifyItems: "center",
    gap: "8px",
    marginBottom: "6px",
  },
  logo: {
    width: "54px",
    height: "54px",
    borderRadius: "16px",
    display: "grid",
    placeItems: "center",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: "28px",
    fontWeight: "bold",
  },
  title: {
    margin: 0,
    fontSize: "32px",
    lineHeight: 1.2,
  },
  subtitle: {
    margin: 0,
    color: "#cbd5e1",
    fontSize: "14px",
  },
  notice: {
    display: "grid",
    gap: "4px",
    padding: "12px",
    borderRadius: "12px",
    background: "rgba(37, 99, 235, 0.12)",
    border: "1px solid rgba(96, 165, 250, 0.25)",
    color: "#dbeafe",
    fontSize: "13px",
  },
  label: {
    display: "grid",
    gap: "8px",
    color: "#e5e7eb",
    fontSize: "14px",
    fontWeight: 600,
  },
  input: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: "12px",
    border: "1px solid #475569",
    background: "#020617",
    color: "#ffffff",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    marginTop: "4px",
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer",
  },
  error: {
    margin: 0,
    padding: "10px",
    borderRadius: "10px",
    background: "rgba(239, 68, 68, 0.12)",
    border: "1px solid rgba(248, 113, 113, 0.35)",
    color: "#fecaca",
    fontSize: "13px",
    textAlign: "center",
  },
  helpText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "12px",
    textAlign: "center",
  },
};

export default LoginPage;