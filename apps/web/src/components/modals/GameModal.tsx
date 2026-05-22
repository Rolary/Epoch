import { useState, type ReactNode } from "react";
import { useUIStore } from "../../stores/uiStore.js";

export function GameModal({ children, title, closing: closingProp = false }: { children: ReactNode; title?: string; closing?: boolean }) {
  const hideModal = useUIStore((s) => s.hideModal);
  const [closing, setClosing] = useState(false);
  const isClosing = closing || closingProp;

  const close = () => {
    if (isClosing) return;
    setClosing(true);
    window.setTimeout(hideModal, 180);
  };

  return (
    <div className={`modal-overlay ${isClosing ? "closing" : ""}`} onClick={close}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-header">
            <span className="modal-title">{title}</span>
            <button className="modal-close" onClick={close} aria-label="关闭">
              ×
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
