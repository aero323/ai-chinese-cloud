import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import type { ClassSession, InteractionSet, PlatformState } from "../domain/types";
import { formatDateTime } from "../lib/format";
import { Badge, Button, Modal } from "./ui";

export function AssignSessionsModal({
  open,
  onClose,
  state,
  set,
  sessions,
  onSave
}: {
  open: boolean;
  onClose: () => void;
  state: PlatformState;
  set: InteractionSet | null;
  sessions: ClassSession[];
  onSave: (sessionIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open && set) setSelected(set.sessionIds ? [...set.sessionIds] : []);
  }, [open, set]);

  if (!set) return null;
  const ordered = [...sessions].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  return (
    <Modal
      open={open}
      title={`配置到课节 · ${set.title}`}
      onClose={onClose}
      width="760px"
      footer={
        <div className="modal-footer-split">
          <span>
            {selected.length === 0 ? "未勾选 = 作用于该课节的全部课次" : `已选 ${selected.length} 节课次`}
          </span>
          <div>
            <Button variant="ghost" onClick={onClose}>取消</Button>
            <Button onClick={() => onSave(selected)}>保存配置</Button>
          </div>
        </div>
      }
    >
      <p className="muted-copy">
        互动发布后会出现在被勾选的课次里；不勾选任何课次时，该互动作用于这门课节的所有课次（含后续新排的课）。
      </p>

      <div className="assign-session-toolbar">
        <Button size="sm" variant="ghost" onClick={() => setSelected(ordered.map((session) => session.id))}>全选本课节课次</Button>
        <Button size="sm" variant="ghost" onClick={() => setSelected([])}>清空（全部课次）</Button>
        <Badge tone="purple">{ordered.length} 节课次</Badge>
      </div>

      <div className="assign-session-list">
        {ordered.map((session) => {
          const checked = selected.includes(session.id);
          const ended = new Date(session.endAt).getTime() < Date.now();
          return (
            <label key={session.id} className={`assign-session-row ${checked ? "selected" : ""}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  setSelected((value) => (checked ? value.filter((id) => id !== session.id) : [...value, session.id]))
                }
              />
              <span className="assign-session-copy">
                <strong>{session.title}</strong>
                <small>
                  <CalendarClock size={13} /> {formatDateTime(session.startAt, state.ui.timeZone, state.ui.language)} · {session.roomLabel}
                </small>
              </span>
              <Badge tone={ended ? "neutral" : session.source === "series" ? "blue" : "mint"}>
                {ended ? "已结束" : session.source === "series" ? "系列班" : "单次班"}
              </Badge>
            </label>
          );
        })}
        {ordered.length === 0 && <p className="muted-copy">这门课节还没有排课。</p>}
      </div>
    </Modal>
  );
}
