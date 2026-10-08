import type { ReactNode } from "react";
import { BatteryFull, ChevronLeft, SignalHigh, Wifi } from "lucide-react";

/**
 * 学生端手机壳：编辑器里的单题预览和「预览全部互动」共用同一套外壳，
 * 内部只负责排版，具体画面由调用方放进 student-preview-screen。
 */
export function StudentPhoneMock({
  typeLabel,
  current,
  total,
  children
}: {
  typeLabel: string;
  current?: number;
  total?: number;
  children: ReactNode;
}) {
  return (
    <div className="student-preview-phone">
      <span className="student-preview-notch" />
      <div className="student-preview-statusbar">
        <span>9:41</span>
        <span className="student-preview-status-icons">
          <SignalHigh size={12} />
          <Wifi size={12} />
          <BatteryFull size={14} />
        </span>
      </div>
      <div className="student-preview-viewport">
        <div className="student-preview-appbar">
          <ChevronLeft size={15} />
          <strong>{typeLabel}</strong>
          {typeof total === "number" && (
            <small>
              {current ?? 1} / {total}
            </small>
          )}
        </div>
        <div className="student-preview-screen">{children}</div>
      </div>
      <span className="student-preview-home" />
    </div>
  );
}
