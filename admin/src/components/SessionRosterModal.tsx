import { CalendarClock, GraduationCap, MapPin, UsersRound } from "lucide-react";
import { usePlatformStore } from "../store/usePlatformStore";
import { fillRate, getBookedCount, getLesson, getSession, getStudent, getUser, getWaitlist } from "../lib/domain";
import { formatDateTime, formatRange, formatTime } from "../lib/format";
import { Avatar, Modal, ProgressBar } from "./ui";
import { PmNote } from "./PmNote";

/**
 * 课次预约名单弹窗：从课表 / 首页 / 课堂设计页的「学生名单」入口直接弹出，
 * 只读展示这节课的预约与候补学生，不单独占用页面。
 */
export function SessionRosterModal({ sessionId, onClose }: { sessionId: string | null; onClose: () => void }) {
  const state = usePlatformStore((store) => store.state);
  const session = sessionId ? getSession(state, sessionId) : undefined;
  const lesson = session ? getLesson(state, session.lessonId) : undefined;

  if (!session || !lesson) return null;

  const bookings = state.bookings
    .filter((booking) => booking.sessionId === session.id && booking.status === "booked")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const waitlist = getWaitlist(state, session.id);
  const booked = getBookedCount(state, session.id);
  const remaining = Math.max(0, session.capacity - booked);

  return (
    <Modal open title={`预约名单 · ${session.title}`} onClose={onClose} width="1000px">
      <div className="roster-modal-head">
        <span className="session-hero-cover roster-modal-cover" style={{ background: `linear-gradient(135deg, ${lesson.color}, #f6f2ff)` }}>
          {lesson.coverEmoji}
        </span>
        <div>
          <h3>{lesson.title}</h3>
          <p>{lesson.description}</p>
          <div className="lesson-overview-meta">
            <span><GraduationCap size={16} /> {session.className}</span>
            <span><CalendarClock size={16} /> {formatDateTime(session.startAt, state.ui.timeZone, state.ui.language)}–{formatTime(session.endAt, state.ui.timeZone, state.ui.language)}</span>
            <span><MapPin size={16} /> {session.roomLabel}</span>
            <span><UsersRound size={16} /> {booked}/{session.capacity}</span>
          </div>
        </div>
        <div className="roster-modal-progress">
          <strong>{Math.round(fillRate(state, session))}%</strong>
          <small>满班率</small>
          <ProgressBar value={fillRate(state, session)} tone={fillRate(state, session) > 90 ? "orange" : "purple"} />
        </div>
      </div>

      <div className="roster-metrics">
        <div><strong>{booked}</strong><small>已预约</small></div>
        <div><strong>{remaining}</strong><small>剩余名额</small></div>
        <div><strong>{waitlist.length}</strong><small>候补学生</small></div>
        <div><strong>{formatRange(session.startAt, session.endAt, state.ui.timeZone, state.ui.language)}</strong><small>上课时间</small></div>
      </div>

      <div className="modal-section">
        <div className="roster-modal-section-head">
          <h4>预约学生</h4>
        </div>
        <div className="roster-list">
          {bookings.map((booking) => {
            const user = getUser(state, booking.studentId);
            const profile = getStudent(state, booking.studentId);
            if (!user || !profile) return null;
            return (
              <article className="roster-row roster-row-compact" key={booking.id}>
                <Avatar label={user.avatar} tone="purple" />
                <div>
                  <strong>{user.name} · {profile.level}</strong>
                  <small>班级：{profile.className ?? "待分班"}</small>
                  <small>时区 {user.timeZone} · 预约于 {formatDateTime(booking.createdAt, state.ui.timeZone, state.ui.language)}</small>
                </div>
              </article>
            );
          })}
          {bookings.length === 0 && <p className="muted-copy">还没有学生预约这节课。</p>}
        </div>
      </div>

      {waitlist.length > 0 && (
        <div className="modal-section">
          <div className="roster-modal-section-head">
            <PmNote kind="规则" note="候补是班级满员后才产生的；一期暂不做，等线上报名等能力完成后再考虑。当前按加入时间排序，释放名额后自动转正并通知学生。">
              <h4>候补名单</h4>
            </PmNote>
          </div>
          <div className="roster-list">
            {waitlist.map((entry) => {
              const user = getUser(state, entry.studentId);
              const profile = getStudent(state, entry.studentId);
              if (!user || !profile) return null;
              return (
                <article className="roster-row roster-row-compact" key={entry.id}>
                  <Avatar label={user.avatar} tone="orange" />
                  <div>
                    <strong>{user.name} · {profile.level}</strong>
                    <small>班级：{profile.className ?? "待分班"}</small>
                    <small>候补于 {formatDateTime(entry.createdAt, state.ui.timeZone, state.ui.language)}</small>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
