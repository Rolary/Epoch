import { useUIStore } from "../../stores/uiStore.js";
import type { ReactNode } from "react";

export function BottomSheet({ children }: { children: ReactNode }) {
  const hideSheet = useUIStore((s) => s.hideSheet);
  return (
    <>
      <div className="sheet-backdrop" onClick={hideSheet} />
      <div className="bottom-sheet">
        <div className="sheet-handle" />
        {children}
      </div>
    </>
  );
}
