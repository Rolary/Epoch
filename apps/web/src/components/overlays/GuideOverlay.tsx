import { useUIStore } from "../../stores/uiStore.js";

export function GuideOverlay() {
  const guide = useUIStore((s) => s.guide);
  const guideStep = useUIStore((s) => s.guideStep);
  const setGuide = useUIStore((s) => s.setGuide);
  const setGuideStep = useUIStore((s) => s.setGuideStep);

  if (!guide) return null;

  const steps = [
    { title: "引入元素", desc: "按住潮池周围的晶石、闪光或液滴，把它们拖入池中。" },
    { title: "触发反应", desc: "元素入池会推动资源增长，偶尔失衡，生态自会调整。" },
    { title: "点亮演化", desc: "资源积累后，演化入口出现。点亮节点推动纪元推进。" },
    { title: "发现物种", desc: "当稳定性与突变积累足够，潮池中将出现第一批谱系。" },
  ];

  const current = steps[guideStep] ?? steps[0];
  const isLast = guideStep >= steps.length - 1;

  return (
    <div className="guide-overlay" onClick={() => setGuide(false)}>
      <div className="guide-toast" onClick={(e) => e.stopPropagation()}>
        <span className="guide-step-badge">{guideStep + 1}/{steps.length}</span>
        <h4 className="guide-title">{current.title}</h4>
        <p className="guide-desc">{current.desc}</p>
        {isLast ? (
          <button className="btn-primary" onClick={() => setGuide(false)}>
            开始演化
          </button>
        ) : (
          <button className="btn-secondary" onClick={() => setGuideStep(guideStep + 1)}>
            下一步
          </button>
        )}
      </div>
    </div>
  );
}
