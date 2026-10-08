import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Search, TrendingDown, TrendingUp, Trophy, UsersRound } from "lucide-react";
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, ProgressBar, Select, StatCard, TextInput } from "../../components/ui";
import { GradeAnalysisCards } from "../../components/GradeAnalyticsPanels";
import { GradePeriodPicker } from "../../components/GradePeriodPicker";
import { currentUser } from "../../lib/domain";
import { getAcademicSchoolId, workspaceState } from "../../lib/academicScope";
import { buildGradeAnalytics, defaultGradeRange, scoreTone, type GradeRangeSelection } from "../../lib/gradeAnalytics";
import { buildTeacherRanking, teacherPerformanceCsv } from "../../lib/teacherPerformance";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";

function scoreValue(value: number | null | undefined) {
  return value === null || value === undefined ? "--" : value;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function TeacherPerformance() {
  const navigate = useNavigate();
  const state = usePlatformStore((store) => store.state);
  const user = currentUser(state);
  const schoolId = getAcademicSchoolId(state, user);
  const scopedState = useMemo(() => workspaceState(state, schoolId), [schoolId, state]);
  const [range, setRange] = useState<GradeRangeSelection>(() => defaultGradeRange(state.ui.timeZone));
  const [query, setQuery] = useState("");
  const [classId, setClassId] = useState("");
  const [sampleOnly, setSampleOnly] = useState(false);
  const ranking = useMemo(() => buildTeacherRanking(scopedState, schoolId, range).teachers, [range, schoolId, scopedState]);
  const classes = scopedState.classes.filter((item) => item.status === "active");
  const teachers = ranking.filter((teacher) => {
    if (query && !teacher.teacherName.toLowerCase().includes(query.toLowerCase())) return false;
    if (classId && !teacher.classIds.includes(classId)) return false;
    if (sampleOnly && !teacher.ranked) return false;
    return true;
  });
  const school = scopedState.schools.find((item) => item.id === schoolId);
  const schoolAverageScores = ranking
    .map((teacher) => teacher.compositeAverage)
    .filter((score): score is number => score !== null);
  const schoolAverage = schoolAverageScores.length
    ? Math.round(schoolAverageScores.reduce((sum, score) => sum + score, 0) / schoolAverageScores.length * 10) / 10
    : null;

  function exportSummary() {
    downloadCsv(
      `teacher-performance-${range.start}-${range.end}.csv`,
      teacherPerformanceCsv(school?.name ?? "本校", range, teachers)
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Teacher performance"
        title="教师表现"
        description="按实际授课归属汇总学生综合表现；排名只用于教学观察与绩效讨论参考。"
        actions={<Button variant="secondary" onClick={exportSummary}><Download size={16} /> 导出教师汇总</Button>}
      />

      <section className="stat-grid stat-grid-4">
        <StatCard label="纳入排行教师" value={ranking.filter((teacher) => teacher.ranked).length} detail={`共 ${ranking.length} 位本校教师`} icon={<Trophy size={20} />} tone="purple" />
        <StatCard label="教师学生均分" value={scoreValue(schoolAverage)} detail="仅汇总有效结果" icon={<TrendingUp size={20} />} tone="mint" />
        <StatCard label="有效学生样本" value={ranking.reduce((sum, teacher) => sum + teacher.sampleSize, 0)} detail="按教师授课去重前" icon={<UsersRound size={20} />} tone="blue" />
        <StatCard label="样本不足教师" value={ranking.filter((teacher) => !teacher.ranked).length} detail="少于 5 名有效学生" icon={<TrendingDown size={20} />} tone="orange" />
      </section>

      <Card className="content-filter-bar performance-filter">
        <GradePeriodPicker value={range} onChange={setRange} />
        <div className="search-box"><Search size={17} /><TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索教师" /></div>
        <Select value={classId} onChange={(event) => setClassId(event.target.value)} aria-label="按班级筛选">
          <option value="">全部班级</option>
          {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        <label className="inline-check"><input type="checkbox" checked={sampleOnly} onChange={(event) => setSampleOnly(event.target.checked)} /> 只看可排名</label>
      </Card>

      <Card className="performance-table-card">
        <div className="performance-table">
          <div className="performance-table-head">
            <span>排名 / 教师</span><span>有效学生</span><span>综合均分</span><span>互动完成</span><span>作业</span><span>考试</span><span>低分学生</span><span>环比</span>
          </div>
          {teachers.map((teacher) => (
            <button
              className="performance-table-row"
              key={teacher.teacherId}
              onClick={() => navigate(`/academic/performance/${teacher.teacherId}`)}
            >
              <span className="performance-teacher-cell">
                <b className={`performance-rank ${teacher.ranked ? "" : "is-muted"}`}>{teacher.rank ? `#${teacher.rank}` : "—"}</b>
                <Avatar label={teacher.avatar} size="sm" tone="mint" />
                <span><strong>{teacher.teacherName}</strong><small>{teacher.ranked ? `${teacher.classCount} 个授课班级` : teacher.note}</small></span>
              </span>
              <span>{teacher.sampleSize}</span>
              <span><strong className={`grade-score score-${scoreTone(teacher.compositeAverage)}`}>{scoreValue(teacher.compositeAverage)}</strong></span>
              <span>{teacher.completionRate === null ? "--" : `${teacher.completionRate}%`}</span>
              <span>{scoreValue(teacher.categories.homework.average)}</span>
              <span>{scoreValue(teacher.categories.exam.average)}</span>
              <span><Badge tone={teacher.lowScoreCount ? "orange" : "neutral"}>{teacher.lowScoreCount} 人</Badge></span>
              <span className={teacher.trendDelta !== null && teacher.trendDelta >= 0 ? "trend-positive" : "trend-negative"}>
                {teacher.trendDelta === null ? "--" : `${teacher.trendDelta > 0 ? "+" : ""}${teacher.trendDelta}`}
              </span>
            </button>
          ))}
        </div>
        {teachers.length === 0 && <EmptyState title="没有匹配的教师" description="调整时间、班级或筛选条件后重试。" />}
      </Card>

      <Card className="performance-note">
        <strong>统计口径</strong>
        <p>互动按对应课次的实际授课教师归属，正式考核按考核负责教师归属；少于 5 名有效学生显示“样本不足”且不排名。导出不包含学生姓名与单条成绩。</p>
      </Card>
    </>
  );
}

export function TeacherPerformanceDetail() {
  const { teacherId = "" } = useParams();
  const navigate = useNavigate();
  const state = usePlatformStore((store) => store.state);
  const user = currentUser(state);
  const schoolId = getAcademicSchoolId(state, user);
  const scopedState = useMemo(() => workspaceState(state, schoolId), [schoolId, state]);
  const [range, setRange] = useState<GradeRangeSelection>(() => defaultGradeRange(state.ui.timeZone));
  const ranking = useMemo(() => buildTeacherRanking(scopedState, schoolId, range).teachers, [range, schoolId, scopedState]);
  const teacher = ranking.find((item) => item.teacherId === teacherId);
  const analytics = useMemo(
    () => buildGradeAnalytics(scopedState, range, { schoolId, teacherId }),
    [range, schoolId, scopedState, teacherId]
  );
  if (!teacher) {
    return <EmptyState title="找不到这位教师" action={<Button onClick={() => navigate("/academic/performance")}>返回教师表现</Button>} />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Teacher detail"
        title={teacher.teacherName}
        description={teacher.ranked ? `本校排名 #${teacher.rank} · ${teacher.sampleSize} 名有效学生` : "样本不足，仅供明细观察，不形成排名。"}
        actions={<Button variant="secondary" onClick={() => navigate("/academic/performance")}><ArrowLeft size={16} /> 返回排行</Button>}
      />

      <Card className="content-filter-bar">
        <GradePeriodPicker value={range} onChange={setRange} />
        <Badge tone={teacher.ranked ? "mint" : "orange"}>{teacher.ranked ? `综合均分 ${teacher.compositeAverage}` : "样本不足"}</Badge>
      </Card>

      <section className="stat-grid stat-grid-4">
        <StatCard label="有效学生" value={teacher.sampleSize} detail="实际授课归属" icon={<UsersRound size={20} />} tone="blue" />
        <StatCard label="综合均分" value={scoreValue(teacher.compositeAverage)} detail="按本校成绩规则" icon={<Trophy size={20} />} tone="purple" />
        <StatCard label="互动完成率" value={teacher.completionRate === null ? "--" : `${teacher.completionRate}%`} detail="已发布计分互动" icon={<TrendingUp size={20} />} tone="mint" />
        <StatCard label="低分学生" value={teacher.lowScoreCount} detail="综合分低于 60" icon={<TrendingDown size={20} />} tone="orange" />
      </section>

      <GradeAnalysisCards
        trend={analytics.trend}
        skillRadar={analytics.skillRadar}
        categories={analytics.categoryAverages}
        timeZone={state.ui.timeZone}
      />

      <Card className="performance-class-card">
        <div className="card-heading"><div><span className="eyebrow">Class comparison</span><h2>班级对比</h2></div></div>
        <div className="performance-class-list">
          {teacher.classRows.map((row) => (
            <div key={row.classId}>
              <span><strong>{row.className}</strong><small>{row.studentCount} 名学生</small></span>
              <ProgressBar value={row.composite ?? 0} tone={scoreTone(row.composite)} />
              <b>{scoreValue(row.composite)}</b>
            </div>
          ))}
        </div>
      </Card>

      <Card className="performance-student-card">
        <div className="card-heading"><div><span className="eyebrow">Students</span><h2>学生表现明细</h2></div><Badge tone="neutral">{teacher.dataCoverage}% 三类成绩齐全</Badge></div>
        <div className="data-table performance-student-table">
          <div className="data-table-head"><span>学生</span><span>班级</span><span>综合</span><span>互动</span><span>作业</span><span>考试</span></div>
          {teacher.students.map((student) => (
            <button className="data-table-row" key={student.studentId} onClick={() => navigate(`/academic/students/${student.studentId}`)}>
              <span className="grade-student-cell"><Avatar label={student.avatar} size="sm" /><span><strong>{student.name}</strong><small>{student.level}</small></span></span>
              <span>{student.classLabel}</span>
              <span><strong className={`grade-score score-${scoreTone(student.composite)}`}>{scoreValue(student.composite)}</strong></span>
              <span>{scoreValue(student.categories.interaction.average)}</span>
              <span>{scoreValue(student.categories.homework.average)}</span>
              <span>{scoreValue(student.categories.exam.average)}</span>
            </button>
          ))}
        </div>
        {teacher.students.length === 0 && <EmptyState title="这段时间没有学生结果" />}
      </Card>

      <Card className="performance-note">
        <strong>使用说明</strong>
        <p>本页基于学生结果与互动完成情况做教学观察，不包含教师内容设计质量，也不应作为单一的人事结论。</p>
      </Card>
    </>
  );
}
