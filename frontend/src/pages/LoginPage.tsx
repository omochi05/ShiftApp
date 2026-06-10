import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  hourly_wage: number;
};

export default function LoginPage() {
  const navigate = useNavigate();

  const [loginId, setLoginId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    if (!loginId.trim()) {
      setMessage("ログインIDを入力してください");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const res = await api.get<User[]>("/users/");
      const users = res.data;

      const targetUser = users.find(
        (user) =>
          user.email.trim().toLowerCase() === loginId.trim().toLowerCase()
      );

      if (!targetUser) {
        setMessage("ログインIDが見つかりません");
        return;
      }

      if (targetUser.role === "owner") {
        localStorage.setItem("ownerLogin", "true");
        localStorage.setItem("ownerId", String(targetUser.id));
        localStorage.setItem("ownerName", targetUser.name);
        localStorage.setItem("ownerNumber", targetUser.email);

        localStorage.removeItem("managerLogin");
        localStorage.removeItem("managerId");
        localStorage.removeItem("managerName");
        localStorage.removeItem("managerNumber");

        navigate("/owner");
        return;
      }

      if (targetUser.role === "manager") {
        localStorage.setItem("managerLogin", "true");
        localStorage.setItem("managerId", String(targetUser.id));
        localStorage.setItem("managerName", targetUser.name);
        localStorage.setItem("managerNumber", targetUser.email);

        localStorage.removeItem("ownerLogin");
        localStorage.removeItem("ownerId");
        localStorage.removeItem("ownerName");
        localStorage.removeItem("ownerNumber");

        navigate("/manager");
        return;
      }

      setMessage("このユーザーは管理画面にログインできません");
    } catch (error) {
      console.error("ログイン失敗:", error);
      setMessage("ログインに失敗しました。API接続を確認してください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <h1 style={styles.title}>ShiftApp</h1>
        <p style={styles.subtitle}>オーナー・管理者ログイン</p>

        <form onSubmit={handleLogin} style={styles.form}>
          <label style={styles.label}>
            ログインID
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="例：OWNER001 / manager@example.com"
              style={styles.input}
              autoFocus
            />
          </label>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        {message && <p style={styles.message}>{message}</p>}

        <div style={styles.hintBox}>
          <p style={styles.hintTitle}>ログイン例</p>
          <p style={styles.hint}>オーナー：OWNER001</p>
          <p style={styles.hint}>管理者：manager@example.com</p>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    background: "#f4f7fb",
  },
  card: {
    width: "min(100%, 460px)",
    padding: 32,
    borderRadius: 24,
    background: "#ffffff",
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
    border: "1px solid #d1d5db",
  },
  title: {
    margin: 0,
    fontSize: 40,
    fontWeight: 900,
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    margin: "10px 0 28px",
    fontSize: 17,
    fontWeight: 800,
    color: "#64748b",
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontSize: 15,
    fontWeight: 900,
    color: "#111827",
  },
  input: {
    width: "100%",
    minHeight: 48,
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    fontSize: 16,
    fontWeight: 700,
    outline: "none",
  },
  button: {
    minHeight: 50,
    border: "none",
    borderRadius: 14,
    background: "#2563eb",
    color: "#ffffff",
    fontSize: 17,
    fontWeight: 900,
    cursor: "pointer",
  },
  message: {
    margin: "18px 0 0",
    color: "#dc2626",
    fontSize: 15,
    fontWeight: 800,
    textAlign: "center",
  },
  hintBox: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
  },
  hintTitle: {
    margin: "0 0 8px",
    color: "#111827",
    fontSize: 14,
    fontWeight: 900,
  },
  hint: {
    margin: "4px 0",
    color: "#64748b",
    fontSize: 14,
    fontWeight: 800,
  },
};