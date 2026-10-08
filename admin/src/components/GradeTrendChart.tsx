import type { GradeTrendPoint } from "../lib/gradeAnalytics";
import { dateInputInTimeZone } from "../lib/gradeAnalytics";
import { EmptyState } from "./ui";

const series = [
  { key: "composite", label: "综合", color: "#6552ff" },
  { key: "interaction", label: "互动", color: "#33b99c" },
  { key: "homework", label: "作业", color: "#f39549" },
  { key: "exam", label: "考试", color: "#54a8ef" }
] as const;

function linePoints(values: Array<number | null>, width: number, height: number, padding: number) {
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  return values.map((value, index) => {
    if (value === null) return null;
    const x = values.length === 1 ? width / 2 : padding + (index / (values.length - 1)) * usableWidth;
    const y = padding + ((100 - value) / 100) * usableHeight;
    return { x, y, value };
  });
}

export function GradeTrendChart({ points, timeZone }: { points: GradeTrendPoint[]; timeZone: string }) {
  if (!points.length) {
    return <EmptyState title="暂无趋势数据" description="产生成绩后，这里会展示不同时间段的成绩变化。" />;
  }

  const width = 720;
  const height = 230;
  const padding = 34;
  const values = {
    composite: points.map((point) => point.composite),
    interaction: points.map((point) => point.categories.interaction),
    homework: points.map((point) => point.categories.homework),
    exam: points.map((point) => point.categories.exam)
  };

  return (
    <div className="grade-trend">
      <div className="grade-trend-legend">
        {series.map((item) => (
          <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="成绩趋势图">
        {[0, 25, 50, 75, 100].map((value) => {
          const y = padding + ((100 - value) / 100) * (height - padding * 2);
          return (
            <g key={value}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} className="grade-trend-grid" />
              <text x={padding - 8} y={y + 4} textAnchor="end" className="grade-trend-axis">{value}</text>
            </g>
          );
        })}
        {series.map((item) => {
          const plotted = linePoints(values[item.key], width, height, padding);
          const path = plotted
            .filter((point): point is NonNullable<typeof point> => Boolean(point))
            .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
            .join(" ");
          return (
            <g key={item.key}>
              {path && <path d={path} fill="none" stroke={item.color} strokeWidth={item.key === "composite" ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" />}
              {plotted.filter(Boolean).map((point, index) => (
                <circle key={`${item.key}-${index}`} cx={point!.x} cy={point!.y} r={item.key === "composite" ? 4 : 3} fill="#fff" stroke={item.color} strokeWidth="2">
                  <title>{`${item.label} ${point!.value}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        {points.map((point, index) => {
          if (points.length > 8 || index % Math.ceil(points.length / 6) !== 0) return null;
          const x = points.length === 1 ? width / 2 : padding + (index / (points.length - 1)) * (width - padding * 2);
          const label = point.key.includes("-")
            ? dateInputInTimeZone(new Date(point.startAt), timeZone).slice(5)
            : point.key;
          return <text key={point.key} x={x} y={height - 8} textAnchor="middle" className="grade-trend-axis">{label}</text>;
        })}
      </svg>
    </div>
  );
}
