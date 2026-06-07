import "./ShiftPrintPage.css";

function ShiftPrintPage() {
  return (
    <div className="shift-print-page">
      <header className="print-toolbar">
        <div>
          <h1>シフト表印刷</h1>
          <p>週ごとのシフト表をPDF保存・印刷できます。</p>
        </div>

        <button type="button" onClick={() => window.print()}>
          PDF・印刷
        </button>
      </header>

      <section className="print-sheet">
        <h2>週ごとのシフト表</h2>
        <p>
          ここに週ごとのシフト表を表示します。
          次のステップでシフトデータを取得して印刷用レイアウトにします。
        </p>
      </section>
    </div>
  );
}

export default ShiftPrintPage;