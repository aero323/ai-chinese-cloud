import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CalendarClock, CheckCircle2, Clock3, MapPin, TrendingUp, UsersRound } from "lucide-react";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, getBookedCount, getCurrentInteractionVersion, getLesson, getTeacherSessions, getUser, setsForSession } from "../../lib/domain";
import { formatDateTime, formatRange } from "../../lib/format";
import { interactionTypeLabel } from "../../lib/interactionTypes";
import { Badge, Card, EmptyState, PageHeader, ProgressBar, StatCard, Tabs } from "../../components/ui";

export function TeacherResults() {
  const state = usePlatformStore((store) => store.state);
  const user = currentUser(state);
  const teacherSessions = useMemo(() => getTeacherSessions(state, user.id), [state, user.id]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [tab, setTab] = useState<"sets" | "wrong" | "students">("sets");

  const lessonGroups = useMemo(() => {
    const groups = new Map<string, { lessonId: string; sessions: typeof teacherSessions }>();
    teacherSessions.forEach((session) => {
      const group = groups.get(session.lessonId) ?? { lessonId: session.lessonId, sessions: [] };
      group.sessions.push(session);
      groups.set(session.lessonId, group);
    });
    return [...groups.values()];
  }, [teacherSessions]);

  // 默认选中：今天/最近的一节课次
  useEffect(() => {
    if (selectedSessionId || teacherSessions.length === 0) return;
    const now = Date.now();
    const nearest = [...teacherSessions].sort((a, b) => {
      const da = Math.abs(new Date(a.startAt).getTime() - now);
      const db = Math.abs(new Date(b.startAt).getTime() - now);
      return da - db;
    })[0];
    setSelectedSessionId(nearest.id);
  }, [selectedSessionId, teacherSessions]);

  const session = teacherSessions.find((item) => item.id === selectedSessionId) ?? teacherSessions[0];
  if (!session) {
    return (
      <>
        <PageHeader eyebrow="Class analytics" title="学习结果" />
        <EmptyState title="暂无课次" description="运营排课后，这里会按课节和课次显示学习结果。" />
      </>
    );
  }

  const lesson = getLesson(state, session.lessonId);
  const sessionSets = setsForSession(state, session);
  const booked = getBookedCount(state, session.id);
  const sessionAttempts = state.interactionAttempts.filter((attempt) => attempt.sessionId === session.id);
  const participants = new Set(sessionAttempts.map((attempt) => attempt.studentId));
  const averageScore = sessionAttempts.length
    ? Math.round(sessionAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / sessionAttempts.length)
    : 0;
  const completedSetIds = new Set(sessionAttempts.map((attempt) => attempt.setId));
  const itemsById = new Map(state.interactionVersions.flatMap((version) => version.items).map((item) => [item.id, item]));

  const setStats = sessionSets.map((set) => {
    const attempts = sessionAttempts.filter((attempt) => attempt.setId === set.id);
    const students = new Set(attempts.map((attempt) => attempt.studentId));
    const average = attempts.length ? attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length : 0;
    const version = getCurrentInteractionVersion(state, set);
    return {
      set,
      version,
      attempts,
      students,
      average,
      completion: booked ? Math.min(100, (students.size / booked) * 100) : 0
    };
  });

  const wrongCounts = new Map<string, number>();
  sessionAttempts.forEach((attempt) => attempt.wrongItemIds.forEach((id) => wrongCounts.set(id, (wrongCounts.get(id) ?? 0) + 1)));
  const wrongItems = [...wrongCounts.entries()]
    .map(([id, count]) => ({
      id,
      count,
      item: itemsById.get(id),
      set: sessionSets.find((set) => (getCurrentInteractionVersion(state, set)?.items ?? []).some((item) => item.id === id))
    }))
    .filter((entry) => entry.item)
    .sort((a, b) => b.count - a.count);

  const studentRows = (() => {
    const byStudent = new Map<string, typeof sessionAttempts>();
    sessionAttempts.forEach((attempt) => byStudent.set(attempt.studentId, [...(byStudent.get(attempt.studentId) ?? []), attempt]));
    return [...byStudent.entries()]
      .map(([studentId, attempts]) => {
        const student = getUser(state, studentId);
        const setsDone = new Set(attempts.map((attempt) => attempt.setId));
        const average = Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length);
        const seconds = attempts.reduce((sum, attempt) => sum + attempt.timeSpentSeconds, 0);
        const wrong = attempts.reduce((sum, attempt) => sum + attempt.wrongItemIds.length, 0);
        const last = attempts.map((attempt) => attempt.completedAt).sort().at(-1) ?? "";
        return {
          studentId,
          name: student?.name ?? "学生",
          setsDone: setsDone.size,
          average,
          minutes: Math.max(1, Math.round(seconds / 60)),
          wrong,
          attemptCount: attempts.length,
          last
        };
      })
      .sort((a, b) => b.average - a.average);
  })();

  return (
    <>
      <PageHeader
        eyebrow="Class analytics"
        title="学习结果"
      />

      <div className="analytics-layout">
        <aside className="analytics-session-nav">
          {lessonGroups.map((group) => {
            const groupLesson = getLesson(state, group.lessonId);
            return (
              <div className="analytics-lesson-group" key={group.lessonId}>
                <header>
                  <span>{groupLesson?.coverEmoji}</span>
                  <strong>{groupLesson?.title}</strong>
                  <Badge tone="neutral">{group.sessions.length} 课次</Badge>
                </header>
                <div>
                  {group.sessions.map((item) => {
                    const attempts = state.interactionAttempts.filter((attempt) => attempt.sessionId === item.id);
                    const people = new Set(attempts.map((attempt) => attempt.studentId)).size;
                    const avg = attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length) : null;
                    const ended = new Date(item.endAt).getTime() < Date.now();
                    return (
                      <button
                        key={item.id}
                        className={item.id === session.id ? "active" : ""}
                        onClick={() => {
                          setSelectedSessionId(item.id);
                          setTab("sets");
                        }}
                      >
                        <span className="nav-session-date">
                          {formatDateTime(item.startAt, state.ui.timeZone, state.ui.language)}
                          {!ended && <Badge tone="mint">待上</Badge>}
                        </span>
                        <strong>{item.title}</strong>
                        <small>
                          {people} 人参与 · 平均分 {avg ?? "--"}
                        </small>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </aside>

        <div className="analytics-detail">
          <Card className="analytics-session-head">
            <div>
              <span className="eyebrow">{lesson?.title}</span>
              <h2>{session.title}</h2>
              <div className="session-meta">
                <span><CalendarClock size={15} /> {formatRange(session.startAt, session.endAt, state.ui.timeZone, state.ui.language)}</span>
                <span><MapPin size={15} /> {session.roomLabel}</span>
                <span><UsersRound size={15} /> {booked} 人预约</span>
              </div>
            </div>
            <Badge tone={new Date(session.endAt).getTime() < Date.now() ? "blue" : "mint"}>
              {new Date(session.endAt).getTime() < Date.now() ? "已结束" : "待上课"}
            </Badge>
          </Card>

          <section className="stat-grid stat-grid-4">
            <StatCard label="参与人数" value={`${participants.size}/${booked}`} detail={booked ? `参与率 ${Math.round((participants.size / booked) * 100)}%` : "暂无预约"} icon={<UsersRound size={20} />} tone="blue" progress={booked ? (participants.size / booked) * 100 : 0} />
            <StatCard label="互动平均分" value={sessionAttempts.length ? averageScore : "--"} detail="本课次自动评分" icon={<TrendingUp size={20} />} tone="orange" />
            <StatCard label="答题提交" value={sessionAttempts.length} detail={`${completedSetIds.size}/${sessionSets.length} 项互动有提交`} icon={<BarChart3 size={20} />} tone="purple" />
            <StatCard label="累计练习" value={`${Math.max(0, Math.round(sessionAttempts.reduce((sum, attempt) => sum + attempt.timeSpentSeconds, 0) / 60))} 分钟`} detail="本课次互动用时" icon={<Clock3 size={20} />} tone="mint" />
          </section>

          <div className="section-heading-row">
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { value: "sets", label: "互动完成情况", count: sessionSets.length },
                { value: "wrong", label: "易错题", count: wrongItems.length },
                { value: "students", label: "学生作答", count: studentRows.length }
              ]}
            />
          </div>

          {tab === "sets" && (
            <div className="analytics-set-grid">
              {setStats.map(({ set, version, attempts, students, average, completion }) => (
                <Card className="analytics-set-card" key={set.id}>
                  <div className="analytics-set-head">
                    <span className={`phase-badge phase-${set.phase}`}>{set.phase === "preview" ? "预习" : set.phase === "live" ? "课中" : "复习"}</span>
                  </div>
                  <h2>{set.title}</h2>
                  <p>{version?.items.length ?? 0} 题</p>
                  <div className="analytics-metric-row">
                    <div><strong>{Math.round(completion)}%</strong><small>完成率</small></div>
                    <div><strong>{attempts.length ? Math.round(average) : "--"}</strong><small>平均分</small></div>
                    <div><strong>{students.size}</strong><small>完成人数</small></div>
                    <div><strong>{attempts.length}</strong><small>提交次数</small></div>
                  </div>
                  <ProgressBar value={completion} tone={completion >= 70 ? "mint" : "orange"} />
                </Card>
              ))}
              {sessionSets.length === 0 && <EmptyState title="这节课还没有配置互动" description="在互动设计里为这个课节准备内容，并配置到本节课。" />}
            </div>
          )}

          {tab === "wrong" && (
            <div className="wrong-question-list">
              {wrongItems.map((entry, index) => (
                <Card className="wrong-question-card" key={entry.id}>
                  <span className="wrong-rank">{index + 1}</span>
                  <AlertTriangle size={19} />
                  <div>
                    <strong>{entry.item?.prompt ?? "错题内容"}</strong>
                    <p>{entry.set?.title ?? "互动"} · {entry.item ? interactionTypeLabel(entry.item.type) : "题目"}</p>
                  </div>
                  <Badge tone="orange">{entry.count} 次答错</Badge>
                </Card>
              ))}
              {wrongItems.length === 0 && <EmptyState title="本课次暂无错题数据" description="学生提交互动后，这里会按题目聚合错误次数。" />}
            </div>
          )}

          {tab === "students" && (
            <Card className="analytics-student-table">
              <table>
                <thead>
                  <tr>
                    <th>学生</th>
                    <th>完成互动</th>
                    <th>平均分</th>
                    <th>练习用时</th>
                    <th>错题数</th>
                    <th>提交次数</th>
                    <th>最近提交</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRows.map((row) => (
                    <tr key={row.studentId}>
                      <td><strong>{row.name}</strong></td>
                      <td>{row.setsDone}/{sessionSets.length}</td>
                      <td>
                        <span className="score-cell">
                          {row.average}
                          {row.average >= 80 ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                        </span>
                      </td>
                      <td>{row.minutes} 分钟</td>
                      <td>{row.wrong}</td>
                      <td>{row.attemptCount}</td>
                      <td>{row.last ? formatDateTime(row.last, state.ui.timeZone, state.ui.language) : "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {studentRows.length === 0 && <EmptyState title="本课次还没有学生作答" />}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
