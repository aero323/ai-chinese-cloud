import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock3, Layers3 } from "lucide-react";
import type { InteractionItem, InteractionSet, InteractionTemplate, Phase } from "../domain/types";
import { platform } from "../lib/platform";
import { usePlatformStore } from "../store/usePlatformStore";
import { getCurrentInteractionVersion, getLesson } from "../lib/domain";
import { Button, Card, Field, Modal, Select, TextInput } from "./ui";
import { InteractionEditor, createInteractionItem } from "./InteractionEditor";
import { InteractionTemplatePicker, templateToItem } from "./InteractionTemplatePicker";
import { PmNote } from "./PmNote";

const phaseLabels: Record<Phase, string> = { preview: "课前预习", live: "课中互动", review: "课后复习" };

function defaultCountsTowardGrade(items: InteractionItem[]) {
  const onlyPoll = items.length > 0 && items.every((item) => item.type === "poll");
  const hasPlaceholderSpeaking = items.some((item) => ["read-aloud", "picture-talk", "open-qa"].includes(item.type));
  return !onlyPoll && !hasPlaceholderSpeaking;
}

/** 互动设计的创建 / 编辑弹窗：设计库与课堂设计页共用。 */
export function InteractionSetEditorModal({
  open,
  set,
  defaultLessonId,
  defaultPhase = "live",
  lockLesson = false,
  teacherId,
  pendingSessionIds = [],
  presetItems,
  presetTitle,
  onClose
}: {
  open: boolean;
  /** null = 新建；InteractionSet = 编辑该设计。 */
  set: InteractionSet | null;
  defaultLessonId?: string;
  defaultPhase?: Phase;
  /** 从课堂设计页进入时锁定课节，避免误改到别的课节。 */
  lockLesson?: boolean;
  teacherId: string;
  /** 保存后自动配置到这些课次。 */
  pendingSessionIds?: string[];
  /** 用模板新建：预填题目与标题。 */
  presetItems?: InteractionItem[];
  presetTitle?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { state, run } = usePlatformStore();
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [form, setForm] = useState({
    lessonId: defaultLessonId ?? state.lessons[0]?.id ?? "",
    phase: defaultPhase,
    title: "",
    publishNote: ""
  });
  const [items, setItems] = useState<InteractionItem[]>([]);
  /** 当前高亮的题目：决定哪张题目卡片处于编辑态。 */
  const [activeItemId, setActiveItemId] = useState("");
  const [countsTowardGrade, setCountsTowardGrade] = useState(true);
  const [assignmentScope, setAssignmentScope] = useState<"session" | "lesson">("session");

  useEffect(() => {
    if (!open) return;
    setAssignmentScope("session");
    setActiveItemId("");
    if (set) {
      const version = getCurrentInteractionVersion(state, set);
      setForm({
        lessonId: set.lessonId,
        phase: set.phase,
        title: set.title,
        publishNote: ""
      });
      setItems(version ? structuredClone(version.items) : []);
      setCountsTowardGrade(set.countsTowardGrade ?? defaultCountsTowardGrade(version?.items ?? []));
    } else {
      setForm({
        lessonId: defaultLessonId ?? state.lessons[0]?.id ?? "",
        phase: defaultPhase,
        title: presetTitle ?? "",
        publishNote: ""
      });
      const nextItems = presetItems ? structuredClone(presetItems) : [createInteractionItem("choice")];
      setItems(nextItems);
      setCountsTowardGrade(defaultCountsTowardGrade(nextItems));
    }
    // 只在打开或切换编辑对象时重置表单。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, set?.id]);

  const lesson = getLesson(state, form.lessonId);
  const activeItem = items.find((item) => item.id === activeItemId) ?? items[0] ?? null;

  function save() {
    if (!form.title.trim()) return;
    const result = run(
      () =>
        platform.saveInteractionSet({
          setId: set?.id,
          lessonId: form.lessonId,
          title: form.title,
          phase: form.phase,
          items,
          countsTowardGrade,
          actorId: teacherId,
          publishNote: form.publishNote
        }),
      "互动已保存并发布新版本"
    );
    if (!result.ok) return;
    const savedSet = result.data?.set;
    if (pendingSessionIds.length && savedSet) {
      const assignedSessionIds = assignmentScope === "session" ? pendingSessionIds : [];
      run(
        () => platform.assignInteractionSessions({ setId: savedSet.id, sessionIds: assignedSessionIds, actorId: teacherId }),
        assignmentScope === "session" ? "已配置到本节课" : "已配置到该课节全部课次"
      );
    }
    onClose();
  }

  return (
    <>
      <Modal
        open={open}
        title={set ? t("teacher.editInteraction") : t("teacher.createInteraction")}
        onClose={onClose}
        headerExtra={
          <PmNote
            kind="规则"
            note="保存后会发布为一个新版本，并按预习 / 课中 / 复习的顺序出现在学生端对应阶段；版本回滚由内容治理处理。"
          >
            <span className="editor-phase-pill">
              <Clock3 size={15} /> 当前阶段 · {phaseLabels[form.phase]}
            </span>
          </PmNote>
        }
        width="1180px"
        footer={
          <div className="modal-footer-split">
            <span>
              {items.length} 个互动题目
              {!set && pendingSessionIds.length > 0 && ` · ${assignmentScope === "session" ? "仅配置到本节课" : "配置到该课节全部课次"}`}
            </span>
            <div>
              <Button variant="ghost" onClick={onClose}>取消</Button>
              <PmNote kind="流程" note="点击后生成新的不可变版本并立即切换为学生当前版本；历史版本仍可追溯。">
                <Button onClick={save}>{t("common.publish")}</Button>
              </PmNote>
            </div>
          </div>
        }
      >
        <div className="editor-page-layout">
          <div className="editor-main-column">
            <Card className="editor-meta-card">
              <div className="editor-grid">
                <Field label="所属课节">
                  {lockLesson ? (
                    <div className="editor-static-field">{lesson?.coverEmoji} {lesson?.title}</div>
                  ) : (
                    <Select value={form.lessonId} onChange={(event) => setForm((value) => ({ ...value, lessonId: event.target.value }))}>
                      {state.lessons.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label="学习阶段">
                  <Select value={form.phase} onChange={(event) => setForm((value) => ({ ...value, phase: event.target.value as Phase }))}>
                    <option value="preview">课前预习</option>
                    <option value="live">课中互动</option>
                    <option value="review">课后复习</option>
                  </Select>
                </Field>
                <Field label="互动标题" className="field-span-2">
                  <TextInput value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="例如：问候热身" />
                </Field>
                <label className="grade-count-toggle field-span-2">
                  <input type="checkbox" checked={countsTowardGrade} onChange={(event) => setCountsTowardGrade(event.target.checked)} />
                  <span><strong>计入学生成绩</strong><small>开启后，该互动的最高分进入“互动练习”分类；投票和语音占位互动默认关闭。</small></span>
                </label>
                <Field label="发布说明" className="field-span-2">
                  <PmNote kind="口径" note="发布说明写入版本记录，用于后续追踪改动，不展示给学生。">
                    <TextInput value={form.publishNote} onChange={(event) => setForm((value) => ({ ...value, publishNote: event.target.value }))} placeholder="介绍该互动的学习目的和内容吧" />
                  </PmNote>
                </Field>
              </div>
              {!set && pendingSessionIds.length > 0 && (
                <div className="scope-choice editor-scope-choice">
                  <button type="button" className={assignmentScope === "session" ? "active" : ""} onClick={() => setAssignmentScope("session")}>
                    仅配置于此课次
                  </button>
                  <button type="button" className={assignmentScope === "lesson" ? "active" : ""} onClick={() => setAssignmentScope("lesson")}>
                    该课节全部课次
                  </button>
                </div>
              )}
            </Card>
            <Card className="editor-template-bar">
              <div>
                <strong>从模板库引用</strong>
                <span>素材库共有 {state.interactionTemplates.length} 套预制模板，按题型 / 主题 / 难度挑选后可直接改内容。</span>
              </div>
              <PmNote kind="流程" note="点击后复制一套模板到当前互动，原模板不发生变化。">
                <Button variant="secondary" onClick={() => setTemplatePickerOpen(true)}>
                  <Layers3 size={16} /> 打开模板库
                </Button>
              </PmNote>
            </Card>
            <InteractionEditor
              items={items}
              onChange={setItems}
              activeItemId={activeItem?.id ?? ""}
              onActiveItemChange={setActiveItemId}
            />
          </div>
        </div>
      </Modal>

      <InteractionTemplatePicker
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        templates={state.interactionTemplates}
        onPick={(template: InteractionTemplate) => {
          setItems((current) => [...current, templateToItem(template)]);
          setTemplatePickerOpen(false);
        }}
      />
    </>
  );
}
