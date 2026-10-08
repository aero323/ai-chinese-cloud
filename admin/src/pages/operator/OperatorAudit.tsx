import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileClock, Filter, Search } from "lucide-react";
import { usePlatformStore } from "../../store/usePlatformStore";
import { getUser, currentUser } from "../../lib/domain";
import { getAcademicSchoolId, workspaceState } from "../../lib/academicScope";
import { formatDateTime } from "../../lib/format";
import { Avatar, Badge, Card, EmptyState, PageHeader, TextInput } from "../../components/ui";

export function OperatorAudit({ academic = false }: { academic?: boolean } = {}) {
  const { t } = useTranslation();
  const state = usePlatformStore((store) => store.state);
  const user = currentUser(state);
  const scopedState = academic ? workspaceState(state, getAcademicSchoolId(state, user)) : state;
  const [query, setQuery] = useState("");
  const events = scopedState.auditEvents.filter((event) => {
    const actor = getUser(scopedState, event.actorId);
    return !query || event.summary.includes(query) || actor?.name.includes(query) || event.action.includes(query);
  });

  return (
    <>
      <PageHeader
        eyebrow="Audit trail"
        title={academic ? "本校操作日志" : t("operator.auditTitle")}
        description={academic ? "记录本校排课、报名审核、学生、考务与成绩修正等关键操作。" : t("operator.auditSubtitle")}
      />

      <Card className="content-filter-bar">
        <div className="search-box wide">
          <Search size={17} />
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索操作、目标或操作人" />
        </div>
        <Badge tone="neutral"><Filter size={13} /> {events.length} 条记录</Badge>
      </Card>

      <Card className="audit-table-card">
        <div className="audit-table">
          <div className="audit-table-head"><span>操作</span><span>操作人</span><span>时间</span><span>原因</span></div>
          {events.map((event) => {
            const actor = getUser(scopedState, event.actorId);
            return (
              <div className="audit-table-row" key={event.id}>
                <span>
                  <FileClock size={17} />
                  <span><strong>{event.summary}</strong><small>{event.action} · {event.targetType} / {event.targetId}</small></span>
                </span>
                <span className="audit-actor">
                  {actor ? <Avatar label={actor.avatar} size="sm" tone={actor.role === "teacher" ? "orange" : actor.role === "operator" ? "blue" : actor.role === "academic" ? "mint" : "purple"} /> : <span className="system-dot">S</span>}
                  <strong>{actor?.name ?? "System"}</strong>
                </span>
                <span>{formatDateTime(event.createdAt, scopedState.ui.timeZone, scopedState.ui.language)}</span>
                <span>{event.reason || "—"}</span>
              </div>
            );
          })}
        </div>
        {events.length === 0 && <EmptyState title="暂无操作记录" />}
      </Card>
    </>
  );
}
