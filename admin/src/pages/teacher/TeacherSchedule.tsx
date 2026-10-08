import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, CalendarCheck, Layers3, Send, UsersRound } from "lucide-react";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, getBookedCount, getTeacherSessions, teacherMetrics } from "../../lib/domain";
import { Button, Card, EmptyState, PageHeader, Tabs } from "../../components/ui";
import { ClassSessionCard } from "../../components/ClassSessionCard";
import { CalendarModal } from "../../components/CalendarModal";
import { PmNote } from "../../components/PmNote";
import { SessionRosterModal } from "../../components/SessionRosterModal";
import { SessionChangeRequestModal } from "../../components/SessionChangeRequestModal";

export function TeacherSchedule() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const state = usePlatformStore((store) => store.state);
  const user = currentUser(state);
  const sessions = getTeacherSessions(state, user.id);
  const [tab, setTab] = useState<"upcoming" | "past" | "all">("upcoming");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [rosterSessionId, setRosterSessionId] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // 消息中心的通知会带着 ?roster=课次 跳进来，直接弹出预约名单。
  useEffect(() => {
    const rosterId = searchParams.get("roster");
    if (!rosterId) return;
    setRosterSessionId(rosterId);
    const next = new URLSearchParams(searchParams);
    next.delete("roster");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const now = Date.now();
  const filtered = sessions.filter((session) => {
    if (tab === "upcoming") return new Date(session.endAt).getTime() >= now;
    if (tab === "past") return new Date(session.endAt).getTime() < now;
    return true;
  });
  const metrics = teacherMetrics(state, user.id);

  return (
    <>
      <PageHeader
        eyebrow="Teaching schedule"
        title={t("nav.schedule")}
        description="查看课堂时间、预约人数和课程内容准备情况。排课归教学管理维护。"
        actions={
          <PmNote kind="注意" note="点击后提交调课、加课或取消申请，结果回到消息中心。一期不做，等教学管理与运营能力完整后再实现。">
            <Button variant="secondary" onClick={() => setRequestOpen(true)}>
              <Send size={16} /> 申请调整
            </Button>
          </PmNote>
        }
      />

      <PmNote block kind="口径" note="未来课堂按课次结束时间判断；满班率汇总已发布课次的席位占用。">
        <Card className="schedule-summary-strip teacher-strip">
          <div><strong>{metrics.upcoming.length}</strong><small>未来课堂</small></div>
          <div><strong>{metrics.booked}</strong><small>总学生数</small></div>
          <div><strong>{Math.round(metrics.fillRate)}%</strong><small>整体满班率</small></div>
          <button className="calendar-tile" onClick={() => setCalendarOpen(true)}>
            <span className="quick-ring purple-ring"><CalendarDays size={19} /></span>
            <strong>课程日历</strong>
            <small>共 {sessions.length} 节课 · 点开看每天安排</small>
          </button>
        </Card>
      </PmNote>

      <div className="section-heading-row">
        <PmNote kind="规则" note="即将开始与历史课程都以课次结束时间为分界。">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "upcoming", label: "即将开始", count: metrics.upcoming.length },
              { value: "past", label: "历史课程", count: sessions.length - metrics.upcoming.length },
              { value: "all", label: "全部", count: sessions.length }
            ]}
          />
        </PmNote>
      </div>

      <PmNote block kind="流程" note="学生名单只读；课堂设计进入该课次的课前、课中、课后配置。">
        <div className="session-list">
        {filtered.map((session) => (
          <ClassSessionCard
            key={session.id}
            state={state}
            session={session}
            showTeacher={false}
            showSeats={false}
            actions={
              <>
                <Button variant="secondary" onClick={() => setRosterSessionId(session.id)}>
                  <UsersRound size={15} /> 查看学生名单
                </Button>
                <Button onClick={() => navigate(`/teacher/session/${session.id}/design`)}>
                  <Layers3 size={15} /> 查看课堂设计
                </Button>
              </>
            }
          />
        ))}
        {filtered.length === 0 && <EmptyState title="暂无课程" description="教学管理排课后会出现在这里。" />}
        </div>
      </PmNote>

      <CalendarModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        state={state}
        sessions={sessions}
        detailSubtitle={(session) => `${getBookedCount(state, session.id)} 人预约`}
        monthNote={(count) => `本月 ${count} 节课`}
        renderAction={(session) => (
          <div className="calendar-session-actions">
            <Button size="sm" variant="secondary" onClick={() => setRosterSessionId(session.id)}>
              <UsersRound size={15} /> 学生名单
            </Button>
            <Button size="sm" variant="soft" onClick={() => navigate(`/teacher/session/${session.id}/design`)}>
              <CalendarCheck size={15} /> 课堂设计
            </Button>
          </div>
        )}
      />

      <SessionRosterModal sessionId={rosterSessionId} onClose={() => setRosterSessionId(null)} />

      <SessionChangeRequestModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        sessions={sessions}
        teacherId={user.id}
        defaultSessionId={rosterSessionId ?? undefined}
      />
    </>
  );
}
