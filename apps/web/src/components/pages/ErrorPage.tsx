import { healthCheck } from "../../api.js";
import { uiAssets } from "../../assets/uiAssets.js";
import { useUIStore } from "../../stores/uiStore.js";

export function ErrorPage() {
  const setPage = useUIStore((s) => s.setPage);

  const retry = async () => {
    const ok = await healthCheck();
    if (ok) setPage("home");
  };

  return (
    <div className="page error-page">
      <div className="error-content">
        <img className="error-icon asset-empty-icon" src={uiAssets.resources.mutation} alt="" aria-hidden="true" />
        <h2 className="error-title">生态链连接中断</h2>
        <p className="error-desc">与始源潮池的连接暂时断开。请检查网络或稍后再试。</p>
        <button className="btn-primary" onClick={retry}>
          重新连接
        </button>
      </div>
    </div>
  );
}
