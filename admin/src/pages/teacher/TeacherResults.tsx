import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart3, CalendarClock, ChevronRight, Clock3, GraduationCap, MapPin, Search, TrendingUp, UsersRound } from "lucide-react";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, getTeacherSessions } from "../../lib/domain";
import { buildClassAnalytics, type ClassAnalytics, type ClassContentRow, type ClassContentStudent } from "../../lib/classAnalytics";
import { formatDateTime, formatRange } from "../../lib/format";
import { Avatar, Badge, Card, EmptyState, Modal, PageHeader, ProgressBar, Select, StatCard, TextInput } from "../../components/ui";
import { PmNote } from "../../components/PmNote";
import type { ClassSession, Phase } from "../../domain/types";

const statusMeta = {
  good: { label: "完成较好", tone: "mint" as const },
  ok: { label: "基本完成", tone: "blue" as const },
  weak: { label: "需要关注", tone: "orange" as const }
};

const phaseRank: Record<Phase, number> = { preview: 0, live: 1, review: 2 };
const phaseLabel = (phase: Phase) => (phase === "preview" ? "课前" : phase === "live" ? "课中" : "课后");

interface StudentItem {
  id: string;
  kind: ClassContentRow["kind"];
  title: string;
  phase: Phase;
  detail: string;
  actionLabel: string;
  done: boolean;
  minutes: number;
  completedAt: string;
}

interface StudentDetailRow {
  studentId: string;
  name: string;
  avatar: string;
  level: string;
  className: string;
  doneCount: number;
  total: number;
  minutes: number;
  lastAt: string;
  items: StudentItem[];
}

/** 从内容维度翻转成学生维度：每个学生完成了哪些项、用了多久。 */
function buildStudentRows(analytics: ClassAnalytics): StudentDetailRow[] {
  const map = new Map<string, StudentDetailRow>();
  analytics.rows.forEach((row) => {
    row.students.forEach((student: ClassContentStudent) => {
      const entry = map.get(student.studentId) ?? {
        studentId: student.studentId,
        name: student.name,
        avatar: student.avatar,
        level: student.level,
        className: student.className,
        doneCount: 0,
        total: 0,
        minutes: 0,
        lastAt: "",
        items: []
      };
      entry.total += 1;
      if (student.done) {
        entry.doneCount += 1;
        entry.minutes += student.minutes;
        if (student.completedAt > entry.lastAt) entry.lastAt = student.completedAt;
      }
      entry.items.push({
        id: row.id,
        kind: row.kind,
        title: row.title,
        phase: row.phase,
        detail: row.detail,
        actionLabel: row.actionLabel,
        done: student.done,
        minutes: student.minutes,
        completedAt: student.completedAt
      });
      map.set(student.studentId, entry);
    });
  });
  return [...map.values()]
    .map((row) => ({ ...row, items: [...row.items].sort((a, b) => phaseRank[a.phase] - phaseRank[b.phase] || a.title.localeCompare(b.title)) }))
    .sort((a, b) => b.doneCount / (b.total || 1) - a.doneCount / (a.total || 1) || b.minutes - a.minutes);
}

