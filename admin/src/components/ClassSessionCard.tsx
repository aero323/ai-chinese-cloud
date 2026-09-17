import type { ReactNode } from "react";
import { CalendarClock, MapPin, UsersRound } from "lucide-react";
import type { ClassSession, PlatformState } from "../domain/types";
import { fillRate, getBookedCount, getLesson, getTeacherSessions, getUser, getWaitlist } from "../lib/domain";
import { formatDateTime, formatRange, timeZoneLabel } from "../lib/format";
import { Avatar, Badge, ProgressBar } from "./ui";

export function ClassSessionCard({
  state,
  session,
  actions,
  compact = false,
  showTeacher = true
}: {
  state: PlatformState;
  session: ClassSession;
  actions?: ReactNode;
  compact?: boolean;
  showTeacher?: boolean;
}) {
  const lesson = getLesson(state, session.lessonId);
  const teacher = getUser(state, session.teacherId);
  const booked = getBookedCount(state, session.id);
  const waitlist = getWaitlist(state, session.id).length;
  const rate = fillRate(state, session);
  const remaining = Math.max(0, session.capacity - booked);

  return (
    <article className={`class-session-card ${compact ? "compact" : ""}`}>
      <span className="session-color" style={{ background: lesson?.color ?? "#6552ff" }} />
      <div className="session-main">
        <div className="session-topline">
          <Badge tone={session.status === "cancelled" ? "danger" : remaining === 0 ? "orange" : "mint"}>
            {session.status === "cancelled" ? "已取消" : remaining === 0 ? "已满" : `${remaining} 个余位`}
          </Badge>
          {session.source === "series" && <Badge tone="blue">系列班</Badge>}
          <span className="session-local-time">{timeZoneLabel(state.ui.timeZone)}</span>
        </div>
        <h3>{session.title}</h3>
        <p className="session-subtitle">
          {lesson?.coverEmoji} {lesson?.title} · {lesson?.subtitle}
        </p>
        <div className="session-meta">
          <span>
            <CalendarClock size={15} /> {formatDateTime(session.startAt, state.ui.timeZone, state.ui.language)} · {formatRange(session.startAt, session.endAt, state.ui.timeZone, state.ui.language)}
          </span>
          <span>
            <MapPin size={15} /> {session.roomLabel}
          </span>
          <span>
            <UsersRound size={15} /> {booked}/{session.capacity} {waitlist > 0 ? `· ${waitlist} 候补` : ""}
          </span>
        </div>
        {showTeacher && teacher && (
          <div className="session-teacher">
            <Avatar label={teacher.avatar} size="sm" tone="orange" />
            <span>
              <strong>{teacher.name}</strong>
              <small>{teacher.specialties?.slice(0, 2).join(" · ")}</small>
            </span>
          </div>
        )}
        <ProgressBar value={rate} tone={rate > 90 ? "orange" : "purple"} />
      </div>
      {actions && <div className="session-actions">{actions}</div>}
    </article>
  );
}
