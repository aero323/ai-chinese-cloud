import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, CalendarCheck, UsersRound } from "lucide-react";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, getBookedCount, getTeacherSessions, teacherMetrics } from "../../lib/domain";
import { Badge, Button, Card, EmptyState, PageHeader, Tabs } from "../../components/ui";
import { ClassSessionCard } from "../../components/ClassSessionCard";
import { CalendarModal } from "../../components/CalendarModal";

export function TeacherSchedule() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const state = usePlatformStore((store) => store.state);
  const user = currentUser(state);
  const sessions = getTeacherSessions(state, user.id);
  const [tab, setTab] = useState<"upcoming" | "past" | "all">("upcoming");
  const [calendarOpen, setCalendarOpen] = useState(false);
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
        description="查看课堂时间、预约人数和课程内容准备情况。排课归运营维护。"
      />

      <Card className="schedule-summary-strip teacher-strip">
        <div><strong>{metrics.upcoming.length}</strong><small>未来课堂</small></div>
        <div><strong>{metrics.booked}</strong><small>预约学生</small></div>
        <div><strong>{Math.round(metrics.fillRate)}%</strong><small>整体满班率</small></div>
        <button className="calendar-tile" onClick={() => setCalendarOpen(true)}>
          <span className="quick-ring purple-ring"><CalendarDays size={19} /></span>
          <strong>课程日历</strong>
          <small>共 {sessions.length} 节课 · 点开看每天安排</small>
        </button>
      </Card>

      <div className="section-heading-row">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "upcoming", label: "即将开始", count: metrics.upcoming.length },
            { value: "past", label: "历史课程", count: sessions.length - metrics.upcoming.length },
            { value: "all", label: "全部", count: sessions.length }
          ]}
        />
      </div>

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
                <Badge tone="blue"><UsersRound size={13} /> {getBookedCount(state, session.id)} 人</Badge>
                <Button onClick={() => navigate(`/teacher/session/${session.id}`)}>查看预约与内容</Button>
              </>
            }
          />
        ))}
        {filtered.length === 0 && <EmptyState title="暂无课程" description="运营排课后会出现在这里。" />}
      </div>

      <CalendarModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        state={state}
        sessions={sessions}
        detailSubtitle={(session) => `${getBookedCount(state, session.id)} 人预约`}
        monthNote={(count) => `本月 ${count} 节课`}
        renderAction={(session) => (
          <Button size="sm" variant="soft" onClick={() => navigate(`/teacher/session/${session.id}`)}>
            <CalendarCheck size={15} /> 查看预约与内容
          </Button>
        )}
      />
    </>
  );
}
