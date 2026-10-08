import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";

export type PmNoteKind = "流程" | "规则" | "口径" | "注意";

export const PM_NOTE_VISIBILITY_KEY = "ai-chinese-cloud-pm-notes-visible";
const PM_NOTE_VISIBILITY_EVENT = "aicloud:pm-note-visibility";

export function getPmNoteVisibility() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(PM_NOTE_VISIBILITY_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setPmNoteVisibility(visible: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("pm-notes-hidden", !visible);
  try {
    window.localStorage.setItem(PM_NOTE_VISIBILITY_KEY, visible ? "true" : "false");
  } catch {
    // 本地存储不可用时仍保留当前页面的开关效果。
  }
  window.dispatchEvent(new Event(PM_NOTE_VISIBILITY_EVENT));
}

if (typeof document !== "undefined") {
  document.documentElement.classList.toggle("pm-notes-hidden", !getPmNoteVisibility());
}

/**
 * 给研发查看的产品逻辑标注。提示层挂到 body，避免被卡片、弹窗的 overflow 裁掉。
 */
export function PmNote({
  note,
  kind = "规则",
  children,
  block = false,
  className = ""
}: {
  note: string;
  kind?: PmNoteKind;
  children: ReactNode;
  block?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const badgeRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const tooltipId = useId();

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current === null) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const closeSoon = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 120);
  }, [clearCloseTimer]);

  const show = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  useLayoutEffect(() => {
    if (!open) return;

    const reposition = () => {
      const badge = badgeRef.current;
      const tooltip = tooltipRef.current;
      if (!badge || !tooltip) return;

      const badgeRect = badge.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const gap = 10;
      const viewportPadding = 8;
      const hasRoomAbove = badgeRect.top - gap - tooltipRect.height >= viewportPadding;
      const hasRoomBelow = badgeRect.bottom + gap + tooltipRect.height <= window.innerHeight - viewportPadding;

      let top = badgeRect.bottom + gap;
      if (!hasRoomBelow && hasRoomAbove) top = badgeRect.top - tooltipRect.height - gap;

      const left = Math.min(
        window.innerWidth - tooltipRect.width - viewportPadding,
        Math.max(viewportPadding, badgeRect.right - tooltipRect.width)
      );
      const clampedTop = Math.min(
        window.innerHeight - tooltipRect.height - viewportPadding,
        Math.max(viewportPadding, top)
      );

      setTooltipStyle({ left, top: clampedTop, visibility: "visible" });
    };

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (badgeRef.current?.contains(target) || tooltipRef.current?.contains(target)) return;
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  useEffect(() => {
    const closeForVisibilityChange = () => setOpen(false);
    window.addEventListener(PM_NOTE_VISIBILITY_EVENT, closeForVisibilityChange);
    return () => window.removeEventListener(PM_NOTE_VISIBILITY_EVENT, closeForVisibilityChange);
  }, []);

  return (
    <span className={`pm-note-wrap ${block ? "pm-note-wrap-block" : ""} ${className}`.trim()}>
      {children}
      <button
        ref={badgeRef}
        type="button"
        className="pm-note-badge"
        aria-label={`${kind}标注：${note}`}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onMouseEnter={show}
        onMouseLeave={closeSoon}
        onFocus={show}
        onBlur={closeSoon}
      >
        注
      </button>
      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            className="pm-note-tooltip"
            role="tooltip"
            style={tooltipStyle}
            onMouseEnter={clearCloseTimer}
            onMouseLeave={closeSoon}
          >
            <span className={`pm-note-kind pm-note-kind-${kind}`}>{kind}</span>
            <span>{note}</span>
          </div>,
          document.body
        )}
    </span>
  );
}
