import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, Filter, Layers3, Search, UsersRound } from "lucide-react";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";
import {
  currentUser,
  fillRate,
  getBookedCount,
  getLesson,
  getSession,
  getWaitlist,
  isSessionBooked,
  isSessionWaitlisted
} from "../../lib/domain";
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Select, Tabs, TextInput } from "../../components/ui";
import { ClassSessionCard } from "../../components/ClassSessionCard";
import { MaterialCard } from "../../components/MaterialCard";
import { formatDate } from "../../lib/format";

type BookingTab = "single" | "series";

export function StudentBook() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, run } = usePlatformStore();
  const user = currentUser(state);
  const [tab, setTab] = useState<BookingTab>("single");
  const [day, setDay] = useState("all");
  const [teacherId, setTeacherId] = useState("all");
  const [folderId, setFolderId] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const upcomingSessions = state.sessions
    .filter((session) => session.status === "published" && new Date(session.endAt).getTime() > Date.now())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const dayOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ value: string; label: string; sub: string }> = [];
    upcomingSessions.forEach((session) => {
      const value = new Date(session.startAt).toDateString();
      if (seen.has(value)) return;
      seen.add(value);
      const date = new Date(session.startAt);
      options.push({
        value,
        label: new Intl.DateTimeFormat(state.ui.language, { timeZone: state.ui.timeZone, weekday: "short" }).format(date),
        sub: new Intl.DateTimeFormat(state.ui.language, { timeZone: state.ui.timeZone, month: "numeric", day: "numeric" }).format(date)
      });
    });
    return options.slice(0, 8);
  }, [state.ui.language, state.ui.timeZone, upcomingSessions]);

  const filteredSessions = upcomingSessions.filter((session) => {
    if (session.source !== "single") return false;
    const lesson = getLesson(state, session.lessonId);
    const matchesDay = day === "all" || new Date(session.startAt).toDateString() === day;
    const matchesTeacher = teacherId === "all" || session.teacherId === teacherId;
    const matchesFolder = folderId === "all" || lesson?.folderId === folderId;
    const matchesQuery = !query || session.title.toLowerCase().includes(query.toLowerCase()) || lesson?.title.toLowerCase().includes(query.toLowerCase());
    return matchesDay && matchesTeacher && matchesFolder && matchesQuery;
  });

  const seriesList = state.series.filter((series) => series.status === "published");
  const selectedSession = selectedSessionId ? getSession(state, selectedSessionId) : undefined;
  const selectedLesson = selectedSession ? getLesson(state, selectedSession.lessonId) : undefined;

  function bookSession(sessionId: string) {
    const result = run(
      () => platform.bookSession({ studentId: user.id, sessionId }),
      t("student.bookingSuccess")
    );
    if (result.code === "SESSION_FULL") {
      run(() => platform.joinWaitlist({ studentId: user.id, sessionId }), t("student.waitlistSuccess"));
    }
  }

  function actionForSession(sessionId: string) {
    if (isSessionBooked(state, user.id, sessionId)) {
      return <Badge tone="mint">{t("student.bookedAlready")}</Badge>;
    }
    if (isSessionWaitlisted(state, user.id, sessionId)) {
      const entry = state.waitlist.find((item) => item.studentId === user.id && item.status === "waiting" && (item.sessionId === sessionId || item.sessionIds.includes(sessionId)));
      return (
        <Button
          variant="secondary"
          onClick={() => entry && run(() => platform.leaveWaitlist({ waitlistId: entry.id }), "已退出候补")}
        >
          {t("student.waitlisted")}
        </Button>
      );
    }
    const session = getSession(state, sessionId);
    const full = session ? getBookedCount(state, sessionId) >= session.capacity : false;
    return (
      <Button variant={full ? "secondary" : "primary"} onClick={() => bookSession(sessionId)}>
        {full ? t("student.joinWaitlist") : t("student.bookNow")}
      </Button>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Booking center"
        title={t("student.bookTitle")}
        description={t("student.bookSubtitle")}
      />

      <Card className="booking-filter-card">
        <div className="booking-tabs-row">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "single", label: t("student.single"), count: upcomingSessions.length },
              { value: "series", label: t("student.series"), count: seriesList.length }
            ]}
          />
          <div className="search-box">
            <Search size={17} />
            <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索课节、主题或教师" />
          </div>
        </div>

        {tab === "single" && (
          <>
            <div className="date-ribbon">
              <button className={day === "all" ? "active" : ""} onClick={() => setDay("all")}>
                <CalendarDays size={17} />
                <strong>全部</strong>
                <small>未来课程</small>
              </button>
              {dayOptions.map((option) => (
                <button key={option.value} className={day === option.value ? "active" : ""} onClick={() => setDay(option.value)}>
                  <strong>{option.label}</strong>
                  <small>{option.sub}</small>
                </button>
              ))}
            </div>
            <div className="inline-filters">
              <Field label="课程目录">
                <Select value={folderId} onChange={(event) => setFolderId(event.target.value)}>
                  <option value="all">全部目录</option>
                  {state.folders.filter((folder) => folder.parentId).map((folder) => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="教师">
                <Select value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
                  <option value="all">全部教师</option>
                  {state.users.filter((item) => item.role === "teacher").map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
                </Select>
              </Field>
              <div className="filter-note">
                <Filter size={16} />
                <span>{filteredSessions.length} 个匹配班次</span>
              </div>
            </div>
          </>
        )}
      </Card>

      {tab === "single" ? (
        <div className="session-list">
          {filteredSessions.map((session) => {
            const remaining = Math.max(0, session.capacity - getBookedCount(state, session.id));
            const waitlist = getWaitlist(state, session.id).length;
            return (
              <ClassSessionCard
                key={session.id}
                state={state}
                session={session}
                actions={
                  <>
                    <Button variant="ghost" onClick={() => setSelectedSessionId(session.id)}>
                      {t("common.details")}
                    </Button>
                    {actionForSession(session.id)}
                    <span className="action-caption">
                      {remaining > 0 ? `${remaining} 个余位` : `${waitlist} 人候补`}
                    </span>
                  </>
                }
              />
            );
          })}
          {filteredSessions.length === 0 && <EmptyState title="没有匹配的班次" description="换一个日期或清空筛选条件再试试。" />}
        </div>
      ) : (
        <div className="series-grid">
          {seriesList.map((series) => {
            const sessions = series.sessionIds.map((id) => getSession(state, id)).filter(Boolean);
            const enrolled = sessions.some((session) => session && isSessionBooked(state, user.id, session.id));
            const waitlisted = sessions.some((session) => session && isSessionWaitlisted(state, user.id, session.id));
            const full = sessions.some((session) => session && getBookedCount(state, session.id) >= session.capacity);
            const lesson = getLesson(state, series.lessonId);
            return (
              <Card className="series-card" key={series.id}>
                <div className="series-cover" style={{ background: `linear-gradient(145deg, ${lesson?.color ?? "#6552ff"}, #f3efff)` }}>
                  <span>{lesson?.coverEmoji ?? "📚"}</span>
                  <Badge tone="purple">{series.sessionIds.length} 次课</Badge>
                </div>
                <div className="series-body">
                  <h2>{series.title}</h2>
                  <p>{series.description}</p>
                  <div className="series-meta">
                    <span>
                      <Layers3 size={16} /> {formatDate(sessions[0]?.startAt ?? series.createdAt, state.ui.timeZone, state.ui.language)}
                    </span>
                    <span>
                      <UsersRound size={16} /> {series.capacity} 人 · {Math.round(fillRate(state, sessions[0]!))}% 已满
                    </span>
                  </div>
                  <p className="series-dates-note">{t("student.seriesDatesNote")}</p>
                  <div className="series-session-dots">
                    {sessions.map((session) => (
                      <button key={session!.id} onClick={() => setSelectedSessionId(session!.id)}>
                        <strong>{new Intl.DateTimeFormat(state.ui.language, { timeZone: state.ui.timeZone, day: "2-digit" }).format(new Date(session!.startAt))}</strong>
                        <small>{new Intl.DateTimeFormat(state.ui.language, { timeZone: state.ui.timeZone, month: "short" }).format(new Date(session!.startAt))}</small>
                      </button>
                    ))}
                  </div>
                  {enrolled ? (
                    <Badge tone="mint">{t("student.bookedAlready")}</Badge>
                  ) : (
                    <Button
                      disabled={waitlisted}
                      variant={waitlisted || full ? "secondary" : "primary"}
                      onClick={() =>
                        run(
                          () => platform.enrollSeries({ studentId: user.id, seriesId: series.id, joinAsWaitlist: full }),
                          full ? t("student.waitlistSuccess") : "系列班报名成功"
                        )
                      }
                    >
                      {waitlisted ? t("student.waitlisted") : full ? t("student.joinWaitlist") : t("student.enroll")}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(selectedSession)}
        title={selectedSession?.title ?? t("common.details")}
        onClose={() => setSelectedSessionId(null)}
        width="720px"
      >
        {selectedSession && selectedLesson && (
          <div className="session-detail-modal">
            <div className="session-detail-hero" style={{ background: `linear-gradient(135deg, ${selectedLesson.color}, #ffffff)` }}>
              <span>{selectedLesson.coverEmoji}</span>
              <div>
                <Badge tone="purple">{selectedLesson.title}</Badge>
                <h3>{selectedLesson.description}</h3>
                <p>{selectedLesson.subtitle}</p>
              </div>
            </div>
            <div className="detail-grid">
              <div><small>上课时间</small><strong>{formatDate(selectedSession.startAt, state.ui.timeZone, state.ui.language)}</strong></div>
              <div><small>当地时区</small><strong>{state.ui.timeZone}</strong></div>
              <div><small>已预约</small><strong>{getBookedCount(state, selectedSession.id)} / {selectedSession.capacity}</strong></div>
              <div><small>预约截止</small><strong>{formatDate(selectedSession.bookingCloseAt, state.ui.timeZone, state.ui.language)}</strong></div>
            </div>
            <section className="modal-section">
              <h4>预习材料</h4>
              <div className="material-list compact-list">
                {state.materialRefs
                  .filter((ref) => ref.lessonId === selectedLesson.id && ref.phase === "preview")
                  .map((ref) => state.materials.find((material) => material.id === ref.materialId))
                  .filter(Boolean)
                  .map((material) => <MaterialCard key={material!.id} material={material!} />)}
                {state.materialRefs.filter((ref) => ref.lessonId === selectedLesson.id && ref.phase === "preview").length === 0 && (
                  <p className="muted-copy">{t("student.noMaterials")}</p>
                )}
              </div>
            </section>
          </div>
        )}
      </Modal>
    </>
  );
}
