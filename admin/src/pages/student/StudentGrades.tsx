import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Award, BookOpenCheck, FileCheck2, GraduationCap } from "lucide-react";
import { GradePeriodPicker } from "../../components/GradePeriodPicker";
import { GradeAnalysisCards, GradeDetailsCard } from "../../components/GradeAnalyticsPanels";
import { Card, EmptyState, PageHeader, StatCard } from "../../components/ui";
import type { GradeCategory } from "../../domain/types";
import { currentUser } from "../../lib/domain";
import { buildGradeAnalytics, defaultGradeRange, scoreTone } from "../../lib/gradeAnalytics";
import { usePlatformStore } from "../../store/usePlatformStore";

const categoryMeta: Array<{ category: GradeCategory; label: string; icon: ReactNode; tone: "mint" | "orange" | "blue" }> = [
  { category: "interaction", label: "互动练习", icon: <BookOpenCheck size={19} />, tone: "mint" },
  { category: "homework", label: "作业", icon: <FileCheck2 size={19} />, tone: "orange" },
  { category: "exam", label: "考试", icon: <GraduationCap size={19} />, tone: "blue" }
];

function scoreValue(value: number | null) {
  return value === null ? "--" : value;
}

export function StudentGrades() {
  const state = usePlatformStore((store) => store.state);
  const user = currentUser(state);
  const [range, setRange] = useState(() => defaultGradeRange(state.ui.timeZone));

  useEffect(() => {
    setRange((current) => ({ ...current, timeZone: state.ui.timeZone }));
  }, [state.ui.timeZone]);

  const analytics = useMemo(
    () => buildGradeAnalytics(state, range, { studentId: user.id }),
    [range, state, user.id]
  );
  const summary = analytics.students.find((item) => item.studentId === user.id);

  return (
    <>
      <PageHeader
        eyebrow="My learning outcomes"
        title="成绩统计"
        description="查看自己在所选时间范围内的互动、作业和考试成绩，以及每一项成绩的来源。"
      />

      <Card className="content-filter-bar grade-filter-bar student-grade-filter">
        <GradePeriodPicker value={range} onChange={setRange} />
      </Card>

      {summary ? (
        <>
          <section className="stat-grid stat-grid-4">
            <StatCard label="综合成绩" value={scoreValue(summary.composite)} detail="按有效成绩类别归一化" icon={<Award size={20} />} tone={scoreTone(summary.composite)} progress={summary.composite ?? 0} />
            {categoryMeta.map((item) => (
              <StatCard
                key={item.category}
                label={item.label}
                value={scoreValue(summary.categories[item.category].average)}
                detail={`${summary.categories[item.category].count} 项 · 权重 ${summary.categories[item.category].weight}%`}
                icon={item.icon}
                tone={item.tone}
                progress={summary.categories[item.category].average ?? 0}
              />
            ))}
          </section>

          <GradeAnalysisCards
            trend={summary.trend}
            skillRadar={summary.skillRadar}
            categories={summary.categories}
            timeZone={state.ui.timeZone}
            pendingCount={summary.pendingCount}
            pendingLabel="项待公布"
          />

          <GradeDetailsCard
            records={summary.records}
            timeZone={state.ui.timeZone}
            language={state.ui.language}
            statusMode="student"
          />
        </>
      ) : (
        <EmptyState title="还没有成绩数据" description="完成互动，或老师发布正式考核后，成绩会显示在这里。" />
      )}
    </>
  );
}
