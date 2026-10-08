import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  Eye,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  GraduationCap,
  Layers3,
  LibraryBig,
  Link2,
  MapPin,
  Presentation,
  Search,
  SlidersHorizontal,
  UsersRound
} from "lucide-react";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";
import {
  currentUser,
  getBookedCount,
  getCurrentInteractionVersion,
  getLesson,
  getLessonSessions,
  getSession,
  scopeLabel,
  sessionMaterials,
  setAppliesToSession
} from "../../lib/domain";
import { formatDate, formatDateTime, formatRange, formatTime } from "../../lib/format";
import type { ClassSession, InteractionItem, InteractionSet, InteractionType, LessonMaterialRef, Material, Phase } from "../../domain/types";
import { Badge, Button, Card, EmptyState, Modal, PageHeader, ProgressBar, Tabs, TextInput } from "../../components/ui";
import { InteractionSetEditorModal } from "../../components/InteractionSetEditorModal";
import { AssignSessionsModal } from "../../components/AssignSessionsModal";
import { InteractionPlayer, StudentPhonePreview } from "../../components/InteractionPlayer";
import { PmNote } from "../../components/PmNote";
import { SessionRosterModal } from "../../components/SessionRosterModal";
import { INTERACTION_TYPE_SHORT_LABELS, interactionTypeShortLabel } from "../../lib/interactionTypes";
import { orderTemplatesForBrowse, templateLevelLabel } from "../../lib/templateLibrary";
import { TemplateTypeChips } from "../../components/TemplateTypeChips";
import { templateToItem } from "../../components/InteractionTemplatePicker";

const PHASES: Array<{ phase: Phase; label: string; short: string; hint: string; open: string }> = [
  { phase: "preview", label: "课前预习", short: "课前", hint: "提前熟悉词汇与句型，学生上课前完成。", open: "上课前开放" },
  { phase: "live", label: "课中互动", short: "课中", hint: "课堂投屏使用，老师按节奏逐个开启。", open: "课堂中开放" },
  { phase: "review", label: "课后复习", short: "课后", hint: "课堂结束后延续练习与巩固。", open: "下课后开放" }
];

function materialIcon(material: Material) {
  if (material.fileType === "pptx") return Presentation;
  if (material.fileType === "wav" || material.fileType === "mp3") return FileAudio;
  if (material.fileType === "video") return FileVideo;
  if (material.fileType === "image" || material.fileType === "png") return FileImage;
  return material.kind === "link" ? Link2 : FileText;
}

function materialVersion(material: Material) {
  return material.versions.find((version) => version.version === material.currentVersion) ?? material.versions.at(-1);
}

