import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, CalendarCheck, Clock3, Eye, Layers3, Plus, Search } from "lucide-react";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, getCurrentInteractionVersion, getLesson, getTeacherSessions } from "../../lib/domain";
import type { InteractionItem, InteractionSet, Phase } from "../../domain/types";
import { interactionTypeShortLabel } from "../../lib/interactionTypes";
import { Badge, Button, Card, EmptyState, Modal, PageHeader, Select, Tabs, TextInput } from "../../components/ui";
import { AssignSessionsModal } from "../../components/AssignSessionsModal";
import { templateToItem } from "../../components/InteractionTemplatePicker";
import { InteractionPlayer, StudentPhonePreview } from "../../components/InteractionPlayer";
import { InteractionSetEditorModal } from "../../components/InteractionSetEditorModal";
import { PmNote } from "../../components/PmNote";
import { formatDateTime } from "../../lib/format";

export function TeacherInteractions({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const { state, run } = usePlatformStore();
  const navigate = useNavigate();
  const user = currentUser(state);
  const teacherSessions = getTeacherSessions(state, user.id);
  const lessonIds = [...new Set(teacherSessions.map((session) => session.lessonId))];
  const teacherSets = state.interactionSets.filter((set) => lessonIds.includes(set.lessonId));
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<"all" | Phase>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"nearest" | "created-desc" | "created-asc">("nearest");
  const [assignTarget, setAssignTarget] = useState<InteractionSet | null>(null);
  const [pendingSessionIds, setPendingSessionIds] = useState<string[]>([]);
  const [editingSet, setEditingSet] = useState<InteractionSet | null | undefined>(undefined);
  const [editorSeed, setEditorSeed] = useState<{ lessonId?: string; phase?: Phase; title?: string; items?: InteractionItem[] }>({});
  const [previewItems, setPreviewItems] = useState<InteractionItem[] | null>(null);
  /** 一组互动最近一次课次距离当前时间的间隔；用于“按最近课次”排序。 */
  function nearestSessionDistance(set: InteractionSet) {
    const lessonSessions = teacherSessions.filter((session) => session.lessonId === set.lessonId);
    const scoped = set.sessionIds && set.sessionIds.length > 0
      ? lessonSessions.filter((session) => set.sessionIds?.includes(session.id))
      : lessonSessions;
    if (scoped.length === 0) return Number.POSITIVE_INFINITY;
    const now = Date.now();
    return Math.min(...scoped.map((session) => Math.abs(new Date(session.startAt).getTime() - now)));
  }

  /** 卡片上显示的日期就是互动最近一次编辑（创建版本）的时间。 */
  const filteredSets = teacherSets
    .filter((set) => {
      const matchesTab = tab === "all" || set.phase === tab;
      const lesson = getLesson(state, set.lessonId);
      const matchesQuery = !query || set.title.toLowerCase().includes(query.toLowerCase()) || lesson?.title.toLowerCase().includes(query.toLowerCase());
      return matchesTab && matchesQuery;
    })
    .sort((a, b) => {
      if (sortKey === "created-desc") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sortKey === "created-asc") return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      const distance = nearestSessionDistance(a) - nearestSessionDistance(b);
      return distance !== 0 ? distance : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const sessionsOfLesson = (lessonId: string) =>
    teacherSessions
      .filter((session) => session.lessonId === lessonId)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  function openCreate(options?: { lessonId?: string; phase?: Phase; sessionIds?: string[]; title?: string; items?: InteractionItem[] }) {
    setPendingSessionIds(options?.sessionIds ?? []);
    setEditorSeed({ lessonId: options?.lessonId, phase: options?.phase, title: options?.title, items: options?.items });
    setEditingSet(null);
  }

  // 从课表进入：/teacher/interactions?sessionId=..&lessonId=..&phase=.. 或 ?editSetId=..
  useEffect(() => {
    const editSetId = searchParams.get("editSetId");
    const previewSetId = searchParams.get("previewSetId");
    const sessionId = searchParams.get("sessionId");
    const templateId = searchParams.get("templateId");
    if (!editSetId && !previewSetId && !sessionId && !templateId) return;
    if (templateId) {
      const template = state.interactionTemplates.find((item) => item.id === templateId);
      if (template) {
        openCreate({ lessonId: lessonIds[0], title: template.title, items: [templateToItem(template)] });
      }
    } else if (previewSetId) {
      const target = state.interactionSets.find((item) => item.id === previewSetId);
      if (target) setPreviewItems(getCurrentInteractionVersion(state, target)?.items ?? []);
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
    next.delete("previewSetId");
    next.delete("sessionId");
    next.delete("lessonId");
    next.delete("phase");
    next.delete("templateId");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEdit(set: InteractionSet) {
    setPendingSessionIds([]);
    setEditingSet(set);
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
      {!embedded && (
        <PageHeader
          eyebrow="Interaction library"
          title="我的互动设计"
          description="集中管理你准备过的全部互动设计，可预览、配置课次或继续编辑。"
          actions={
            <>
              <Button variant="secondary" onClick={() => navigate("/teacher/schedule")}><CalendarCheck size={16} /> 去我的课表</Button>
              <PmNote kind="流程" note="点击后创建互动；保存并发布会立即生成学生看到的当前版本。">
                <Button onClick={() => openCreate()}><Plus size={17} /> {t("teacher.createInteraction")}</Button>
              </PmNote>
            </>
          }
        />
      )}

      <Card className="content-filter-bar">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "全部", count: teacherSets.length },
            { value: "preview", label: "课前", count: teacherSets.filter((set) => set.phase === "preview").length },
            { value: "live", label: "课中", count: teacherSets.filter((set) => set.phase === "live").length },
            { value: "review", label: "复习", count: teacherSets.filter((set) => set.phase === "review").length }
          ]}
        />
        <div className="filter-bar-trailing">
          <div className="search-box">
            <Search size={17} />
            <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索互动或课节" />
          </div>
          <PmNote kind="口径" note="按最近课次排序时同时参考作用范围；卡片时间显示最近一次发布或编辑时间。">
            <Select
              className="sort-select"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as "nearest" | "created-desc" | "created-asc")}
              aria-label="排序方式"
            >
              <option value="nearest">按最近课次</option>
              <option value="created-desc">按创建时间：新→旧</option>
              <option value="created-asc">按创建时间：旧→新</option>
            </Select>
          </PmNote>
          {embedded && (
            <PmNote kind="流程" note="点击后创建互动；保存并发布会立即生成学生看到的当前版本。">
              <Button onClick={() => openCreate()}><Plus size={17} /> {t("teacher.createInteraction")}</Button>
            </PmNote>
          )}
        </div>
      </Card>

      <PmNote block kind="规则" note="一个互动可作用全部或部分课次，移出单节课不影响其他课次。预览查看学生视图，配置调整课次范围，编辑保存后成为当前版本。">
        <div className="interaction-list-grid">
        {filteredSets.map((set) => {
          const version = getCurrentInteractionVersion(state, set);
          const lesson = getLesson(state, set.lessonId);
          const types = [...new Set((version?.items ?? []).map((item) => item.type))];
          return (
            <Card className="interaction-manage-card" key={set.id}>
              <div className="interaction-manage-head">
                <span className={`phase-badge phase-${set.phase}`}>
                  {set.phase === "preview" ? "课前" : set.phase === "live" ? "课中" : "复习"}
                </span>
              </div>
              <h2>{set.title}</h2>
              {types.length > 0 && (
                <div className="interaction-type-chips interaction-manage-type">
                  {types.map((type) => (
                    <span key={type}>{interactionTypeShortLabel(type)}</span>
                  ))}
                </div>
              )}
              <div className="interaction-lesson-ref">
                <BookOpen size={16} />
                <span>{lesson?.coverEmoji} {lesson?.title}</span>
              </div>
              <div className="interaction-scope-row">
                <CalendarCheck size={15} />
                {set.sessionIds ? (
                  <span className="scope-specific">
                    {`已配置 ${set.sessionIds.length} / ${sessionsOfLesson(set.lessonId).length} 节课次${set.sessionIds.length ? "：" : ""}`}
                    {set.sessionIds
                      .map((id) => teacherSessions.find((session) => session.id === id))
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((session) => formatDateTime(session!.startAt, state.ui.timeZone, state.ui.language))
                      .join("、")}
                    {set.sessionIds.length > 2 ? " 等" : ""}
                  </span>
                ) : (
                  <span className="scope-all">
                    全部课次（{sessionsOfLesson(set.lessonId).length} 节）
                    {(set.excludedSessionIds?.length ?? 0) > 0 && ` · 已移出 ${set.excludedSessionIds!.length} 节`}
                  </span>
                )}
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
      </PmNote>

      <InteractionSetEditorModal
        open={editingSet !== undefined}
        set={editingSet ?? null}
        defaultLessonId={editorSeed.lessonId ?? lessonIds[0] ?? state.lessons[0]?.id}
        defaultPhase={editorSeed.phase ?? "preview"}
        presetTitle={editorSeed.title}
        presetItems={editorSeed.items}
        teacherId={user.id}
        pendingSessionIds={pendingSessionIds}
        onClose={() => {
          setEditingSet(undefined);
          setPendingSessionIds([]);
        }}
      />

      <Modal open={Boolean(previewItems)} title="学生端互动预览" onClose={() => setPreviewItems(null)} width="520px">
        {previewItems && <StudentPhonePreview items={previewItems} onClose={() => setPreviewItems(null)} />}
      </Modal>

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
