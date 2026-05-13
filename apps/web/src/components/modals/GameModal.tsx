import type { ReactNode } from "react";
import { useUIStore } from "../../stores/uiStore.js";

export function GameModal({ children, title }: { children: ReactNode; title?: string }) {
  const hideModal = useUIStore((s) => s.hideModal);
  return (
    <div className="modal-overlay" onClick={hideModal}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-header">
            <span className="modal-title">{title}</span>
            <button className="modal-close" onClick={hideModal}>×</button>
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
