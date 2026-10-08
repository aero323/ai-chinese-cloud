import { BookOpenCheck, CheckCircle2, FileText, MinusCircle, XCircle } from "lucide-react";
import type { GradeCategory } from "../domain/types";
import type { GradeRecord } from "../lib/gradeAnalytics";
import { formatDateTime } from "../lib/format";
import { Badge } from "./ui";

const categoryMeta: Record<GradeCategory, { label: string; tone: "mint" | "orange" | "blue" }> = {
  interaction: { label: "互动", tone: "mint" },
  homework: { label: "作业", tone: "orange" },
  exam: { label: "考试", tone: "blue" }
};

const phaseLabels = { preview: "课前", live: "课中", review: "课后" } as const;

function recordStatusLabel(record: GradeRecord, statusMode: "student" | "teacher") {
  if (record.status === "pending") return statusMode === "teacher" ? "待录入" : "待公布";
  if (record.status === "absent") return record.category === "exam" ? "缺考" : "缺交";
  if (record.status === "excused") return record.category === "exam" ? "免考" : "免做";
  return "";
}

export function GradeRecordList({
  records,
  timeZone,
  language,
  compact = false,
  singleLine = false,
  statusMode = "student"
}: {
  records: GradeRecord[];
  timeZone: string;
  language: string;
  compact?: boolean;
  singleLine?: boolean;
  statusMode?: "student" | "teacher";
}) {
  if (!records.length) return <p className="muted-copy">这段时间还没有成绩记录。</p>;
  return (
    <div className={`grade-record-list ${compact ? "is-compact" : ""} ${singleLine ? "is-single-line" : ""}`}>
      {records.map((record) => {
        const meta = categoryMeta[record.category];
        const displayScore = record.status === "graded" || record.status === "completed" ? record.normalizedScore : null;
        return (
          <article className="grade-record-row" key={record.id}>
            <span className={`grade-record-icon category-${record.category}`}>
              {record.category === "interaction" ? <BookOpenCheck size={18} /> : <FileText size={18} />}
            </span>
            <div className="grade-record-main">
              <div>
                <strong>{record.title}</strong>
                <Badge tone={meta.tone}>{meta.label}</Badge>
                {record.phase && <Badge tone={record.phase === "preview" ? "blue" : record.phase === "live" ? "purple" : "mint"}>{phaseLabels[record.phase]}</Badge>}
                {record.status !== "completed" && record.status !== "graded" && (
                  <Badge tone={record.status === "absent" ? "danger" : record.status === "excused" ? "neutral" : "orange"}>
                    {recordStatusLabel(record, statusMode)}
                  </Badge>
                )}
              </div>
              <small>
                {record.lessonTitle ? `${record.lessonTitle} · ` : ""}
                {formatDateTime(record.occurredAt, timeZone, language)}
                {record.rawScore !== undefined && record.rawScore !== null && record.maxScore ? ` · 原始分 ${record.rawScore}/${record.maxScore}` : ""}
              </small>
            </div>
            <span className={`grade-record-time ${record.category === "interaction" ? "" : "is-empty"}`}>
              {record.category === "interaction" && record.timeSpentSeconds ? `用时 ${record.timeSpentSeconds} 秒` : ""}
            </span>
            <div className="grade-record-score">
              {displayScore !== null ? <strong>{displayScore}</strong> : record.status === "absent" ? <strong>0</strong> : <strong>--</strong>}
              {record.status === "completed" && (record.wrongItemCount ?? 0) > 0 && <small><XCircle size={12} /> {record.wrongItemCount} 错题</small>}
              {record.status === "graded" && <small><CheckCircle2 size={12} /> {statusMode === "teacher" ? "已录入" : record.category === "homework" ? "已批改" : "已公布"}</small>}
              {record.status === "excused" && <small><MinusCircle size={12} /> 不计入</small>}
            </div>
          </article>
        );
      })}
    </div>
  );
}
