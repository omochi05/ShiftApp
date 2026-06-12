import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import "./PasswordChangePage.css";

export default function PasswordChangePage() {
  const navigate = useNavigate();

  const loginUserId = localStorage.getItem("loginUserId");
  const loginName = localStorage.getItem("loginName");
  const loginRole = localStorage.getItem("loginRole");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const normalizePassword = (value: string) => {
    return value.replace(/\D/g, "").slice(0, 4);
  };

  const handleBack = () => {
    if (loginRole === "owner") {
      navigate("/owner");
      return;
    }

    if (loginRole === "manager") {
      navigate("/manager");
      return;
    }

    navigate("/");
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();

    if (!loginUserId) {
      setMessage("ログイン情報が見つかりません。もう一度ログインしてください。");
      return;
    }

    if (!/^\d{4}$/.test(currentPassword)) {
      setMessage("現在のパスワードは4桁の数字で入力してください");
      return;
    }

    if (!/^\d{4}$/.test(newPassword)) {
      setMessage("新しいパスワードは4桁の数字で入力してください");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setMessage("新しいパスワードが一致しません");
      return;
    }

    if (currentPassword === newPassword) {
      setMessage("現在と違うパスワードを入力してください");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      await api.put("/users/change-password", {
        user_id: Number(loginUserId),
        current_password: currentPassword,
        new_password: newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");

      setMessage("パスワードを変更しました");
    } catch (error: any) {
      console.error("パスワード変更失敗:", error);
      setMessage(error.response?.data?.detail || "パスワード変更に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="password-change-page">
      <section className="password-change-card">
        <p className="password-change-label">SECURITY</p>
        <h1>パスワード変更</h1>

        <p className="password-change-user">
          ログイン中：<strong>{loginName || "ユーザー"}</strong>
        </p>

        <form className="password-change-form" onSubmit={handleChangePassword}>
          <label>
            現在の4桁パスワード
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(normalizePassword(e.target.value))}
              inputMode="numeric"
              maxLength={4}
              placeholder="例：1234"
              autoComplete="current-password"
            />
          </label>

          <label>
            新しい4桁パスワード
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(normalizePassword(e.target.value))}
              inputMode="numeric"
              maxLength={4}
              placeholder="例：5678"
              autoComplete="new-password"
            />
          </label>

          <label>
            新しい4桁パスワード確認
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={(e) =>
                setNewPasswordConfirm(normalizePassword(e.target.value))
              }
              inputMode="numeric"
              maxLength={4}
              placeholder="もう一度入力"
              autoComplete="new-password"
            />
          </label>

          {message && <p className="password-change-message">{message}</p>}

          <button type="submit" disabled={saving}>
            {saving ? "変更中..." : "パスワードを変更"}
          </button>
        </form>

        <button
          type="button"
          className="password-change-back-button"
          onClick={handleBack}
        >
          管理画面に戻る
        </button>
      </section>
    </div>
  );
}