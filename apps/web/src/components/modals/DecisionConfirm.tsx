import { useEffect, useState } from "react";
import { useUIStore } from "../../stores/uiStore.js";
import { GameModal } from "./GameModal.js";

export function DecisionConfirm() {
  const modalData = useUIStore((s) => s.modalData);
  const hideModal = useUIStore((s) => s.hideModal);
  const [submitting, setSubmitting] = useState(false);

  const title = (modalData.title as string) ?? "确定采用这个选择吗？";
  const description = (modalData.description as string) ?? "";
  const gain = (modalData.gain as string) ?? "";
  const cost = (modalData.cost as string) ?? "";
  const reminder = (modalData.reminder as string) ?? "确认后，当前资源和环境会立即变化；后续仍可能出现其他方向。";
  const confirmLabel = (modalData.confirmLabel as string) ?? "确认选择";
  const cancelLabel = (modalData.cancelLabel as string) ?? "返回";
  const onConfirm = modalData.onConfirm as (() => void | Promise<void>) | undefined;
  const onCancel = modalData.onCancel as (() => void) | undefined;
  const previewOptionId = modalData.previewOptionId as string | undefined;

  useEffect(() => {
    if (!previewOptionId) return;
    window.dispatchEvent(new CustomEvent("shoreline-choice-preview", { detail: { optionId: previewOptionId } }));
    return () => {
      window.dispatchEvent(new CustomEvent("shoreline-choice-preview", { detail: { optionId: null } }));
    };
  }, [previewOptionId]);

  const handleConfirm = async () => {
    if (!onConfirm || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
      hideModal();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GameModal title={title}>
      <div className="decision-confirm">
        {description && <p className="decision-copy">{description}</p>}
        {gain && (
          <div className="decision-block">
            <span className="decision-label">选择结果</span>
            <strong>{gain}</strong>
          </div>
        )}
        {cost && (
          <div className="decision-block danger">
            <span className="decision-label">短期代价</span>
            <strong>{cost}</strong>
          </div>
        )}
        <p className="decision-reminder">{reminder}</p>
        <div className="decision-actions">
          <button
            className="btn-secondary"
            type="button"
            onClick={() => {
              if (onCancel) onCancel();
              else hideModal();
            }}
            disabled={submitting}
          >
            {cancelLabel}
          </button>
          <button className="btn-primary" type="button" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "水面正在变化" : confirmLabel}
          </button>
        </div>
      </div>
    </GameModal>
  );
}
