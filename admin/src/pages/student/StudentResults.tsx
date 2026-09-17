import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Award, BarChart3, CheckCircle2, Clock3, RotateCcw, XCircle } from "lucide-react";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, getCurrentInteractionVersion, getLesson, studentMetrics } from "../../lib/domain";
import { formatDateTime } from "../../lib/format";
import { Badge, Card, EmptyState, PageHeader, ProgressBar, StatCard, Tabs } from "../../components/ui";

type ResultTab = "all" | "preview" | "live" | "review";

export function StudentResults() {
  const { t } = useTranslation();
  const state = usePlatformStore((store) => store.state);
  const user = currentUser(state);
  const metrics = studentMetrics(state, user.id);
  const [tab, setTab] = useState<ResultTab>("all");
  const attempts = metrics.attempts
    .filter((attempt) => tab === "all" || attempt.phase === tab)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  const completionRate = state.interactionSets.length ? (metrics.completedSetIds.size / state.interactionSets.length) * 100 : 0;
  const totalErrors = attempts.reduce((sum, attempt) => sum + attempt.wrongItemIds.length, 0);
  const best = attempts.reduce((value, attempt) => Math.max(value, attempt.bestScore), 0);

  const wrongFrequency = useMemo(() => {
    const map = new Map<string, number>();
    attempts.forEach((attempt) => attempt.wrongItemIds.forEach((id) => map.set(id, (map.get(id) ?? 0) + 1)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [attempts]);

  return (
    <>
      <PageHeader
        eyebrow="Learning analytics"
        title={t("student.myProgress")}
        description="查看每次互动的得分、用时和需要再次练习的内容。"
      />

      <section className="stat-grid stat-grid-4">
        <StatCard label="互动完成率" value={`${Math.round(completionRate)}%`} detail={`${metrics.completedSetIds.size}/${state.interactionSets.length} 项`} icon={<CheckCircle2 size={20} />} tone="mint" progress={completionRate} />
        <StatCard label="最佳得分" value={best || "--"} detail="所有互动中的最高分" icon={<Award size={20} />} tone="orange" />
        <StatCard label="累计练习" value={`${metrics.totalStudyMinutes} 分`} detail={`${attempts.length} 次答题记录`} icon={<Clock3 size={20} />} tone="purple" />
        <StatCard label="错题记录" value={totalErrors} detail="可重复练习逐步消除" icon={<XCircle size={20} />} tone="pink" />
      </section>

      <div className="dashboard-columns results-layout">
        <Card className="results-timeline-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">Attempt timeline</span>
              <h2>答题记录</h2>
            </div>
            <Tabs
              compact
              value={tab}
              onChange={setTab}
              items={[
                { value: "all", label: "全部" },
                { value: "preview", label: "预习" },
                { value: "live", label: "课中" },
                { value: "review", label: "复习" }
              ]}
            />
          </div>
          <div className="attempt-list">
            {attempts.map((attempt) => {
              const set = state.interactionSets.find((item) => item.id === attempt.setId);
              const lesson = set ? getLesson(state, set.lessonId) : undefined;
              const version = set ? getCurrentInteractionVersion(state, set) : undefined;
              return (
                <article className="attempt-row" key={attempt.id}>
                  <span className={`attempt-score ${attempt.score >= 80 ? "good" : attempt.score >= 60 ? "medium" : "low"}`}>{attempt.score}</span>
                  <div>
                    <div className="attempt-title-row">
                      <strong>{set?.title ?? "互动练习"}</strong>
                      <Badge tone={attempt.phase === "preview" ? "blue" : attempt.phase === "live" ? "purple" : "mint"}>
                        {attempt.phase === "preview" ? "预习" : attempt.phase === "live" ? "课中" : "复习"}
                      </Badge>
                    </div>
                    <p>{lesson?.title} · 第 {attempt.attempt} 次作答 · 用时 {attempt.timeSpentSeconds} 秒</p>
                    <small>{formatDateTime(attempt.completedAt, state.ui.timeZone, state.ui.language)} · 版本 v{version?.version ?? "-"}</small>
                  </div>
                  <span className="attempt-errors">{attempt.wrongItemIds.length} 错题</span>
                </article>
              );
            })}
            {attempts.length === 0 && <EmptyState title="还没有答题记录" description="完成一次预习或课堂互动后，结果会显示在这里。" />}
          </div>
        </Card>

        <div className="results-side-column">
          <Card>
            <div className="card-heading">
              <div>
                <span className="eyebrow">Mastery</span>
                <h2>学习掌握情况</h2>
              </div>
              <BarChart3 size={20} />
            </div>
            <div className="mastery-list">
              {state.interactionSets.slice(0, 5).map((set) => {
                const setAttempts = attempts.filter((attempt) => attempt.setId === set.id);
                const score = setAttempts.length ? Math.max(...setAttempts.map((attempt) => attempt.bestScore)) : 0;
                return (
                  <div key={set.id}>
                    <div>
                      <strong>{set.title}</strong>
                      <span>{score || "--"}</span>
                    </div>
                    <ProgressBar value={score} tone={score >= 80 ? "mint" : score >= 60 ? "orange" : "purple"} />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="card-heading">
              <div>
                <span className="eyebrow">Review</span>
                <h2>建议复习</h2>
              </div>
              <RotateCcw size={20} />
            </div>
            <div className="review-suggestion-list">
              {wrongFrequency.slice(0, 3).map(([itemId, count]) => {
                const item = state.interactionVersions.flatMap((version) => version.items).find((candidate) => candidate.id === itemId);
                return (
                  <article key={itemId}>
                    <XCircle size={17} />
                    <div>
                      <strong>{item?.prompt ?? "错题复习"}</strong>
                      <small>累计错 {count} 次</small>
                    </div>
                  </article>
                );
              })}
              {wrongFrequency.length === 0 && <p className="muted-copy">暂时没有高频错题，继续保持。</p>}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
