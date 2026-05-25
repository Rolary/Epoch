import { useUIStore } from "../../stores/uiStore.js";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

const CloseSheetContext = createContext<() => void>(() => undefined);

export function useCloseSheet() {
  return useContext(CloseSheetContext);
}

export function BottomSheet({ children, variant = "bottom" }: { children: ReactNode; variant?: "bottom" | "drawer" }) {
  const hideSheet = useUIStore((s) => s.hideSheet);
  const [closing, setClosing] = useState(false);
  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(hideSheet, 220);
  }, [hideSheet]);
  const value = useMemo(() => close, [close]);

  return (
    <CloseSheetContext.Provider value={value}>
      <div className={`sheet-backdrop ${closing ? "closing" : ""}`} onClick={close} />
      <div className={`bottom-sheet sheet-${variant} ${closing ? "closing" : ""}`}>
        <div className="sheet-handle" />
        {children}
      </div>
    </CloseSheetContext.Provider>
  );
}
