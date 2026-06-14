import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import OwnerHamburgerMenu from "../components/OwnerHamburgerMenu";
import "./PasswordChangePage.css";

function getHomePath() {
  const role = localStorage.getItem("loginRole");
  const employeeNumber = localStorage.getItem("employeeNumber");

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

function formatApiError(error: any, fallbackMessage: string) {
  const detail = error.response?.data?.detail;

  if (Array.isArray(detail)) {
    return `${fallbackMessage}：${detail.map((d) => d.msg).join(" / ")}`;
  }

  if (detail) {
    return `${fallbackMessage}：${detail}`;
  }

  if (error.response?.status) {
    return `${fallbackMessage}：HTTP ${error.response.status}`;
  }

  return `${fallbackMessage}：APIに接続できませんでした`;
}

export default function PasswordChangePage() {
  const navigate = useNavigate();

  const loginUserId = Number(localStorage.getItem("loginUserId") || 0);
  const loginName = localStorage.getItem("loginName") || "ユーザー";
  const loginRole = localStorage.getItem("loginRole") || "";
  const isOwnerOrManager =
    loginRole === "owner" ||
    loginRole === "manager" ||
    localStorage.getItem("employeeNumber") === "9999";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!loginUserId) {
      setMessage("ログイン情報が見つかりません。もう一度ログインしてください。");
      return;
    }

    if (!currentPassword) {
      setMessage("現在のパスワードを入力してください");
      return;
    }

    if (!newPassword) {
      setMessage("新しいパスワードを入力してください");
      return;
    }

    if (newPassword.length < 4) {
      setMessage("新しいパスワードは4文字以上にしてください");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("新しいパスワードと確認用パスワードが一致しません");
      return;
    }

    if (currentPassword === newPassword) {
      setMessage("現在のパスワードと同じパスワードは使用できません");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setSuccessMessage("");

      await api.post("/users/change-password", {
        user_id: loginUserId,
        current_password: currentPassword,
        new_password: newPassword,
      });

      setSuccessMessage("パスワードを変更しました。次回から新しいパスワードでログインしてください。");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("パスワード変更失敗:", error);
      setMessage(formatApiError(error, "パスワード変更に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="password-change-page">
      {isOwnerOrManager && <OwnerHamburgerMenu />}

      <section className="password-change-card">
        <div className="password-change-header">
          <p>SECURITY</p>
          <h1>パスワード変更</h1>
          <span>{loginName}さんのパスワードを変更します。</span>
        </div>

        <form className="password-change-form" onSubmit={handleChangePassword}>
          <label>
            現在のパスワード
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="現在のパスワード"
              autoComplete="current-password"
              disabled={loading}
            />
          </label>

          <label>
            新しいパスワード
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新しいパスワード"
              autoComplete="new-password"
              disabled={loading}
            />
          </label>

          <label>
            新しいパスワード確認
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="もう一度入力"
              autoComplete="new-password"
              disabled={loading}
            />
          </label>

          {message && <p className="password-change-error">{message}</p>}
          {successMessage && (
            <p className="password-change-success">{successMessage}</p>
          )}

          <div className="password-change-actions">
            <button type="submit" disabled={loading}>
              {loading ? "変更中..." : "パスワードを変更"}
            </button>

            <button
              type="button"
              className="password-change-back-button"
              onClick={() => navigate(getHomePath())}
              disabled={loading}
            >
              戻る
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}