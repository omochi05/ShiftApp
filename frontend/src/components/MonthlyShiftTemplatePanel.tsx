import { useEffect, useMemo, useState } from "react";

import { api } from "../api/client";
import "./MonthlyShiftTemplatePanel.css";

type MonthlyTemplateGroup = {
  template_group_id: string;
  template_name: string;
  source_year: number;
  source_month: number;
  count: number;
};

type MonthlyShiftTemplatePanelProps = {
  onApplied?: () => void;
};

function getCurrentYear() {
  return new Date().getFullYear();
}

function getCurrentMonth() {
  return new Date().getMonth() + 1;
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

export default function MonthlyShiftTemplatePanel({
  onApplied,
}: MonthlyShiftTemplatePanelProps) {
  const currentUserId = Number(localStorage.getItem("loginUserId") || 0);

  const [templateGroups, setTemplateGroups] = useState<MonthlyTemplateGroup[]>(
    []
  );

  const [sourceYear, setSourceYear] = useState(getCurrentYear());
  const [sourceMonth, setSourceMonth] = useState(getCurrentMonth());

  const [targetYear, setTargetYear] = useState(getCurrentYear());
  const [targetMonth, setTargetMonth] = useState(getCurrentMonth());

  const [templateName, setTemplateName] = useState("");
  const [selectedTemplateGroupId, setSelectedTemplateGroupId] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectedTemplate = useMemo(() => {
    return templateGroups.find(
      (template) => template.template_group_id === selectedTemplateGroupId
    );
  }, [templateGroups, selectedTemplateGroupId]);

  const fetchTemplateGroups = async () => {
    try {
      const res = await api.get<MonthlyTemplateGroup[]>(
        "/monthly-shift-templates/groups"
      );

      setTemplateGroups(res.data);

      if (!selectedTemplateGroupId && res.data.length > 0) {
        setSelectedTemplateGroupId(res.data[0].template_group_id);
      }
    } catch (error: any) {
      console.error("月テンプレート取得失敗:", error);
      setMessage(formatApiError(error, "月テンプレート取得に失敗しました"));
    }
  };

  useEffect(() => {
    fetchTemplateGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveMonthlyTemplate = async () => {
    const name =
      templateName.trim() || `${sourceYear}年${sourceMonth}月テンプレート`;

    const ok = window.confirm(
      `${sourceYear}年${sourceMonth}月のシフトを「${name}」として保存しますか？`
    );

    if (!ok) return;

    try {
      setLoading(true);
      setMessage("");

      const res = await api.post("/monthly-shift-templates/from-month", {
        source_year: sourceYear,
        source_month: sourceMonth,
        template_name: name,
        created_by: currentUserId || null,
      });

      setMessage(`月テンプレートを保存しました。保存件数：${res.data.length}件`);
      setTemplateName("");

      await fetchTemplateGroups();
    } catch (error: any) {
      console.error("月テンプレート保存失敗:", error);
      setMessage(formatApiError(error, "月テンプレート保存に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  const handleApplyMonthlyTemplate = async () => {
    if (!selectedTemplateGroupId || !selectedTemplate) {
      setMessage("反映する月テンプレートを選択してください");
      return;
    }

    const ok = window.confirm(
      `「${selectedTemplate.template_name}」を ${targetYear}年${targetMonth}月 に反映しますか？`
    );

    if (!ok) return;

    try {
      setLoading(true);
      setMessage("");

      const res = await api.post("/monthly-shift-templates/apply", {
        template_group_id: selectedTemplateGroupId,
        target_year: targetYear,
        target_month: targetMonth,
        created_by: currentUserId || null,
      });

      setMessage(
        `月テンプレートを反映しました。作成：${res.data.created_count}件 / スキップ：${res.data.skipped_count}件`
      );

      if (onApplied) {
        onApplied();
      }
    } catch (error: any) {
      console.error("月テンプレート反映失敗:", error);
      setMessage(formatApiError(error, "月テンプレート反映に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMonthlyTemplate = async () => {
    if (!selectedTemplateGroupId || !selectedTemplate) {
      setMessage("削除する月テンプレートを選択してください");
      return;
    }

    const ok = window.confirm(
      `「${selectedTemplate.template_name}」を削除しますか？`
    );

    if (!ok) return;

    try {
      setLoading(true);
      setMessage("");

      await api.delete(
        `/monthly-shift-templates/group/${selectedTemplateGroupId}`
      );

      setMessage("月テンプレートを削除しました");
      setSelectedTemplateGroupId("");

      await fetchTemplateGroups();
    } catch (error: any) {
      console.error("月テンプレート削除失敗:", error);
      setMessage(formatApiError(error, "月テンプレート削除に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="monthly-template-panel">
      <div className="monthly-template-header">
        <div>
          <p>MONTH TEMPLATE</p>
          <h3>月テンプレート</h3>
          <span>
            6月・7月のように、月全体のシフトを保存して別の月に反映できます。
          </span>
        </div>

        <button type="button" onClick={fetchTemplateGroups} disabled={loading}>
          再読み込み
        </button>
      </div>

      <div className="monthly-template-grid">
        <div className="monthly-template-card">
          <h4>月を保存</h4>

          <div className="monthly-template-form-grid">
            <label>
              保存する年
              <input
                type="number"
                value={sourceYear}
                onChange={(e) => setSourceYear(Number(e.target.value))}
                min="2020"
                max="2100"
              />
            </label>

            <label>
              保存する月
              <select
                value={sourceMonth}
                onChange={(e) => setSourceMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                  (month) => (
                    <option key={month} value={month}>
                      {month}月
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="monthly-template-name-field">
              テンプレート名
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder={`${sourceYear}年${sourceMonth}月テンプレート`}
              />
            </label>
          </div>

          <button
            type="button"
            className="monthly-template-save-button"
            onClick={handleSaveMonthlyTemplate}
            disabled={loading}
          >
            {loading ? "処理中..." : "この月をテンプレート保存"}
          </button>
        </div>

        <div className="monthly-template-card">
          <h4>月へ反映</h4>

          <label>
            テンプレートを選択
            <select
              value={selectedTemplateGroupId}
              onChange={(e) => setSelectedTemplateGroupId(e.target.value)}
            >
              <option value="">月テンプレートを選択</option>

              {templateGroups.map((template) => (
                <option
                  key={template.template_group_id}
                  value={template.template_group_id}
                >
                  {template.template_name}
                </option>
              ))}
            </select>
          </label>

          <div className="monthly-template-form-grid">
            <label>
              反映先の年
              <input
                type="number"
                value={targetYear}
                onChange={(e) => setTargetYear(Number(e.target.value))}
                min="2020"
                max="2100"
              />
            </label>

            <label>
              反映先の月
              <select
                value={targetMonth}
                onChange={(e) => setTargetMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                  (month) => (
                    <option key={month} value={month}>
                      {month}月
                    </option>
                  )
                )}
              </select>
            </label>
          </div>

          <div className="monthly-template-actions">
            <button
              type="button"
              onClick={handleApplyMonthlyTemplate}
              disabled={loading || !selectedTemplateGroupId}
            >
              {loading ? "反映中..." : "月テンプレートを反映"}
            </button>

            <button
              type="button"
              className="monthly-template-delete-button"
              onClick={handleDeleteMonthlyTemplate}
              disabled={loading || !selectedTemplateGroupId}
            >
              削除
            </button>
          </div>
        </div>
      </div>

      {message && <p className="monthly-template-message">{message}</p>}
    </section>
  );
}