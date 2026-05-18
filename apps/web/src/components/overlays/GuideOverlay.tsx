import { useUIStore } from "../../stores/uiStore.js";

export function GuideOverlay() {
  const guide = useUIStore((s) => s.guide);
  const guideStep = useUIStore((s) => s.guideStep);
  const setGuide = useUIStore((s) => s.setGuide);
  const setGuideStep = useUIStore((s) => s.setGuideStep);

  if (!guide) return null;

  const steps = [
    {
      title: "把发光的养料拖进水里。",
      desc: "不同养料会改变潮池状态，但现在只需要先让它活起来。",
    },
  ];

  const current = steps[guideStep] ?? steps[0];
  const isLast = guideStep >= steps.length - 1;

  return (
    <div className="guide-overlay" onClick={() => setGuide(false)}>
      <div className="guide-toast" onClick={(e) => e.stopPropagation()}>
        {steps.length > 1 && <span className="guide-step-badge">{guideStep + 1}/{steps.length}</span>}
        <h4 className="guide-title">{current.title}</h4>
        <p className="guide-desc">{current.desc}</p>
        {isLast ? (
          <button className="btn-primary" onClick={() => setGuide(false)}>
            开始照看潮池
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
