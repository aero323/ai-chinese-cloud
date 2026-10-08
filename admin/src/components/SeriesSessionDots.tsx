import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * 系列班的课次日期圆点。
 * 课次多（比如社团课一学期 24 节）时先折叠，点「还有 N 次」可以展开全部日期。
 */
export function SeriesSessionDots<T extends { id: string }>({
  sessions,
  visibleCount = 6,
  renderSession
}: {
  sessions: T[];
  visibleCount?: number;
  renderSession: (session: T) => ReactNode;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const collapsible = sessions.length > visibleCount + 1;
  const shown = expanded || !collapsible ? sessions : sessions.slice(0, visibleCount);

  return (
    <div className="series-session-dots">
      {shown.map((session) => renderSession(session))}
      {collapsible && (
        <button type="button" className="series-session-toggle" onClick={() => setExpanded((value) => !value)}>
          <strong>{expanded ? t("student.seriesCollapse") : `+${sessions.length - visibleCount}`}</strong>
          <small>{expanded ? t("student.seriesCollapseHint") : t("student.seriesShowAll")}</small>
        </button>
      )}
    </div>
  );
}
