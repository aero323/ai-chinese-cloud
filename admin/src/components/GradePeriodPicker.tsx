import { CalendarDays } from "lucide-react";
import type { GradeRangePreset, GradeRangeSelection } from "../lib/gradeAnalytics";
import { relativeGradeRange } from "../lib/gradeAnalytics";
import { Select, TextInput } from "./ui";

export function GradePeriodPicker({
  value,
  onChange,
  className = ""
}: {
  value: GradeRangeSelection;
  onChange: (value: GradeRangeSelection) => void;
  className?: string;
}) {
  function changePreset(preset: GradeRangePreset) {
    if (preset === "custom") {
      onChange({ ...value, preset });
      return;
    }
    const days = Number(preset.slice(0, -1)) as 7 | 30 | 90;
    onChange(relativeGradeRange(value.timeZone, days));
  }

  return (
    <div className={`grade-period-picker ${className}`}>
      <span className="grade-period-label"><CalendarDays size={15} /> 统计时间</span>
      <Select
        value={value.preset}
        onChange={(event) => changePreset(event.target.value as GradeRangePreset)}
        aria-label="统计时间范围"
      >
        <option value="7d">最近 7 天</option>
        <option value="30d">最近 30 天</option>
        <option value="90d">最近 90 天</option>
        <option value="custom">自定义</option>
      </Select>
      <div className="grade-period-custom">
        <TextInput
          type="date"
          value={value.start}
          max={value.end}
          onChange={(event) => onChange({ ...value, preset: "custom", start: event.target.value })}
          aria-label="开始日期"
        />
        <span>至</span>
        <TextInput
          type="date"
          value={value.end}
          min={value.start}
          onChange={(event) => onChange({ ...value, preset: "custom", end: event.target.value })}
          aria-label="结束日期"
        />
      </div>
    </div>
  );
}
