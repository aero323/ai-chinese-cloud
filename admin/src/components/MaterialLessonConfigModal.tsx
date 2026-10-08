import { useEffect, useMemo, useState } from "react";
import { CalendarClock, GraduationCap, Plus, Trash2 } from "lucide-react";
import type { Lesson, Material, Phase, PlatformState } from "../domain/types";
import { formatDateTime } from "../lib/format";
import { getLessonSessions, scopeLabel } from "../lib/domain";
import { platform } from "../lib/platform";
import { usePlatformStore } from "../store/usePlatformStore";
import { Badge, Button, Field, Modal, Select } from "./ui";

const phaseLabels: Record<Phase, string> = { preview: "课前", live: "课中", review: "复习" };
const phaseOptions: Array<{ value: Phase; label: string }> = [
  { value: "preview", label: "课前预习" },
  { value: "live", label: "课中" },
  { value: "review", label: "课后复习" }
];
const phaseTones: Record<Phase, "blue" | "purple" | "mint"> = { preview: "blue", live: "purple", review: "mint" };

/** 材料库里的“配置到课节”：把一份材料挂到某个课节的课前 / 课中 / 复习，并限定课次范围。 */
export function MaterialLessonConfigModal({
  open,
  onClose,
  material,
  state,
  lessons,
  teacherId
}: {
  open: boolean;
  onClose: () => void;
  material: Material | null;
  state: PlatformState;
  lessons: Lesson[];
  teacherId: string;
}) {
  const { run } = usePlatformStore();
  const [lessonId, setLessonId] = useState("");
  const [phase, setPhase] = useState<Phase>("preview");
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  const lessonKey = lessons.map((lesson) => lesson.id).join("|");

  useEffect(() => {
    if (!open) return;
    setLessonId((value) => (lessons.some((lesson) => lesson.id === value) ? value : lessons[0]?.id ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lessonKey]);

  const refs = useMemo(
    () => state.materialRefs.filter((ref) => ref.materialId === material?.id && lessons.some((lesson) => lesson.id === ref.lessonId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.materialRefs, material?.id, lessonKey]
  );
  const activeRef = refs.find((ref) => ref.lessonId === lessonId && ref.phase === phase);
  const sessions = useMemo(
    () => (lessonId ? getLessonSessions(state, lessonId, teacherId) : []),
    [state, lessonId, teacherId]
  );

  // 切换课节或阶段时，回填该组合已有的课次范围，避免保存后范围被意外覆盖成“全部课次”。
  useEffect(() => {
    if (!open) return;
    setSelectedSessions(activeRef?.sessionIds ? [...activeRef.sessionIds] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lessonId, phase, activeRef?.id, (activeRef?.sessionIds ?? []).join(",")]);

  if (!material) return null;

  function save() {
    if (!material || !lessonId) return;
    const siblingOrders = state.materialRefs
      .filter((ref) => ref.lessonId === lessonId && ref.phase === phase)
      .map((ref) => ref.order);
    const order = activeRef?.order ?? (siblingOrders.length ? Math.max(...siblingOrders) + 1 : 1);
    run(
      () =>
        platform.attachMaterial({
          materialId: material.id,
          lessonId,
          phase,
          order,
          sessionIds: selectedSessions,
          actorId: teacherId
        }),
      selectedSessions.length ? `已配置到 ${selectedSessions.length} 节课次` : "已配置到该课节全部课次"
    );
  }

  return (
    <Modal
      open={open}
      title={`配置到课节 · ${material.title}`}
      onClose={onClose}
      width="760px"
      footer={
        <div className="modal-footer-split">
          <span>
            {selectedSessions.length ? `已选 ${selectedSessions.length} 节课次` : "作用于该课节全部课次（含后续新排课）"}
          </span>
          <div>
            <Button variant="ghost" onClick={onClose}>关闭</Button>
            <Button onClick={save} disabled={!lessonId}>
              <Plus size={16} /> {activeRef ? "更新配置" : "添加到课节"}
            </Button>
          </div>
        </div>
      }
    >
      {lessons.length === 0 ? (
        <p className="muted-copy">你还没有排课，先到“我的课表”安排课节后再配置材料。</p>
      ) : (
        <>
          <p className="muted-copy">
            选择课节与阶段后，材料会出现在对应课次的学生端任务里；不勾选课次即覆盖该课节全部课次。
          </p>

          <div className="editor-grid">
            <Field label="课节">
              <Select value={lessonId} onChange={(event) => setLessonId(event.target.value)}>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                ))}
              </Select>
            </Field>
            <Field label="学习阶段">
              <Select value={phase} onChange={(event) => setPhase(event.target.value as Phase)}>
                {phaseOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </Field>
          </div>

          {activeRef && (
            <p className="material-config-hint">
              该课节已配置此材料（{scopeLabel(activeRef)}），保存会覆盖原有范围。
            </p>
          )}

          <div className="assign-session-toolbar">
            <Button size="sm" variant="ghost" onClick={() => setSelectedSessions(sessions.map((session) => session.id))}>
              全选本课节课次
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedSessions([])}>
              清空（全部课次）
            </Button>
          </div>

          <div className="assign-session-list">
            {sessions.map((session) => {
              const checked = selectedSessions.includes(session.id);
              const ended = new Date(session.endAt).getTime() < Date.now();
              return (
                <label key={session.id} className={`assign-session-row ${checked ? "selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelectedSessions((value) => (checked ? value.filter((id) => id !== session.id) : [...value, session.id]))
                    }
                  />
                  <span className="assign-session-copy">
                    <strong>{session.title}</strong>
                    <small>
                      <GraduationCap size={13} /> {session.className}
                    </small>
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
            {sessions.length === 0 && <p className="muted-copy">这门课节还没有排课，保存后会作用于后续新排的课次。</p>}
          </div>

          <div className="material-config-list">
            <h3>已配置的课节 <span>{refs.length}</span></h3>
            {refs.length === 0 && <p className="muted-copy">当前材料还没有关联到你的课节。</p>}
            {refs.map((ref) => {
              const lesson = lessons.find((item) => item.id === ref.lessonId);
              return (
                <div className="material-config-row" key={ref.id}>
                  <Badge tone={phaseTones[ref.phase]}>{phaseLabels[ref.phase]}</Badge>
                  <strong>{lesson?.title ?? "课节"}</strong>
                  <small>{scopeLabel(ref)}</small>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`从${lesson?.title ?? "课节"} · ${phaseLabels[ref.phase]} 移除`}
                    onClick={() =>
                      run(
                        () =>
                          platform.detachMaterial({
                            materialId: material.id,
                            lessonId: ref.lessonId,
                            phase: ref.phase,
                            actorId: teacherId
                          }),
                        "已从课节移除"
                      )
                    }
                  >
                    <Trash2 size={15} /> 移除
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Modal>
  );
}
