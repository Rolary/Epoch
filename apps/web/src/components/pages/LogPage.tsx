import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";

export function LogPage() {
  const logs = useGameStore((s) => s.logs());
  const setPage = useUIStore((s) => s.setPage);

  if (logs.length === 0) {
    return (
      <div className="page log-page">
        <h2 className="page-title">演化日志</h2>
        <div className="empty-state">
          <span className="empty-icon">☰</span>
          <p className="empty-title">演化历史将在此记录</p>
          <p className="empty-hint">催化潮池、发现物种或经历事件后，日志会记录这段生命史。</p>
          <button className="btn-secondary" onClick={() => setPage("home")}>返回潮池</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page log-page">
      <h2 className="page-title">演化日志</h2>
      <div className="log-list">
        {logs.slice(0, 50).map((entry) => (
          <div key={entry.id} className={`log-entry log-${entry.type}`}>
            <span className="log-type">{typeIcon(entry.type)}</span>
            <span className="log-msg">{entry.message}</span>
            <span className="log-time">{formatTime(entry.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function typeIcon(type: string): string {
  const m: Record<string, string> = {
    system: "🔄", event: "⚡", species: "🧬", legacy: "❖", era: "🌟",
  };
  return m[type] ?? "·";
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}
