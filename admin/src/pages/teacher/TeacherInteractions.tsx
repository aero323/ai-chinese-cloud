import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { BookOpen, CalendarCheck, Clock3, Eye, Layers3, Plus, Search, Sparkles } from "lucide-react";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, getCurrentInteractionVersion, getLesson, getTeacherSessions } from "../../lib/domain";
import type { InteractionItem, InteractionSet, InteractionTemplate, InteractionType, Phase } from "../../domain/types";
import { interactionTypeShortLabel } from "../../lib/interactionTypes";
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Select, Tabs, TextInput } from "../../components/ui";
import { InteractionEditor, createInteractionItem } from "../../components/InteractionEditor";
import { InteractionTemplatePicker, templateToItem } from "../../components/InteractionTemplatePicker";
import { AssignSessionsModal } from "../../components/AssignSessionsModal";
import { InteractionPlayer } from "../../components/InteractionPlayer";
import { formatDateTime } from "../../lib/format";

export function TeacherInteractions() {
  const { t } = useTranslation();
  const { state, run } = usePlatformStore();
  const user = currentUser(state);
  const teacherSessions = getTeacherSessions(state, user.id);
  const lessonIds = [...new Set(teacherSessions.map((session) => session.lessonId))];
  const teacherSets = state.interactionSets.filter((set) => lessonIds.includes(set.lessonId));
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<"all" | Phase>("all");
  const [query, setQuery] = useState("");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<InteractionSet | null>(null);
  const [pendingSessionIds, setPendingSessionIds] = useState<string[]>([]);
  const [editingSet, setEditingSet] = useState<InteractionSet | null | undefined>(undefined);
  const [previewItems, setPreviewItems] = useState<InteractionItem[] | null>(null);
  const [form, setForm] = useState({
    lessonId: lessonIds[0] ?? state.lessons[0]?.id ?? "",
    phase: "preview" as Phase,
    title: "",
    description: "",
    publishNote: ""
  });
  const [items, setItems] = useState<InteractionItem[]>([]);
  const filteredSets = teacherSets.filter((set) => {
    const matchesTab = tab === "all" || set.phase === tab;
    const lesson = getLesson(state, set.lessonId);
    const matchesQuery = !query || set.title.toLowerCase().includes(query.toLowerCase()) || lesson?.title.toLowerCase().includes(query.toLowerCase());
    return matchesTab && matchesQuery;
  });

  const sessionsOfLesson = (lessonId: string) =>
    teacherSessions
      .filter((session) => session.lessonId === lessonId)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  function openCreate(options?: { lessonId?: string; phase?: Phase; sessionIds?: string[] }) {
    setEditingSet(null);
    setPendingSessionIds(options?.sessionIds ?? []);
    setForm({
      lessonId: options?.lessonId ?? lessonIds[0] ?? state.lessons[0]?.id ?? "",
      phase: options?.phase ?? "preview",
      title: "",
      description: "",
      publishNote: ""
    });
    setItems([createInteractionItem("choice")]);
  }

  // 从课表进入：/teacher/interactions?sessionId=..&lessonId=..&phase=.. 或 ?editSetId=..
  useEffect(() => {
    const editSetId = searchParams.get("editSetId");
    const sessionId = searchParams.get("sessionId");
    const templateId = searchParams.get("templateId");
    if (!editSetId && !sessionId && !templateId) return;
    if (templateId) {
      const template = state.interactionTemplates.find((item) => item.id === templateId);
      if (template) {
        openCreate();
        setForm((value) => ({ ...value, title: template.title, description: template.summary }));
        setItems([templateToItem(template)]);
      }
    } else if (editSetId) {
      const target = state.interactionSets.find((item) => item.id === editSetId);
      if (target) openEdit(target);
    } else if (sessionId) {
      const session = state.sessions.find((item) => item.id === sessionId);
      if (session) {
        openCreate({
          lessonId: session.lessonId,
          phase: (searchParams.get("phase") as Phase) ?? "live",
          sessionIds: [session.id]
        });
      }
    }
    const next = new URLSearchParams(searchParams);
    next.delete("editSetId");
    next.delete("sessionId");
    next.delete("lessonId");
    next.delete("phase");
    next.delete("templateId");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEdit(set: InteractionSet) {
    const version = getCurrentInteractionVersion(state, set);
    setEditingSet(set);
    setForm({
      lessonId: set.lessonId,
      phase: set.phase,
      title: set.title,
      description: set.description,
      publishNote: ""
    });
    setItems(version ? structuredClone(version.items) : []);
  }

  function save() {
    if (!form.title.trim()) return;
    const result = run(
      () =>
        platform.saveInteractionSet({
          setId: editingSet?.id,
          lessonId: form.lessonId,
          title: form.title,
          description: form.description,
          phase: form.phase,
          items,
          actorId: user.id,
          publishNote: form.publishNote
        }),
      "互动已保存并发布新版本"
    );
    if (result.ok) {
      const savedSet = result.data?.set;
      if (pendingSessionIds.length && savedSet) {
        run(
          () => platform.assignInteractionSessions({ setId: savedSet.id, sessionIds: pendingSessionIds, actorId: user.id }),
          "已同时配置到所选课次"
        );
      }
      setPendingSessionIds([]);
      setEditingSet(undefined);
    }
  }

  function saveAssign(sessionIds: string[]) {
    if (!assignTarget) return;
    const result = run(
      () => platform.assignInteractionSessions({ setId: assignTarget.id, sessionIds, actorId: user.id }),
      sessionIds.length ? `已配置到 ${sessionIds.length} 节课次` : "已改为作用于全部课次"
    );
    if (result.ok) setAssignTarget(null);
  }

  return (
    <>
      <PageHeader
        eyebrow="Interaction builder"
        title={t("teacher.interactionSets")}
        description="课节由运营在课程目录创建、课次由运营排课；这里只负责为你的课节准备互动，并把设计配置到具体课次。"
        actions={<Button onClick={() => openCreate()}><Plus size={17} /> {t("teacher.createInteraction")}</Button>}
      />

      <Card className="content-filter-bar">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "全部", count: teacherSets.length },
            { value: "preview", label: "预习", count: teacherSets.filter((set) => set.phase === "preview").length },
            { value: "live", label: "课中", count: teacherSets.filter((set) => set.phase === "live").length },
            { value: "review", label: "复习", count: teacherSets.filter((set) => set.phase === "review").length }
          ]}
        />
        <div className="search-box">
          <Search size={17} />
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索互动或课节" />
        </div>
      </Card>

      <div className="interaction-list-grid">
        {filteredSets.map((set) => {
          const version = getCurrentInteractionVersion(state, set);
          const lesson = getLesson(state, set.lessonId);
          const typeCounts = new Map<string, number>();
          version?.items.forEach((item) => typeCounts.set(item.type, (typeCounts.get(item.type) ?? 0) + 1));
          return (
            <Card className="interaction-manage-card" key={set.id}>
              <div className="interaction-manage-head">
                <span className={`phase-badge phase-${set.phase}`}>
                  {set.phase === "preview" ? "预习" : set.phase === "live" ? "课中" : "复习"}
                </span>
              </div>
              <h2>{set.title}</h2>
              <p>{set.description}</p>
              <div className="interaction-lesson-ref">
                <BookOpen size={16} />
                <span>{lesson?.coverEmoji} {lesson?.title}</span>
              </div>
              <div className="interaction-scope-row">
                <CalendarCheck size={15} />
                {set.sessionIds && set.sessionIds.length > 0 ? (
                  <span className="scope-specific">
                    已配置 {set.sessionIds.length} / {sessionsOfLesson(set.lessonId).length} 节课次：
                    {set.sessionIds
                      .map((id) => teacherSessions.find((session) => session.id === id))
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((session) => formatDateTime(session!.startAt, state.ui.timeZone, state.ui.language))
                      .join("、")}
                    {set.sessionIds.length > 2 ? " 等" : ""}
                  </span>
                ) : (
                  <span className="scope-all">全部课次（{sessionsOfLesson(set.lessonId).length} 节）</span>
                )}
              </div>
              <div className="interaction-type-chips">
                {[...typeCounts.entries()].map(([type, count]) => (
                  <span key={type}>
                    {interactionTypeShortLabel(type as InteractionType)} × {count}
                  </span>
                ))}
              </div>
              <div className="interaction-manage-footer">
                <small><Clock3 size={14} /> {formatDateTime(set.updatedAt, state.ui.timeZone, state.ui.language)}</small>
                <div>
                  <Button size="sm" variant="ghost" onClick={() => setPreviewItems(version?.items ?? [])}><Eye size={15} /> 预览</Button>
                  <Button size="sm" variant="soft" onClick={() => setAssignTarget(set)}><CalendarCheck size={15} /> 配置到课节</Button>
                  <Button size="sm" variant="secondary" onClick={() => openEdit(set)}>编辑</Button>
                </div>
              </div>
            </Card>
          );
        })}
        {filteredSets.length === 0 && <EmptyState title="暂无互动内容" description="新建一个互动模板，开始配置你的课堂。" action={<Button onClick={() => openCreate()}>新建互动</Button>} />}
      </div>

      <Modal
        open={editingSet !== undefined}
        title={editingSet ? t("teacher.editInteraction") : t("teacher.createInteraction")}
        onClose={() => setEditingSet(undefined)}
        width="1080px"
        footer={
          <div className="modal-footer-split">
            <span>
              {items.length} 个互动题目
              {pendingSessionIds.length > 0 && ` · 发布后自动配置到 ${pendingSessionIds.length} 节课次`}
            </span>
            <div>
              <Button variant="ghost" onClick={() => setEditingSet(undefined)}>取消</Button>
              <Button onClick={save}>{t("common.publish")}</Button>
            </div>
          </div>
        }
      >
        <div className="editor-page-layout">
          <div className="editor-main-column">
            <Card className="editor-meta-card">
              <div className="editor-grid">
                <Field label="所属课节">
                  <Select value={form.lessonId} onChange={(event) => setForm((value) => ({ ...value, lessonId: event.target.value }))}>
                    {state.lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
                  </Select>
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
                <Field label="给学生的说明" className="field-span-2">
                  <textarea className="input textarea" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} />
                </Field>
                <Field label="发布说明" className="field-span-2">
                  <TextInput value={form.publishNote} onChange={(event) => setForm((value) => ({ ...value, publishNote: event.target.value }))} placeholder="本次修改了什么？" />
                </Field>
              </div>
            </Card>
            <Card className="editor-template-bar">
              <div>
                <strong>从模板库引用</strong>
                <span>素材库共有 {state.interactionTemplates.length} 套预制模板，按题型 / 主题 / 难度挑选后可直接改内容。</span>
              </div>
              <Button variant="secondary" onClick={() => setTemplatePickerOpen(true)}>
                <Layers3 size={16} /> 打开模板库
              </Button>
            </Card>
            <InteractionEditor items={items} onChange={setItems} />
          </div>

          <aside className="editor-side-column">
            <Card>
              <div className="card-heading">
                <div>
                  <span className="eyebrow">Preview</span>
                  <h2>快速检查</h2>
                </div>
                <Sparkles size={19} />
              </div>
              <p className="muted-copy">发布前可以先预览学生看到的题目和反馈。</p>
              <Button variant="secondary" className="full-width" onClick={() => setPreviewItems(items)}><Eye size={16} /> 预览全部互动</Button>
            </Card>

            <Card className="template-help-card">
              <Layers3 size={21} />
              <h3>十八类题型</h3>
              <p>选择、排序、填空、投票、连线、翻牌、看图单选、图片—词语连线、情景选择、对话补全，加上拼音匹配、分类归组、拼字组词、找错误、听音选词、跟读模仿、看图说话和开放问答，可以混排在同一个互动集中。</p>
            </Card>
          </aside>
        </div>
      </Modal>

      <Modal open={Boolean(previewItems)} title="学生端互动预览" onClose={() => setPreviewItems(null)} width="900px">
        {previewItems && <InteractionPlayer items={previewItems} preview onClose={() => setPreviewItems(null)} />}
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

      <AssignSessionsModal
        open={Boolean(assignTarget)}
        onClose={() => setAssignTarget(null)}
        state={state}
        set={assignTarget}
        sessions={assignTarget ? sessionsOfLesson(assignTarget.lessonId) : []}
        onSave={saveAssign}
      />
    </>
  );
}
