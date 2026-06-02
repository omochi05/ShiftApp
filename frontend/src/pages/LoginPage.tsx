import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "40px" }}>
      <h1>シフト管理アプリ</h1>
      <p>ログインするユーザーを選んでください</p>

      <button onClick={() => navigate("/owner")} style={{ marginRight: "12px" }}>
        オーナーでログイン
      </button>

      <button onClick={() => navigate("/employee/2")}>
        従業員でログイン
      </button>
    </div>
  );
}