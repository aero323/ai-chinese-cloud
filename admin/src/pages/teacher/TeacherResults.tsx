import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, BarChart3, CheckCircle2, TrendingUp, UsersRound } from "lucide-react";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, getCurrentInteractionVersion, getLesson, getTeacherSessions, teacherMetrics } from "../../lib/domain";
import { Badge, Card, EmptyState, PageHeader, ProgressBar, StatCard, Tabs } from "../../components/ui";

export function TeacherResults() {
  const { t } = useTranslation();
  const state = usePlatformStore((store) => store.state);
  const user = currentUser(state);
  const metrics = teacherMetrics(state, user.id);
  const [tab, setTab] = useState<"sets" | "wrong">("sets");
  const teacherSessions = getTeacherSessions(state, user.id);
  const lessonIds = [...new Set(teacherSessions.map((session) => session.lessonId))];
  const sets = state.interactionSets.filter((set) => lessonIds.includes(set.lessonId));
  const attempts = state.interactionAttempts.filter((attempt) => sets.some((set) => set.id === attempt.setId));

  const wrongItems = useMemo(() => {
    const counts = new Map<string, number>();
    attempts.forEach((attempt) => attempt.wrongItemIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1)));
    return [...counts.entries()]
      .map(([id, count]) => ({
        id,
        count,
        item: state.interactionVersions.flatMap((version) => version.items).find((item) => item.id === id),
        set: sets.find((setItem) => state.interactionVersions.filter((version) => version.setId === setItem.id).flatMap((version) => version.items).some((item) => item.id === id))
      }))
      .sort((a, b) => b.count - a.count);
  }, [attempts, sets, state.interactionVersions]);

  return (
    <>
      <PageHeader
        eyebrow="Class analytics"
        title={t("nav.results")}
        description="聚合查看自己课节的完成率、互动得分和常见错题。学生联系方式不在教师端显示。"
      />

      <section className="stat-grid stat-grid-4">
        <StatCard label="答题次数" value={attempts.length} detail="所有课节累计" icon={<BarChart3 size={20} />} tone="purple" />
        <StatCard label={t("teacher.averageScore")} value={metrics.averageScore ? Math.round(metrics.averageScore) : "--"} detail="自动评分互动" icon={<TrendingUp size={20} />} tone="orange" />
        <StatCard label={t("teacher.completion")} value={`${Math.round(metrics.completionRate)}%`} detail="按预约和内容估算" icon={<CheckCircle2 size={20} />} tone="mint" progress={metrics.completionRate} />
        <StatCard label="参与学生" value={new Set(attempts.map((attempt) => attempt.studentId)).size} detail={`${metrics.booked} 个预约名额`} icon={<UsersRound size={20} />} tone="blue" />
      </section>

      <div className="section-heading-row">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "sets", label: "互动完成情况", count: sets.length },
            { value: "wrong", label: t("teacher.commonWrong"), count: wrongItems.length }
          ]}
        />
      </div>

      {tab === "sets" && (
        <div className="analytics-set-grid">
          {sets.map((set) => {
            const setAttempts = attempts.filter((attempt) => attempt.setId === set.id);
            const average = setAttempts.length ? setAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / setAttempts.length : 0;
            const relatedSessions = teacherSessions.filter((session) => session.lessonId === set.lessonId);
            const expected = relatedSessions.reduce((sum, session) => sum + state.bookings.filter((booking) => booking.sessionId === session.id && booking.status === "booked").length, 0);
            const completion = expected ? Math.min(100, (setAttempts.length / expected) * 100) : 0;
            const version = getCurrentInteractionVersion(state, set);
            return (
              <Card className="analytics-set-card" key={set.id}>
                <div className="analytics-set-head">
                  <span className={`phase-badge phase-${set.phase}`}>{set.phase === "preview" ? "预习" : set.phase === "live" ? "课中" : "复习"}</span>
                  <Badge tone="mint">v{version?.version ?? 1}</Badge>
                </div>
                <h2>{set.title}</h2>
                <p>{getLesson(state, set.lessonId)?.title} · {version?.items.length ?? 0} 题</p>
                <div className="analytics-metric-row">
                  <div><strong>{Math.round(completion)}%</strong><small>完成率</small></div>
                  <div><strong>{average ? Math.round(average) : "--"}</strong><small>平均分</small></div>
                  <div><strong>{setAttempts.length}</strong><small>提交次数</small></div>
                </div>
                <ProgressBar value={completion} tone={completion >= 70 ? "mint" : "orange"} />
              </Card>
            );
          })}
          {sets.length === 0 && <EmptyState title="暂无互动结果" description="学生完成互动后，这里会显示班级数据。" />}
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
                <p>{entry.set?.title} · {entry.item?.type}</p>
              </div>
              <Badge tone="orange">{entry.count} 次答错</Badge>
            </Card>
          ))}
          {wrongItems.length === 0 && <EmptyState title="暂无错题数据" />}
        </div>
      )}
    </>
  );
}
