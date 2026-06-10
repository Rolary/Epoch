import { useEffect, useId, useRef, useState } from "react";

const OPEN_TAG_EVENT = "eco-context-tag-open";

export function ContextTag({
  label,
  value,
  description,
  icon,
  placement = "below",
  className = "",
}: {
  label: string;
  value?: string;
  description: string;
  icon: string;
  placement?: "above" | "below";
  className?: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOther = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) setOpen(false);
    };
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const timer = window.setTimeout(() => setOpen(false), 4200);
    window.addEventListener(OPEN_TAG_EVENT, closeOther);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(OPEN_TAG_EVENT, closeOther);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [id, open]);

  return (
    <span ref={rootRef} className={`context-tag ${placement} ${open ? "open" : ""} ${className}`}>
      <button
        type="button"
        className="context-tag-trigger"
        aria-label={`${label}${value ? `，${value}` : ""}`}
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          if (next) window.dispatchEvent(new CustomEvent(OPEN_TAG_EVENT, { detail: id }));
          setOpen(next);
        }}
      >
        <img src={icon} alt="" aria-hidden="true" />
        {value && <span>{value}</span>}
      </button>
      {open && (
        <span className="context-tag-popover" role="status">
          <strong>{label}</strong>
          {value && <span className="context-tag-value">{value}</span>}
          <span>{description}</span>
        </span>
      )}
    </span>
  );
}