/** 材料作用范围：勾选课次 = 只在勾选的课次出现；不勾选 = 该课节全部课次。 */
function MaterialScopeModal({
  open,
  state,
  session,
  phase,
  material,
  teacherId,
  onClose
}: {
  open: boolean;
  state: ReturnType<typeof usePlatformStore.getState>["state"];
  session: ClassSession;
  phase: Phase;
  material: Material | null;
  teacherId: string;
  onClose: () => void;
}) {
  const { run } = usePlatformStore();
  const [selected, setSelected] = useState<string[]>([]);
  const sessions = getLessonSessions(state, session.lessonId);
  const ref = material
    ? state.materialRefs.find((item) => item.materialId === material.id && item.lessonId === session.lessonId && item.phase === phase)
    : undefined;

  useEffect(() => {
    if (!open || !ref) return;
    setSelected(ref.sessionIds ? [...ref.sessionIds] : []);
    // 只在打开或切换材料时重置选择。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ref?.id]);

  if (!material) return null;

  return (
    <Modal
      open={open}
      title={`配置材料范围 · ${material.title}`}
      onClose={onClose}
      width="720px"
      footer={
        <div className="modal-footer-split">
          <span>{selected.length ? `已选 ${selected.length} 节课次` : "作用于该课节全部课次"}</span>
          <div>
            <Button variant="ghost" onClick={onClose}>取消</Button>
            <PmNote kind="流程" note="点击后更新材料范围；留空会覆盖该课节全部课次和后续新排课。">
              <Button
                onClick={() => {
                  run(
                    () =>
                      platform.attachMaterial({
                        materialId: material.id,
                        lessonId: session.lessonId,
                        phase,
                        order: ref?.order ?? 1,
                        sessionIds: selected,
                        actorId: teacherId
                      }),
                    selected.length ? `材料已配置到 ${selected.length} 节课次` : "材料已改为作用于全部课次"
                  );
                  onClose();
                }}
              >
                保存配置
              </Button>
            </PmNote>
          </div>
        </div>
      }
    >
      <PmNote kind="规则" note="不勾选任何课次时，材料出现在这门课节的所有课次和后续新课次。">
        <p className="muted-copy">不勾选任何课次时，材料出现在这门课节的所有课次（含后续新排的课）。</p>
      </PmNote>
      <div className="assign-session-toolbar">
        <Button size="sm" variant="ghost" onClick={() => setSelected(sessions.map((item) => item.id))}>全选本课节课次</Button>
        <Button size="sm" variant="ghost" onClick={() => setSelected([])}>清空（全部课次）</Button>
      </div>
      <div className="assign-session-list">
        {sessions.map((item) => {
          const checked = selected.includes(item.id);
          return (
            <label key={item.id} className={`assign-session-row ${checked ? "selected" : ""}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => setSelected((value) => (checked ? value.filter((id) => id !== item.id) : [...value, item.id]))}
              />
              <span className="assign-session-copy">
                <strong>{item.title}</strong>
                <small><CalendarClock size={13} /> {formatDateTime(item.startAt, state.ui.timeZone, state.ui.language)} · {item.roomLabel}</small>
              </span>
              {item.id === session.id && <Badge tone="purple">本节课</Badge>}
            </label>
          );
        })}
      </div>
    </Modal>
  );
}

export function TeacherSessionDesign() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const store = usePlatformStore();
  const { state, run } = store;
  const user = currentUser(state);
  const session = getSession(state, sessionId);
  const lesson = session ? getLesson(state, session.lessonId) : undefined;

  const [activePhase, setActivePhase] = useState<Phase>("preview");
  const [editorSeed, setEditorSeed] = useState<{ phase: Phase; set: InteractionSet | null } | null>(null);
  const [previewItems, setPreviewItems] = useState<InteractionItem[] | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [materialPhase, setMaterialPhase] = useState<Phase | null>(null);
  const [materialSelection, setMaterialSelection] = useState<string[]>([]);
  const [materialScope, setMaterialScope] = useState<"session" | "lesson">("session");
  const [materialQuery, setMaterialQuery] = useState("");
  const [materialView, setMaterialView] = useState<"phase" | "all">("phase");
  const [importPhase, setImportPhase] = useState<Phase | null>(null);
  const [importSelection, setImportSelection] = useState<string[]>([]);
  const [templateQuery, setTemplateQuery] = useState("");
  const [templateType, setTemplateType] = useState<InteractionType | "all">("all");
  const [templateVisible, setTemplateVisible] = useState(12);
  const [assignTarget, setAssignTarget] = useState<InteractionSet | null>(null);
  const [scopeMaterial, setScopeMaterial] = useState<Material | null>(null);
  const [removeTarget, setRemoveTarget] = useState<
    | { kind: "material"; ref: LessonMaterialRef; material: Material }
    | { kind: "interaction"; set: InteractionSet }
    | null
  >(null);
  const [removeScope, setRemoveScope] = useState<"session" | "lesson">("session");
  const [rosterOpen, setRosterOpen] = useState(false);

  const lessonSessions = useMemo(
    () => (session ? getLessonSessions(state, session.lessonId) : []),
    [state, session]
  );
  const sessionSets = useMemo(
    () =>
      session
        ? state.interactionSets
            .filter((set) => set.lessonId === session.lessonId && set.status === "published" && setAppliesToSession(set, session.id))
            .sort((a, b) => a.order - b.order)
        : [],
    [state.interactionSets, session]
  );
  const setsByPhase = (phase: Phase) => sessionSets.filter((set) => set.phase === phase);
  const materialsByPhase = (phase: Phase) => (session ? sessionMaterials(state, session, phase) : []);
  /** 预制互动模板库：题型 × 主题 × 难度，选中后复制成本节课的互动设计。 */
  const libraryTemplates = useMemo(() => {
    const keyword = templateQuery.trim().toLowerCase();
    const matched = state.interactionTemplates.filter((template) => {
      const typeMatch = templateType === "all" || template.type === templateType;
      const queryMatch =
        !keyword ||
        template.title.toLowerCase().includes(keyword) ||
        template.topic.toLowerCase().includes(keyword) ||
        template.summary.toLowerCase().includes(keyword) ||
        template.tags.join(" ").toLowerCase().includes(keyword);
      return typeMatch && queryMatch;
    });
    return orderTemplatesForBrowse(matched, templateType);
  }, [state.interactionTemplates, templateQuery, templateType]);

  if (!session || !lesson) {
    return <EmptyState title="课程不存在" description="请返回课表重新选择。" action={<Button onClick={() => navigate("/teacher/schedule")}>返回课表</Button>} />;
  }

  const booked = getBookedCount(state, session.id);
  const phaseStat = (phase: Phase) => ({ sets: setsByPhase(phase).length, materials: materialsByPhase(phase).length });
  const currentPhase = PHASES.find((item) => item.phase === activePhase)!;
  const currentSets = setsByPhase(activePhase);
  const currentMaterials = materialsByPhase(activePhase);

  function openEditor(phase: Phase, set: InteractionSet | null) {
    setEditorSeed({ phase, set });
  }

  function confirmRemove() {
    if (!removeTarget) return;
    if (removeScope === "lesson") {
      if (removeTarget.kind === "interaction") {
        run(
          () => platform.unassignInteractionSet({ setId: removeTarget.set.id, actorId: user.id }),
          "已从该课节全部课次移出，设计仍保留在互动设计库"
        );
      } else {
        const { ref, material } = removeTarget;
        run(
          () => platform.detachMaterial({ materialId: material.id, lessonId: session!.lessonId, phase: ref.phase, actorId: user.id }),
          "已从该课节全部课次移出该材料"
        );
      }
    } else if (removeTarget.kind === "interaction") {
      run(
        () => platform.excludeInteractionSession({ setId: removeTarget.set.id, sessionId: session!.id, excluded: true, actorId: user.id }),
        "已从本次课移出，设计仍保留在互动设计库"
      );
    } else {
      const { ref, material } = removeTarget;
      // 只属于本节课的材料直接解除关联；课节共用的材料只从本节课移出。
      if (ref.sessionIds && ref.sessionIds.length === 1 && ref.sessionIds[0] === session!.id) {
        run(
          () => platform.detachMaterial({ materialId: material.id, lessonId: session!.lessonId, phase: ref.phase, actorId: user.id }),
          "已移除该材料"
        );
      } else {
        run(
          () => platform.excludeMaterialSession({ materialId: material.id, lessonId: session!.lessonId, phase: ref.phase, sessionId: session!.id, excluded: true, actorId: user.id }),
          "已从本次课移出该材料"
        );
      }
    }
    setRemoveTarget(null);
  }

  function openTemplateLibrary(phase: Phase) {
    setImportPhase(phase);
    setImportSelection([]);
    setTemplateQuery("");
    setTemplateType("all");
    setTemplateVisible(12);
  }

  function openMaterialLibrary(phase: Phase) {
    setMaterialPhase(phase);
    setMaterialSelection([]);
    setMaterialScope("session");
    setMaterialQuery("");
    setMaterialView("phase");
  }

  function confirmMaterials() {
    if (!materialPhase || materialSelection.length === 0) return;
    const existing = materialsByPhase(materialPhase).length;
    materialSelection.forEach((materialId, index) => {
      run(
        () =>
          platform.attachMaterial({
            materialId,
            lessonId: session!.lessonId,
            phase: materialPhase,
            order: existing + index + 1,
            sessionIds: materialScope === "session" ? [session!.id] : undefined,
            actorId: user.id
          }),
        "材料已引入本节课"
      );
    });
    setMaterialPhase(null);
    setMaterialSelection([]);
  }

  /** 把选中的预制模板复制成本节课的互动设计，并只配置到本节课。 */
  function confirmImport() {
    if (!importPhase || importSelection.length === 0) return;
    const createdIds: string[] = [];
    importSelection.forEach((templateId) => {
      const template = state.interactionTemplates.find((item) => item.id === templateId);
      if (!template) return;
      const saved = platform.saveInteractionSet({
        lessonId: session!.lessonId,
        title: template.title,
        phase: importPhase,
        items: [templateToItem(template)],
        actorId: user.id,
        publishNote: `从互动模板库引入（${template.topic}）`
      });
      if (saved.ok && saved.data) createdIds.push(saved.data.set.id);
    });
    createdIds.forEach((setId) => {
      platform.assignInteractionSessions({ setId, sessionIds: [session!.id], actorId: user.id });
    });
    store.refresh();
    store.showToast(
      createdIds.length ? `已从互动模板库引入 ${createdIds.length} 个互动到本节课` : "引入未完成，请稍后重试",
      createdIds.length ? "success" : "error"
    );
    setImportPhase(null);
    setImportSelection([]);
  }

  const activeMaterialVersion = previewMaterial ? materialVersion(previewMaterial) : undefined;
  const materialPreviewUrl = activeMaterialVersion?.url ?? previewMaterial?.externalUrl ?? "";
  const materialPreviewKind = previewMaterial
    ? previewMaterial.fileType === "png" || previewMaterial.fileType === "image"
      ? "image"
      : previewMaterial.fileType === "wav" || previewMaterial.fileType === "mp3"
        ? "audio"
        : materialPreviewUrl.endsWith(".html") || materialPreviewUrl.endsWith(".pdf")
          ? "frame"
          : "external"
    : "external";

  const libraryMaterials = state.materials
    .filter((material) => material.status === "published")
    .filter((material) => {
      if (materialView === "all" || !materialPhase) return true;
      return state.materialRefs.some((ref) => ref.materialId === material.id && ref.phase === materialPhase);
    })
    .filter((material) => !materialQuery || material.title.toLowerCase().includes(materialQuery.toLowerCase()) || material.description.toLowerCase().includes(materialQuery.toLowerCase()));
  const attachedIds = materialPhase ? materialsByPhase(materialPhase).map((item) => item.material.id) : [];

  return (
    <>
      <PageHeader
        eyebrow="Class design"
        title={`${session.title} · 课堂设计`}
        description="按课前 / 课中 / 课后三个阶段，分别配置课程材料与互动设计。"
        actions={
          <Button variant="secondary" onClick={() => navigate("/teacher/schedule")}><ArrowLeft size={17} /> 返回课表</Button>
        }
      />

      <Card className="design-hero">
        <span className="session-hero-cover design-hero-cover" style={{ background: `linear-gradient(135deg, ${lesson.color}, #f6f2ff)` }}>
          {lesson.coverEmoji}
        </span>
        <div className="design-hero-copy">
          <div className="design-hero-title">
            <h2>{lesson.title}</h2>
            <Badge tone="purple">{lesson.durationMinutes} 分钟</Badge>
            {session.source === "series" && <Badge tone="blue">系列班</Badge>}
          </div>
          <p>{lesson.description}</p>
          <div className="lesson-overview-meta">
            <span><GraduationCap size={16} /> {session.className}</span>
            <span><CalendarClock size={16} /> {formatDate(session.startAt, state.ui.timeZone, state.ui.language)} {formatRange(session.startAt, session.endAt, state.ui.timeZone, state.ui.language)}</span>
            <span><MapPin size={16} /> {session.roomLabel}</span>
            <span><UsersRound size={16} /> {booked}/{session.capacity} 人预约</span>
            <span><Layers3 size={16} /> 同一课节共 {lessonSessions.length} 节课次</span>
          </div>
          <div className="design-hero-actions">
            <Button variant="secondary" size="sm" onClick={() => setRosterOpen(true)}>
              <UsersRound size={16} /> 学生名单
            </Button>
          </div>
        </div>
      </Card>

      <Card className="content-filter-bar design-tab-bar">
        <Tabs
          value={activePhase}
          onChange={setActivePhase}
          items={PHASES.map((item) => ({
            value: item.phase,
            label: item.label,
            count: phaseStat(item.phase).sets + phaseStat(item.phase).materials
          }))}
        />
        <span className="design-tab-hint">{currentPhase.hint}（{currentPhase.open}）</span>
      </Card>

      <div className="design-panels">
        <Card className="design-panel">
          <div className="design-panel-head">
            <div>
              <span className="eyebrow">Materials</span>
              <h2>课程材料</h2>
              <p>课件、图片、音频与外部视频，来自材料库。</p>
            </div>
            <PmNote kind="流程" note="点击后从材料库选择文件；引入时决定它只服务本节课，还是覆盖整个课节。">
              <Button variant="soft" onClick={() => openMaterialLibrary(activePhase)}>
                <LibraryBig size={16} /> 从材料库引入
              </Button>
            </PmNote>
          </div>

          <PmNote block kind="规则" note="未选择课次时覆盖全部课次和后续新课次；指定课次后只作用于勾选项。">
            <div className="design-item-list">
            {currentMaterials.map(({ ref, material }) => {
              const Icon = materialIcon(material);
              return (
                <article className="design-item" key={ref.id}>
                  <span className={`material-icon material-${material.fileType}`}><Icon size={18} /></span>
                  <div className="design-item-copy">
                    <strong>{material.title}</strong>
                    <div className="design-item-meta">
                      <span>{(material.fileType || "file").toUpperCase()} · {materialVersion(material)?.sizeLabel ?? "外链"}</span>
                      <span className="design-scope-chip">{scopeLabel(ref, session.id)}</span>
                    </div>
                  </div>
                  <div className="design-item-actions">
                    <Button size="sm" variant="ghost" onClick={() => setPreviewMaterial(material)}><Eye size={15} /> 查看</Button>
                    <Button size="sm" variant="ghost" onClick={() => setScopeMaterial(material)}><SlidersHorizontal size={15} /> 配置</Button>
                    <Button size="sm" variant="ghost" className="danger-ghost" onClick={() => { setRemoveScope("session"); setRemoveTarget({ kind: "material", ref, material }); }}>
                      移出
                    </Button>
                  </div>
                </article>
              );
            })}
            {currentMaterials.length === 0 && (
              <p className="design-empty">
                这个阶段还没有材料，点右上角「从材料库引入」；需要新文件时先去材料库上传。
              </p>
            )}
            {currentMaterials.length > 0 && (
              <p className="design-panel-foot">已配置 {currentMaterials.length} 个材料 · 标记「全课次共用」的会出现在同一课节的每一节课次</p>
            )}
            </div>
          </PmNote>
        </Card>

        <Card className="design-panel">
          <div className="design-panel-head">
            <div>
              <span className="eyebrow">Interactions</span>
              <h2>互动设计</h2>
              <p>{currentPhase.label}的题目与练习，可以新建，也可以从预制模板库挑一套直接引入。</p>
            </div>
            <div className="design-panel-actions">
              <PmNote kind="流程" note="点击后复制模板为新的互动设计，并只配置到本节课。">
                <Button variant="ghost" onClick={() => openTemplateLibrary(activePhase)}>
                  <LibraryBig size={16} /> 从互动模板库引入（{state.interactionTemplates.length}）
                </Button>
              </PmNote>
              <PmNote kind="流程" note="点击后创建新的互动；保存发布后学生才能看到。">
                <Button variant="secondary" onClick={() => openEditor(activePhase, null)}><Layers3 size={16} /> 新建互动</Button>
              </PmNote>
            </div>
          </div>

          <PmNote block kind="规则" note="配置决定互动出现在哪些课次；点击「移出」可选择只移出本次课，或移出该课节全部课次。设计仍保留在互动设计库。">
            <div className="design-item-list">
            {currentSets.map((set) => {
              const version = getCurrentInteractionVersion(state, set);
              const types = [...new Set((version?.items ?? []).map((entry) => entry.type))];
              return (
                <article className="design-item" key={set.id}>
                  <div className="design-item-copy">
                    <strong>{set.title}</strong>
                    <div className="design-item-meta">
                      <div className="interaction-type-chips session-interaction-types">
                        {types.slice(0, 4).map((type) => <span key={type}>{interactionTypeShortLabel(type)}</span>)}
                      </div>
                      <span className="design-scope-chip">{scopeLabel(set, session.id)} · {(version?.items ?? []).length} 题</span>
                    </div>
                  </div>
                  <div className="design-item-actions">
                    <Button size="sm" variant="ghost" onClick={() => { setPreviewItems(version?.items ?? []); setPreviewTitle(set.title); }}>
                      <Eye size={15} /> 预览
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEditor(set.phase, set)}>编辑</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAssignTarget(set)}><SlidersHorizontal size={15} /> 配置</Button>
                    <Button size="sm" variant="ghost" className="danger-ghost" onClick={() => { setRemoveScope("session"); setRemoveTarget({ kind: "interaction", set }); }}>移出</Button>
                  </div>
                </article>
              );
            })}
            {currentSets.length === 0 && <p className="design-empty">这个阶段还没有互动设计，可以新建一个，或从互动模板库挑一套预制模板引入。</p>}
            {currentSets.length > 0 && (
              <p className="design-panel-foot">已配置 {currentSets.length} 个互动 · 点「配置」可以调整作用到哪些课次</p>
            )}
            </div>
          </PmNote>
        </Card>
      </div>

      <SessionRosterModal sessionId={rosterOpen ? session.id : null} onClose={() => setRosterOpen(false)} />

      <InteractionSetEditorModal
        open={Boolean(editorSeed)}
        set={editorSeed?.set ?? null}
        defaultLessonId={lesson.id}
        defaultPhase={editorSeed?.phase ?? activePhase}
        lockLesson
        teacherId={user.id}
        pendingSessionIds={editorSeed?.set ? [] : [session.id]}
        onClose={() => setEditorSeed(null)}
      />

      <AssignSessionsModal
        open={Boolean(assignTarget)}
        onClose={() => setAssignTarget(null)}
        state={state}
        set={assignTarget}
        sessions={assignTarget ? getLessonSessions(state, assignTarget.lessonId) : []}
        onSave={(sessionIds) => {
          if (!assignTarget) return;
          const result = run(
            () => platform.assignInteractionSessions({ setId: assignTarget.id, sessionIds, actorId: user.id }),
            sessionIds.length ? `已配置到 ${sessionIds.length} 节课次` : "已改为作用于全部课次"
          );
          if (result.ok) setAssignTarget(null);
        }}
      />

      <Modal
        open={Boolean(removeTarget)}
        title={removeTarget?.kind === "interaction" ? `移出互动 · ${removeTarget.set.title}` : removeTarget ? `移出材料 · ${removeTarget.material.title}` : "移出内容"}
        onClose={() => setRemoveTarget(null)}
        width="560px"
        footer={
          <div className="modal-footer-split">
            <small>只影响课堂配置，不会删除材料或互动本身</small>
            <div>
              <Button variant="ghost" onClick={() => setRemoveTarget(null)}>取消</Button>
              <Button variant="danger" onClick={confirmRemove}>确认移出</Button>
            </div>
          </div>
        }
      >
        <p className="muted-copy">请选择移出范围，移出后内容仍会保留在材料与互动库中。</p>
        <div className="remove-scope-grid" role="radiogroup" aria-label="移出范围">
          <button
            type="button"
            className={removeScope === "session" ? "active" : ""}
            onClick={() => setRemoveScope("session")}
            role="radio"
            aria-checked={removeScope === "session"}
          >
            <span className="remove-scope-radio" />
            <span className="remove-scope-copy">
              <strong>从本次课移出</strong>
              <small>只影响当前课次，其它课次保持原样。</small>
            </span>
          </button>
          <button
            type="button"
            className={removeScope === "lesson" ? "active" : ""}
            onClick={() => setRemoveScope("lesson")}
            role="radio"
            aria-checked={removeScope === "lesson"}
          >
            <span className="remove-scope-radio" />
            <span className="remove-scope-copy">
              <strong>从该课节全部课次移出</strong>
              <small>当前课节的所有课次都不再显示。</small>
            </span>
          </button>
        </div>
      </Modal>

      <MaterialScopeModal
        open={Boolean(scopeMaterial)}
        state={state}
        session={session}
        phase={activePhase}
        material={scopeMaterial}
        teacherId={user.id}
        onClose={() => setScopeMaterial(null)}
      />

      <Modal open={Boolean(previewItems)} title={`学生端预览 · ${previewTitle}`} onClose={() => setPreviewItems(null)} width="520px">
        {previewItems && <StudentPhonePreview items={previewItems} onClose={() => setPreviewItems(null)} />}
      </Modal>

      <Modal
        open={Boolean(previewMaterial)}
        title={previewMaterial?.title ?? "材料预览"}
        onClose={() => setPreviewMaterial(null)}
        width="980px"
        footer={
          <div className="modal-footer-split">
            <span>{activeMaterialVersion?.sizeLabel ?? "外链"} · {previewMaterial?.downloadCount ?? 0} 次下载</span>
            <div>
              <Button variant="ghost" onClick={() => setPreviewMaterial(null)}>关闭</Button>
              {materialPreviewUrl && <Button onClick={() => window.open(materialPreviewUrl, "_blank", "noopener,noreferrer")}>在新窗口打开</Button>}
            </div>
          </div>
        }
      >
        <p className="muted-copy">{previewMaterial?.description}</p>
        {materialPreviewUrl && materialPreviewKind === "frame" && <iframe className="material-preview-frame" src={materialPreviewUrl} title={previewMaterial?.title} />}
        {materialPreviewUrl && materialPreviewKind === "image" && <img className="material-preview-image" src={materialPreviewUrl} alt={previewMaterial?.title} />}
        {materialPreviewUrl && materialPreviewKind === "audio" && <audio className="material-preview-audio" src={materialPreviewUrl} controls />}
        {materialPreviewKind === "external" && (
          <div className="material-preview-placeholder">
            <FileText size={26} />
            <strong>{(previewMaterial?.fileType ?? "file").toUpperCase()} 材料</strong>
            <small>该类型无法内嵌预览，可在新窗口打开查看。</small>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(materialPhase)}
        title={`从材料库引入 · ${PHASES.find((item) => item.phase === materialPhase)?.label ?? ""}`}
        onClose={() => setMaterialPhase(null)}
        width="860px"
        footer={
          <div className="modal-footer-split">
            <span>已选 {materialSelection.length} 个材料</span>
            <div className="material-import-footer-actions">
              <div className="scope-choice">
                <button className={materialScope === "session" ? "active" : ""} onClick={() => setMaterialScope("session")}>仅本节课</button>
                <button className={materialScope === "lesson" ? "active" : ""} onClick={() => setMaterialScope("lesson")}>该课节全部课次</button>
              </div>
              <Button variant="ghost" onClick={() => setMaterialPhase(null)}>取消</Button>
              <PmNote kind="流程" note="点击后把所选材料关联到当前课节阶段，并按作用范围立即发布。">
                <Button disabled={materialSelection.length === 0} onClick={confirmMaterials}>
                  {materialScope === "session" ? "引入到本节课" : "引入到该课节全部课次"}
                </Button>
              </PmNote>
            </div>
          </div>
        }
      >
        <div className="material-library-toolbar">
          <div className="search-box">
            <Search size={17} />
            <TextInput value={materialQuery} onChange={(event) => setMaterialQuery(event.target.value)} placeholder="搜索材料名称或说明" />
          </div>
          <div className="scope-choice">
            <button className={materialView === "phase" ? "active" : ""} onClick={() => setMaterialView("phase")}>
              仅看{PHASES.find((item) => item.phase === materialPhase)?.label ?? "当前阶段"}材料
            </button>
            <button className={materialView === "all" ? "active" : ""} onClick={() => setMaterialView("all")}>
              查看全部材料
            </button>
          </div>
        </div>
        <div className="assign-session-list">
          {libraryMaterials.map((material) => {
            const attached = attachedIds.includes(material.id);
            const checked = materialSelection.includes(material.id);
            const Icon = materialIcon(material);
            return (
              <div
                key={material.id}
                className={`assign-session-row assign-session-row-material ${checked ? "selected" : ""} ${attached ? "is-disabled" : ""}`}
              >
                <input
                  id={`material-choice-${material.id}`}
                  type="checkbox"
                  disabled={attached}
                  checked={checked}
                  onChange={() =>
                    setMaterialSelection((value) => (checked ? value.filter((id) => id !== material.id) : [...value, material.id]))
                  }
                />
                <label className="assign-session-row-material-choice" htmlFor={`material-choice-${material.id}`}>
                  <span className={`material-icon material-${material.fileType}`}><Icon size={18} /></span>
                  <span className="assign-session-copy">
                    <strong>{material.title}</strong>
                    <small>{material.description}</small>
                  </span>
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  className="material-preview-button"
                  onClick={() => setPreviewMaterial(material)}
                >
                  <Eye size={15} /> 预览
                </Button>
                {attached ? <Badge tone="mint">本阶段已引入</Badge> : <Badge tone="neutral">{(material.fileType || "file").toUpperCase()}</Badge>}
              </div>
            );
          })}
          {libraryMaterials.length === 0 && <p className="muted-copy">材料库里没有匹配的材料，可以先去材料库上传。</p>}
        </div>
      </Modal>

      <Modal
        open={Boolean(importPhase)}
        title={`从互动模板库引入 · ${PHASES.find((item) => item.phase === importPhase)?.label ?? ""}`}
        onClose={() => setImportPhase(null)}
        width="900px"
        footer={
          <div className="modal-footer-split">
            <span>已选 {importSelection.length} 套模板</span>
            <div>
              <Button variant="ghost" onClick={() => setImportPhase(null)}>取消</Button>
              <PmNote kind="流程" note="点击后复制成新互动，只配置到本节课，原模板和其他课次不变。">
                <Button disabled={importSelection.length === 0} onClick={confirmImport}>
                  引入到本节课（{importSelection.length}）
                </Button>
              </PmNote>
            </div>
          </div>
        }
      >
        <p className="muted-copy">
          预制模板共 {state.interactionTemplates.length} 套，按题型 / 主题 / 难度挑选。选中的模板会复制成
          {PHASES.find((item) => item.phase === importPhase)?.label ?? "该阶段"}的互动设计，只配置到本节课，模板库本身不受影响。
        </p>

        <div className="material-library-toolbar">
          <div className="search-box">
            <Search size={17} />
            <TextInput
              value={templateQuery}
              onChange={(event) => { setTemplateQuery(event.target.value); setTemplateVisible(12); }}
              placeholder="搜索模板主题，例如「餐厅」「天气」"
            />
          </div>
          <span className="design-template-count">匹配 {libraryTemplates.length} 套</span>
        </div>

        <TemplateTypeChips
          templates={state.interactionTemplates}
          value={templateType}
          onChange={(next) => { setTemplateType(next); setTemplateVisible(12); }}
        />

        <div className="assign-session-list design-template-list">
          {libraryTemplates.slice(0, templateVisible).map((template) => {
            const checked = importSelection.includes(template.id);
            return (
              <label key={template.id} className={`assign-session-row ${checked ? "selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => setImportSelection((value) => (checked ? value.filter((id) => id !== template.id) : [...value, template.id]))}
                />
                <span className="assign-session-copy">
                  <strong>{template.title}</strong>
                  <small>{template.summary}</small>
                </span>
                <span className="design-template-tags">
                  <Badge tone="purple">{INTERACTION_TYPE_SHORT_LABELS[template.type]}</Badge>
                  <Badge tone="neutral">{templateLevelLabel(template.level)}</Badge>
                  <Badge tone="blue">{template.topic}</Badge>
                </span>
              </label>
            );
          })}
          {libraryTemplates.length === 0 && <p className="muted-copy">没有匹配的模板，换个关键词或题型再试。</p>}
        </div>

        {libraryTemplates.length > templateVisible && (
          <div className="template-more">
            <Button variant="ghost" size="sm" onClick={() => setTemplateVisible((value) => value + 12)}>
              显示更多（还有 {libraryTemplates.length - templateVisible} 套）
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
