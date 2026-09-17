import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Clock3, Eye, History, Layers3, Plus, RotateCcw, Search, Sparkles } from "lucide-react";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, getCurrentInteractionVersion, getLesson, getTeacherSessions } from "../../lib/domain";
import type { InteractionItem, InteractionSet, Phase } from "../../domain/types";
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Select, Tabs, TextInput } from "../../components/ui";
import { InteractionEditor, createInteractionItem } from "../../components/InteractionEditor";
import { InteractionPlayer } from "../../components/InteractionPlayer";
import { formatDateTime } from "../../lib/format";

export function TeacherInteractions() {
  const { t } = useTranslation();
  const { state, run } = usePlatformStore();
  const user = currentUser(state);
  const teacherSessions = getTeacherSessions(state, user.id);
  const lessonIds = [...new Set(teacherSessions.map((session) => session.lessonId))];
  const teacherSets = state.interactionSets.filter((set) => lessonIds.includes(set.lessonId));
  const [tab, setTab] = useState<"all" | Phase>("all");
  const [query, setQuery] = useState("");
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

  const versions = editingSet
    ? state.interactionVersions
        .filter((version) => version.setId === editingSet.id)
        .sort((a, b) => b.version - a.version)
    : [];

  function openCreate() {
    setEditingSet(null);
    setForm({
      lessonId: lessonIds[0] ?? state.lessons[0]?.id ?? "",
      phase: "preview",
      title: "",
      description: "",
      publishNote: ""
    });
    setItems([createInteractionItem("choice")]);
  }

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
    if (result.ok) setEditingSet(undefined);
  }

  return (
    <>
      <PageHeader
        eyebrow="Interaction builder"
        title={t("teacher.interactionSets")}
        description="使用六类固定模板配置预习、课中和复习互动。每次发布都会保留版本。"
        actions={<Button onClick={openCreate}><Plus size={17} /> {t("teacher.createInteraction")}</Button>}
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
                <Badge tone="mint">v{version?.version ?? 1}</Badge>
              </div>
              <h2>{set.title}</h2>
              <p>{set.description}</p>
              <div className="interaction-lesson-ref">
                <BookOpen size={16} />
                <span>{lesson?.coverEmoji} {lesson?.title}</span>
              </div>
              <div className="interaction-type-chips">
                {[...typeCounts.entries()].map(([type, count]) => (
                  <span key={type}>
                    {type === "match" ? "连线" : type === "memory" ? "翻牌" : type === "choice" ? "选择" : type === "order" ? "排序" : type === "fill" ? "填空" : "投票"} × {count}
                  </span>
                ))}
              </div>
              <div className="interaction-manage-footer">
                <small><Clock3 size={14} /> {formatDateTime(set.updatedAt, state.ui.timeZone, state.ui.language)}</small>
                <div>
                  <Button size="sm" variant="ghost" onClick={() => setPreviewItems(version?.items ?? [])}><Eye size={15} /> 预览</Button>
                  <Button size="sm" variant="secondary" onClick={() => openEdit(set)}>编辑</Button>
                </div>
              </div>
            </Card>
          );
        })}
        {filteredSets.length === 0 && <EmptyState title="暂无互动内容" description="新建一个互动模板，开始配置你的课堂。" action={<Button onClick={openCreate}>新建互动</Button>} />}
      </div>

      <Modal
        open={editingSet !== undefined}
        title={editingSet ? t("teacher.editInteraction") : t("teacher.createInteraction")}
        onClose={() => setEditingSet(undefined)}
        width="1080px"
        footer={
          <div className="modal-footer-split">
            <span>{items.length} 个互动题目</span>
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

            {editingSet && (
              <Card>
                <div className="card-heading">
                  <div>
                    <span className="eyebrow">History</span>
                    <h2>{t("teacher.versionHistory")}</h2>
                  </div>
                  <History size={19} />
                </div>
                <div className="version-history-list">
                  {versions.map((version) => (
                    <article key={version.id} className={version.id === editingSet.currentVersionId ? "current" : ""}>
                      <div>
                        <strong>版本 {version.version}</strong>
                        {version.id === editingSet.currentVersionId && <Badge tone="mint">当前</Badge>}
                      </div>
                      <p>{version.publishNote}</p>
                      <small>{formatDateTime(version.publishedAt, state.ui.timeZone, state.ui.language)}</small>
                      {version.id !== editingSet.currentVersionId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const result = run(
                              () => platform.rollbackInteractionVersion({ setId: editingSet.id, versionId: version.id, actorId: user.id }),
                              `已回滚到版本 ${version.version}`
                            );
                            if (result.ok) setItems(structuredClone(version.items));
                          }}
                        >
                          <RotateCcw size={14} /> {t("teacher.rollback")}
                        </Button>
                      )}
                    </article>
                  ))}
                </div>
              </Card>
            )}

            <Card className="template-help-card">
              <Layers3 size={21} />
              <h3>六类模板</h3>
              <p>每一题都可以独立选择模板、答案和解释，并混排在同一个互动集中。</p>
            </Card>
          </aside>
        </div>
      </Modal>

      <Modal open={Boolean(previewItems)} title="学生端互动预览" onClose={() => setPreviewItems(null)} width="900px">
        {previewItems && <InteractionPlayer items={previewItems} preview onClose={() => setPreviewItems(null)} />}
      </Modal>
    </>
  );
}
