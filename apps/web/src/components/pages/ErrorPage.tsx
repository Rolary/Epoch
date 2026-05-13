import { useUIStore } from "../../stores/uiStore.js";
import { healthCheck } from "../../api.js";

export function ErrorPage() {
  const setPage = useUIStore((s) => s.setPage);

  const retry = async () => {
    const ok = await healthCheck();
    if (ok) setPage("home");
  };

  return (
    <div className="page error-page">
      <div className="error-content">
        <span className="error-icon">⏚</span>
        <h2 className="error-title">生态链接中断</h2>
        <p className="error-desc">
          与始源潮池的连接暂时断开。请检查网络或稍后再试。
        </p>
        <button className="btn-primary" onClick={retry}>
          重新连接
        </button>
      </div>
    </div>
  );
}