export function TeacherResults() {
  const state = usePlatformStore((store) => store.state);
  const user = currentUser(state);
  const teacherSessions = useMemo(() => getTeacherSessions(state, user.id), [state, user.id]);
  // 首页「最近课程结果」等入口可以带 ?sessionId= 直接切到对应课次。
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => searchParams.get("sessionId") ?? "");
  const [sessionQuery, setSessionQuery] = useState("");
  const [sessionTimeRange, setSessionTimeRange] = useState<"all" | "today" | "7d" | "30d">("all");
  const [view, setView] = useState<"class" | "students">("class");
  const [drilldown, setDrilldown] = useState<ClassContentRow | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetailRow | null>(null);

  // 课程结果只展示已经上完的课次，并按上课时间从近到远排列。
  const completedSessions = useMemo(
    () =>
      teacherSessions
        .filter((session) => new Date(session.endAt).getTime() < Date.now())
        .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()),
    [teacherSessions]
  );

  useEffect(() => {
    if (completedSessions.length === 0) {
      if (selectedSessionId) setSelectedSessionId("");
      return;
    }
    if (selectedSessionId && completedSessions.some((session) => session.id === selectedSessionId)) return;
    setSelectedSessionId(completedSessions[0].id);
  }, [completedSessions, selectedSessionId]);

  // 带上来的 sessionId 用完就清掉，避免地址栏残留影响后续切换。
  useEffect(() => {
    if (!searchParams.get("sessionId")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("sessionId");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const visibleSessions = useMemo(() => {
    const now = Date.now();
    const keyword = sessionQuery.trim().toLowerCase();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const minStartAt =
      sessionTimeRange === "today"
        ? startOfToday.getTime()
        : sessionTimeRange === "7d"
          ? now - 7 * 24 * 60 * 60 * 1000
          : sessionTimeRange === "30d"
            ? now - 30 * 24 * 60 * 60 * 1000
            : Number.NEGATIVE_INFINITY;
    return completedSessions.filter((item) => {
      const startAt = new Date(item.startAt).getTime();
      const matchesTime = startAt >= minStartAt;
      const searchText = `${item.title} ${item.roomLabel} ${formatDateTime(item.startAt, state.ui.timeZone, state.ui.language)}`.toLowerCase();
      return matchesTime && (!keyword || searchText.includes(keyword));
    });
  }, [completedSessions, sessionQuery, sessionTimeRange, state.ui.language, state.ui.timeZone]);

  useEffect(() => {
    if (visibleSessions.length === 0) return;
    if (visibleSessions.some((item) => item.id === selectedSessionId)) return;
    setSelectedSessionId(visibleSessions[0].id);
  }, [selectedSessionId, visibleSessions]);

  const session = completedSessions.find((item) => item.id === selectedSessionId) ?? completedSessions[0];
  const analytics = useMemo(() => (session ? buildClassAnalytics(state, session) : null), [state, session]);
  const studentRows = useMemo(() => (analytics ? buildStudentRows(analytics) : []), [analytics]);

  if (!session || !analytics) {
    return (
      <>
        <PageHeader eyebrow="Class analytics" title="课程结果" />
        <EmptyState title="暂无已结束课次" description="上完课后，课程结果会按上课时间倒序出现在这里。" />
      </>
    );
  }

  const participation = analytics.rosterSize ? Math.round((analytics.reachedStudents / analytics.rosterSize) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow="Class analytics"
        title="课程结果"
        description="按课次看整个班级的完成情况：哪些环节完成得好、哪些需要补，也可以按学生下钻看他做完的每一项。"
      />

      <div className="analytics-layout">
        <aside className="analytics-session-nav">
          <div className="analytics-session-filters">
            <div className="search-box">
              <Search size={15} />
              <TextInput value={sessionQuery} onChange={(event) => setSessionQuery(event.target.value)} placeholder="搜索课次" aria-label="搜索课次" />
            </div>
            <Select
              value={sessionTimeRange}
              onChange={(event) => setSessionTimeRange(event.target.value as "all" | "today" | "7d" | "30d")}
              aria-label="按时间筛选"
            >
              <option value="all">全部时间</option>
              <option value="today">今天</option>
              <option value="7d">近 7 天</option>
              <option value="30d">近 30 天</option>
            </Select>
          </div>
          <div className="analytics-session-list">
            {visibleSessions.map((item) => {
              const itemAnalytics = buildClassAnalytics(state, item);
              return (
                <button
                  key={item.id}
                  className={item.id === session.id ? "active" : ""}
                  onClick={() => setSelectedSessionId(item.id)}
                >
                  <span className="nav-session-date">
                    <span>{formatDateTime(item.startAt, state.ui.timeZone, state.ui.language)}</span>
                    <span className="nav-session-room">· {item.roomLabel}</span>
                  </span>
                  <strong>{item.title}</strong>
                  <small>
                    全班人数 {itemAnalytics.rosterSize} 人
                    {!itemAnalytics.totalActions && " · 暂无记录"}
                  </small>
                </button>
              );
            })}
            {visibleSessions.length === 0 && <p className="analytics-session-empty">没有匹配的课次</p>}
          </div>
        </aside>

        <div className="analytics-detail">
          <Card className="analytics-session-head">
            <div>
              <h2>{session.title}</h2>
              <div className="session-meta">
                <span><GraduationCap size={15} /> {session.className}</span>
                <span><CalendarClock size={15} /> {formatRange(session.startAt, session.endAt, state.ui.timeZone, state.ui.language)}</span>
                <span><MapPin size={15} /> {session.roomLabel}</span>
                <span><UsersRound size={15} /> {analytics.rosterSize} 人预约</span>
              </div>
            </div>
          </Card>

          <section className="stat-grid stat-grid-4">
            <StatCard
              label="全班触达人数"
              value={`${analytics.reachedStudents}/${analytics.rosterSize}`}
              detail={`参与率 ${participation}%`}
              icon={<UsersRound size={20} />}
              tone="blue"
              progress={participation}
            />
            <PmNote block kind="口径" note="先计算每个互动或材料的完成率，再取全部内容平均值。">
              <StatCard
                label="内容平均完成率"
                value={`${analytics.averageRate}%`}
                detail={`${analytics.rows.length} 项内容 · ${analytics.goodCount} 项完成较好`}
                icon={<TrendingUp size={20} />}
                tone="orange"
                progress={analytics.averageRate}
              />
            </PmNote>
            <PmNote block kind="口径" note="平均完成用时只统计已完成该项内容的学生。">
              <StatCard
                label="平均完成用时"
                value={analytics.totalActions ? `${analytics.averageMinutes} 分钟` : "--"}
                detail="每项内容人均用时"
                icon={<BarChart3 size={20} />}
                tone="purple"
              />
            </PmNote>
            <StatCard label="累计学习" value={`${analytics.totalMinutes} 分钟`} detail="本课次全班用时" icon={<Clock3 size={20} />} tone="mint" />
          </section>

          <div className="section-heading-row">
            <div>
              <span className="eyebrow">Class completion</span>
              <h2>{view === "class" ? "全班完成情况" : "学生完成详情"}</h2>
            </div>
            <PmNote kind="流程" note="按内容看全班适合定位薄弱环节；按学生看个人适合跟进个体完成情况。">
              <div className="analytics-view-switch">
              <div className="scope-choice">
                <button className={view === "class" ? "active" : ""} onClick={() => setView("class")}>按内容看全班</button>
                <button className={view === "students" ? "active" : ""} onClick={() => setView("students")}>按学生看个人</button>
              </div>
              </div>
            </PmNote>
          </div>

          {view === "class" ? (
            <Card className="class-completion-card">
              <div className="class-completion-head">
                <div>
                  <strong>
                    全班 {analytics.rosterSize} 人 · 共 {analytics.rows.length} 项内容（{analytics.interactionCount} 个互动 · {analytics.materialCount} 个材料）
                  </strong>
                  <small>
                    按课前 / 课中 / 课后排列，同一阶段完成的排在前面 · 完成较好 {analytics.goodCount} 项 · 需要关注 {analytics.weakCount} 项 · 点任意一行查看每个学生
                  </small>
                </div>
                <PmNote kind="口径" note="完成率达到 85% 为完成较好，达到 60% 为基本完成。">
                  <div className="class-legend">
                    <span><i className="legend-dot dot-good" />完成较好</span>
                    <span><i className="legend-dot dot-ok" />基本完成</span>
                    <span><i className="legend-dot dot-weak" />需要关注</span>
                  </div>
                </PmNote>
              </div>

              <PmNote block kind="流程" note="点击任意内容可下钻查看每位学生的完成状态和用时。">
                <div className="class-section-list">
                {(["preview", "live", "review"] as Phase[]).map((phase) => {
                  const group = analytics.rows.filter((row) => row.phase === phase);
                  if (group.length === 0) return null;
                  return (
                    <Fragment key={phase}>
                      <div className="class-phase-divider">
                        <span>{phase === "preview" ? "课前预习" : phase === "live" ? "课中互动" : "课后复习"}</span>
                        <i />
                        <small>{group.length} 项</small>
                      </div>
                      {group.map((row) => {
                        const meta = statusMeta[row.status];
                        return (
                          <button className="class-section-row" key={`${row.kind}-${row.id}`} onClick={() => setDrilldown(row)}>
                            <span className={`phase-badge phase-${row.phase}`}>{phaseLabel(row.phase)}</span>
                            <span className="class-section-name">
                              <strong>{row.title}</strong>
                              <small>
                                <i className={`content-kind kind-${row.kind}`}>{row.kind === "interaction" ? "互动" : "材料"}</i>
                                {row.detail}
                              </small>
                            </span>
                            <span className="class-section-progress">
                              <ProgressBar value={row.rate} tone={row.status === "weak" ? "orange" : "mint"} />
                              <small>{row.doneCount}/{row.total} 人{row.actionLabel} · {Math.round(row.rate)}%</small>
                            </span>
                            <span className="class-section-score">
                              <strong>{row.averageMinutes ? `${row.averageMinutes}′` : "--"}</strong>
                              <small>平均用时</small>
                            </span>
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                            <ChevronRight size={16} className="class-section-arrow" />
                          </button>
                        );
                      })}
                    </Fragment>
                  );
                })}
                {analytics.rows.length === 0 && (
                  <EmptyState title="这节课还没有配置内容" description="在课堂设计里为这个课节准备材料或互动后，这里会显示整班情况。" />
                )}
                </div>
              </PmNote>
            </Card>
          ) : (
            <Card className="class-completion-card">
                <PmNote block kind="口径" note="互动按有效提交去重，材料按查看、播放或下载去重。按完成比例排序，累计用时只计算已完成内容。">
                  <div className="class-completion-head">
                  <div>
                    <strong>全班 {studentRows.length} 人 · 每人 {analytics.rows.length} 项内容</strong>
                    <small>按完成比例从高到低 · 点任意一行查看这位学生完成的每一项</small>
                  </div>
                  </div>
                </PmNote>

              <PmNote block kind="流程" note="点击任意学生可查看其完成的每一项内容、用时和最近记录。">
                <div className="class-section-list">
                {studentRows.map((row) => {
                  const rate = row.total ? (row.doneCount / row.total) * 100 : 0;
                  const status = rate >= 85 ? "good" : rate >= 60 ? "ok" : "weak";
                  const meta = statusMeta[status];
                  return (
                    <button className="student-progress-row" key={row.studentId} onClick={() => setStudentDetail(row)}>
                      <Avatar label={row.avatar} tone={rate >= 85 ? "purple" : "orange"} />
                      <span className="class-section-name">
                        <strong>{row.name} · {row.level}</strong>
                        <small>班级：{row.className}</small>
                      </span>
                      <span className="class-section-progress">
                        <ProgressBar value={rate} tone={status === "weak" ? "orange" : "mint"} />
                        <small>{row.doneCount}/{row.total} 项完成 · {Math.round(rate)}%</small>
                      </span>
                      <span className="class-section-score">
                        <strong>{row.minutes ? `${row.minutes}′` : "--"}</strong>
                        <small>累计用时</small>
                      </span>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <ChevronRight size={16} className="class-section-arrow" />
                    </button>
                  );
                })}
                {studentRows.length === 0 && (
                  <EmptyState title="这节课还没有学生预约" description="有学生预约后，这里会按学生维度显示完成情况。" />
                )}
                </div>
              </PmNote>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(drilldown)}
        title={drilldown ? `${drilldown.title} · 学生${drilldown.actionLabel}情况` : ""}
        onClose={() => setDrilldown(null)}
        width="820px"
        footer={
          <div className="modal-footer-split">
            <span>
              {drilldown
                ? `${drilldown.actionLabel} ${drilldown.doneCount}/${drilldown.total} 人 · 触达率 ${Math.round(drilldown.rate)}% · 人均用时 ${drilldown.averageMinutes || "--"} 分钟`
                : ""}
            </span>
          </div>
        }
      >
        {drilldown && (
          <>
            <p className="muted-copy">
              {drilldown.kind === "interaction" ? "互动" : "材料"} · {drilldown.detail} · 学生{drilldown.actionLabel}后会记录用时。
            </p>

            <div className="class-drill-metrics">
              <div><strong>{drilldown.doneCount}/{drilldown.total}</strong><small>已{drilldown.actionLabel}</small></div>
              <div><strong>{Math.round(drilldown.rate)}%</strong><small>触达率</small></div>
              <div><strong>{drilldown.averageMinutes || "--"}</strong><small>人均用时（分钟）</small></div>
              <div><strong>{drilldown.students.filter((student) => !student.done).length}</strong><small>未{drilldown.actionLabel}</small></div>
            </div>

            <div className="modal-section">
              <div className="roster-modal-section-head">
                <h4>学生完成明细</h4>
              </div>
              <div className="class-drill-list">
                {[...drilldown.students]
                  .sort((a, b) => Number(b.done) - Number(a.done) || a.minutes - b.minutes)
                  .map((student) => (
                    <article className={`class-drill-row ${student.done ? "is-done" : "is-missing"}`} key={student.studentId}>
                      <Avatar label={student.avatar} tone={student.done ? "purple" : "neutral"} />
                      <div>
                        <strong>{student.name} · {student.level}</strong>
                        <small>班级：{student.className}</small>
                      </div>
                      <span className="class-drill-figures">
                        {student.done ? (
                          <>
                            <b>用时 {student.minutes} 分钟</b>
                            <small>{formatDateTime(student.completedAt, state.ui.timeZone, state.ui.language)} {drilldown.actionLabel}</small>
                          </>
                        ) : (
                          <>
                            <b>未{drilldown.actionLabel}</b>
                            <small>还没有记录</small>
                          </>
                        )}
                      </span>
                    </article>
                  ))}
                {drilldown.students.length === 0 && <p className="muted-copy">这节课还没有学生预约，暂时没有可下钻的名单。</p>}
              </div>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(studentDetail)}
        title={studentDetail ? `${studentDetail.name} · 完成详情` : ""}
        onClose={() => setStudentDetail(null)}
        width="880px"
        footer={
          <div className="modal-footer-split">
            <span>
              {studentDetail
                ? `${studentDetail.doneCount}/${studentDetail.total} 项完成 · 累计用时 ${studentDetail.minutes || 0} 分钟${studentDetail.lastAt ? ` · 最近完成 ${formatDateTime(studentDetail.lastAt, state.ui.timeZone, state.ui.language)}` : ""}`
                : ""}
            </span>
          </div>
        }
      >
        {studentDetail && (
          <>
            <div className="class-drill-metrics">
              <div><strong>{studentDetail.doneCount}/{studentDetail.total}</strong><small>已完成</small></div>
              <div><strong>{Math.round((studentDetail.doneCount / (studentDetail.total || 1)) * 100)}%</strong><small>完成比例</small></div>
              <div><strong>{studentDetail.minutes}</strong><small>累计用时（分钟）</small></div>
              <div><strong>{studentDetail.total - studentDetail.doneCount}</strong><small>未完成</small></div>
            </div>

            <div className="modal-section">
              <div className="roster-modal-section-head">
                <h4>
                  {studentDetail.name} · {studentDetail.level} · 班级 {studentDetail.className}
                </h4>
              </div>
              <div className="class-drill-list">
                {studentDetail.items.map((item) => (
                  <article className={`class-drill-row ${item.done ? "is-done" : "is-missing"}`} key={`${item.kind}-${item.id}`}>
                    <span className={`phase-badge phase-${item.phase}`}>{phaseLabel(item.phase)}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <small>
                        <i className={`content-kind kind-${item.kind}`}>{item.kind === "interaction" ? "互动" : "材料"}</i>
                        {item.detail}
                      </small>
                    </div>
                    <span className="class-drill-figures">
                      {item.done ? (
                        <>
                          <b>已{item.actionLabel} · 用时 {item.minutes} 分钟</b>
                          <small>{formatDateTime(item.completedAt, state.ui.timeZone, state.ui.language)}</small>
                        </>
                      ) : (
                        <>
                          <b>未{item.actionLabel}</b>
                          <small>还没有记录</small>
                        </>
                      )}
                    </span>
                  </article>
                ))}
              </div>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
