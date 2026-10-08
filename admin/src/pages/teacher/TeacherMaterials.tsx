import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarPlus, FileText, Search, Sparkles, UploadCloud } from "lucide-react";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, getTeacherSessions, scopeLabel } from "../../lib/domain";
import type { InteractionType, Material, Phase } from "../../domain/types";
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Select, Tabs, TextInput } from "../../components/ui";
import { MaterialCard } from "../../components/MaterialCard";
import { MaterialLessonConfigModal } from "../../components/MaterialLessonConfigModal";
import { PmNote } from "../../components/PmNote";
import { INTERACTION_TYPE_SHORT_LABELS } from "../../lib/interactionTypes";
import { orderTemplatesForBrowse, templateLevelLabel } from "../../lib/templateLibrary";
import { TemplateTypeChips } from "../../components/TemplateTypeChips";
import { TeacherInteractions } from "./TeacherInteractions";

type PhaseTab = "all" | Phase;
type LibraryTab = "materials" | "interactions" | "templates";

const templateTypeLabels: Record<InteractionType, string> = INTERACTION_TYPE_SHORT_LABELS;
const phaseLabels: Record<Phase, string> = { preview: "课前", live: "课中", review: "复习" };

type MaterialTypeKey = "pdf" | "pptx" | "audio" | "video" | "image" | "courseware" | "other";

/** 材料库的文件类型筛选项按这份顺序展示，只有实际存在的类型才会出现。 */
const materialTypeOrder: Array<{ key: MaterialTypeKey; label: string }> = [
  { key: "pdf", label: "PDF" },
  { key: "pptx", label: "PPT" },
  { key: "audio", label: "音频" },
  { key: "video", label: "视频外链" },
  { key: "image", label: "图片" },
  { key: "courseware", label: "互动课件" },
  { key: "other", label: "其他" }
];

function materialTypeKey(material: Material): MaterialTypeKey {
  const fileType = material.fileType.toLowerCase();
  if (fileType === "pdf") return "pdf";
  if (fileType === "ppt" || fileType === "pptx") return "pptx";
  if (["wav", "mp3", "m4a", "audio"].includes(fileType)) return "audio";
  if (["mp4", "mov", "video"].includes(fileType)) return "video";
  if (["png", "jpg", "jpeg", "gif", "image"].includes(fileType)) return "image";
  if (material.kind === "courseware" || fileType === "html") return "courseware";
  return "other";
}

export function TeacherMaterials() {
  const { t } = useTranslation();
  const { state, run } = usePlatformStore();
  const navigate = useNavigate();
  const user = currentUser(state);
  const teacherSessions = getTeacherSessions(state, user.id);
  const lessonIds = [...new Set(teacherSessions.map((session) => session.lessonId))];
  const teacherSets = state.interactionSets.filter((set) => lessonIds.includes(set.lessonId));
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<PhaseTab>("all");
  const [typeFilter, setTypeFilter] = useState<MaterialTypeKey[]>([]);
  const [query, setQuery] = useState("");
  const [libraryTab, setLibraryTab] = useState<LibraryTab>(() => searchParams.get("library") === "interactions" ? "interactions" : "materials");
  const [templateQuery, setTemplateQuery] = useState("");
  const [templateType, setTemplateType] = useState<InteractionType | "all">("all");
  const [templateVisible, setTemplateVisible] = useState(12);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [configMaterialId, setConfigMaterialId] = useState<string | null>(null);
  const [previewMaterialId, setPreviewMaterialId] = useState<string | null>(null);
  const configMaterial = state.materials.find((material) => material.id === configMaterialId) ?? null;
  const teacherLessons = lessonIds
    .map((lessonId) => state.lessons.find((lesson) => lesson.id === lessonId))
    .filter((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson));
  const previewMaterial = state.materials.find((material) => material.id === previewMaterialId);
  const previewVersion = previewMaterial
    ? previewMaterial.versions.find((version) => version.version === previewMaterial.currentVersion) ?? previewMaterial.versions.at(-1)
    : undefined;
  const previewUrl = previewVersion?.url ?? previewMaterial?.externalUrl ?? "";
  const previewRefs = previewMaterial
    ? state.materialRefs.filter((ref) => ref.materialId === previewMaterial.id && lessonIds.includes(ref.lessonId))
    : [];
  const previewKind = previewMaterial
    ? previewMaterial.fileType === "png" || previewMaterial.fileType === "image"
      ? "image"
      : previewMaterial.fileType === "wav" || previewMaterial.fileType === "mp3"
        ? "audio"
        : previewUrl.endsWith(".html") || previewUrl.endsWith(".pdf")
          ? "frame"
          : "external"
    : "external";

  // 互动设计库深链会直接打开“我的互动设计”页签。
  useEffect(() => {
    if (searchParams.get("library") === "interactions") setLibraryTab("interactions");
  }, [searchParams]);

  function changeLibraryTab(value: LibraryTab) {
    setLibraryTab(value);
    const next = new URLSearchParams(searchParams);
    if (value === "interactions") next.set("library", "interactions");
    else next.delete("library");
    setSearchParams(next, { replace: true });
  }

  // 从首页“最近添加”跳进来时，直接打开这条材料的预览。
  useEffect(() => {
    const materialId = searchParams.get("materialId");
    if (!materialId) return;
    if (state.materials.some((material) => material.id === materialId)) setPreviewMaterialId(materialId);
    const next = new URLSearchParams(searchParams);
    next.delete("materialId");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    fileType: "pdf",
    language: "zh-id",
    lessonId: lessonIds[0] ?? state.lessons[0]?.id ?? "",
    phase: "preview" as Phase,
    fileName: ""
  });

  // 先取“我能看到的材料”，再做阶段 / 类型 / 关键词筛选，类型下拉的计数才稳定。
  const scopedMaterials = state.materials.filter((material) => {
    const refs = state.materialRefs.filter((ref) => ref.materialId === material.id && lessonIds.includes(ref.lessonId));
    return material.ownerId === user.id || refs.length > 0;
  });
  const typeCounts = scopedMaterials.reduce<Partial<Record<MaterialTypeKey, number>>>((counts, material) => {
    const key = materialTypeKey(material);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const materialTypeOptions = materialTypeOrder.filter((item) => (typeCounts[item.key] ?? 0) > 0);
  const phaseCount = (phase: Phase) =>
    scopedMaterials.filter((material) =>
      state.materialRefs.some((ref) => ref.materialId === material.id && lessonIds.includes(ref.lessonId) && ref.phase === phase)
    ).length;
  const filteredByType = typeFilter.length
    ? scopedMaterials.filter((material) => typeFilter.includes(materialTypeKey(material)))
    : scopedMaterials;
  const materials = filteredByType.filter((material) => {
    const refs = state.materialRefs.filter((ref) => ref.materialId === material.id && lessonIds.includes(ref.lessonId));
    const phaseMatch = tab === "all" || refs.some((ref) => ref.phase === tab);
    const queryMatch = !query || material.title.toLowerCase().includes(query.toLowerCase()) || material.description.toLowerCase().includes(query.toLowerCase());
    return phaseMatch && queryMatch;
  });

  const templates = useMemo(() => {
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

  function saveUpload() {
    if (!form.title.trim()) return;
    const result = run(
      () =>
        platform.addMockMaterial({
          title: form.title,
          description: form.description,
          fileType: form.fileType,
          language: form.language,
          ownerId: user.id,
          lessonId: form.lessonId,
          phase: form.phase,
          fileName: form.fileName || `${form.title}.${form.fileType}`,
          sizeLabel: "36 KB"
        }),
      "上传完成，材料已关联课节"
    );
    if (result.ok) {
      setUploadOpen(false);
      setForm((value) => ({ ...value, title: "", description: "", fileName: "" }));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Material library"
        title={t("teacher.materialLibrary")}
        actions={
          libraryTab === "materials" ? (
            <PmNote kind="注意" note="上传材料暂不开放，现阶段先使用已有材料配置课堂。">
              <Button disabled><UploadCloud size={17} /> 上传材料</Button>
            </PmNote>
          ) : undefined
        }
      />

      <Card className="content-filter-bar library-tab-bar">
        <Tabs
          value={libraryTab}
          onChange={(value) => changeLibraryTab(value as LibraryTab)}
          items={[
            { value: "materials", label: "课程材料", count: scopedMaterials.length },
            { value: "templates", label: "预制互动模板库", count: state.interactionTemplates.length },
            { value: "interactions", label: "我的互动设计", count: teacherSets.length }
          ]}
        />
        <span className="library-tab-hint">
          {libraryTab === "materials"
            ? "文件与外链材料，按课前 / 课中 / 复习关联到课节。"
            : libraryTab === "interactions"
              ? "你准备过的全部互动设计，可预览、配置课次或继续编辑。"
              : "题型 × 主题 × 难度生成的预制模板，可直接用于互动设计。"}
        </span>
      </Card>

      {libraryTab === "interactions" && <TeacherInteractions embedded />}

      {libraryTab === "materials" && (
      <>
      <Card className="content-filter-bar library-filter-bar">
        <div className="library-filter-group">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "all", label: "全部", count: scopedMaterials.length },
              { value: "preview", label: "课前", count: phaseCount("preview") },
              { value: "live", label: "课中", count: phaseCount("live") },
              { value: "review", label: "复习", count: phaseCount("review") }
            ]}
          />
          <div className="material-type-chips" role="group" aria-label="按文件类型筛选">
            <button
              type="button"
              className={typeFilter.length === 0 ? "active" : ""}
              aria-pressed={typeFilter.length === 0}
              onClick={() => setTypeFilter([])}
            >
              全部类型<span className="material-type-count">{scopedMaterials.length}</span>
            </button>
            {materialTypeOptions.map((item) => {
              const active = typeFilter.includes(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  className={active ? "active" : ""}
                  aria-pressed={active}
                  onClick={() =>
                    setTypeFilter((value) =>
                      value.includes(item.key) ? value.filter((key) => key !== item.key) : [...value, item.key]
                    )
                  }
                >
                  {item.label}<span className="material-type-count">{typeCounts[item.key]}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="search-box">
          <Search size={17} />
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索材料名称或说明" />
        </div>
      </Card>

      <div className="material-grid">
        {materials.map((material) => {
          const configCount = state.materialRefs.filter(
            (ref) => ref.materialId === material.id && lessonIds.includes(ref.lessonId)
          ).length;
          return (
            <div className="material-card-wrap" key={material.id}>
              <MaterialCard
                material={material}
                onView={() => setPreviewMaterialId(material.id)}
                actions={
                  <Button size="sm" variant="secondary" onClick={() => setConfigMaterialId(material.id)}>
                    <CalendarPlus size={15} /> 配置到课节{configCount > 0 ? ` (${configCount})` : ""}
                  </Button>
                }
              />
            </div>
          );
        })}
        {materials.length === 0 && (
          scopedMaterials.length > 0 ? (
            <EmptyState
              title="没有匹配的材料"
              description="换个文件类型、阶段或关键词再试。"
              action={<Button variant="ghost" onClick={() => { setTypeFilter([]); setTab("all"); setQuery(""); }}>清除筛选</Button>}
            />
          ) : (
            <EmptyState title="暂无材料" description="上传第一批课程材料并关联课节。" action={<Button disabled>上传材料</Button>} />
          )
        )}
      </div>
      </>
      )}

      {libraryTab === "templates" && (
      <>
        <Card className="content-filter-bar">
          <TemplateTypeChips
            templates={state.interactionTemplates}
            value={templateType}
            onChange={(next) => { setTemplateType(next); setTemplateVisible(12); }}
          />
          <div className="search-box">
            <Search size={17} />
            <TextInput
              value={templateQuery}
              onChange={(event) => { setTemplateQuery(event.target.value); setTemplateVisible(12); }}
              placeholder="搜索模板主题，例如“餐厅”“天气”"
            />
          </div>
        </Card>

        <p className="muted-copy">匹配 {templates.length} 套模板</p>

        <div className="template-grid">
          {templates.slice(0, templateVisible).map((template, index) => {
            const createButton = (
              <Button size="sm" variant="secondary" onClick={() => navigate(`/teacher/materials?library=interactions&templateId=${template.id}`)}>
                <Sparkles size={14} /> 用这个模板新建
              </Button>
            );
            return (
              <article key={template.id} className="template-card">
                <div className="template-card-head">
                  <span className="phase-badge phase-live">{templateTypeLabels[template.type]}</span>
                  <Badge tone="neutral">{templateLevelLabel(template.level)}</Badge>
                </div>
                <strong>{template.title}</strong>
                <small>{template.summary}</small>
                <div className="template-tags">
                  {template.tags.slice(1, 3).map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                {index === 0 ? (
                  <PmNote kind="流程" note="点击后复制模板并打开互动编辑器；保存前不会影响学生看到的内容。">
                    {createButton}
                  </PmNote>
                ) : createButton}
              </article>
            );
          })}
        </div>

        {templates.length > templateVisible && (
          <div className="template-more">
            <Button variant="ghost" onClick={() => setTemplateVisible((value) => value + 12)}>
              显示更多（还有 {templates.length - templateVisible} 套）
            </Button>
          </div>
        )}
        {templates.length === 0 && <EmptyState title="没有匹配的模板" description="换个关键词或题型再试。" />}
      </>
      )}

      <Modal
        open={Boolean(previewMaterial)}
        title={`材料详情 · ${previewMaterial?.title ?? ""}`}
        onClose={() => setPreviewMaterialId(null)}
        width="980px"
        footer={
          <div className="modal-footer-split modal-footer-end">
            <div>
              {previewUrl && (
                <Button variant="ghost" onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}>在新窗口打开</Button>
              )}
              <Button variant="secondary" onClick={() => { const id = previewMaterial?.id; setPreviewMaterialId(null); if (id) setConfigMaterialId(id); }}>
                <CalendarPlus size={16} /> 配置到课节
              </Button>
              {previewMaterial?.kind === "link" ? (
                <Button onClick={() => previewUrl && window.open(previewUrl, "_blank", "noopener,noreferrer")}>打开链接</Button>
              ) : (
                <Button
                  onClick={() => {
                    if (!previewMaterial) return;
                    run(() => platform.trackDownload(previewMaterial.id), "下载已记录");
                    if (previewUrl) {
                      const anchor = document.createElement("a");
                      anchor.href = previewUrl;
                      anchor.download = previewVersion?.fileName ?? previewMaterial.title;
                      anchor.click();
                    }
                  }}
                >
                  下载
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="material-detail-grid">
          <span><small>文件类型</small><strong>{(previewMaterial?.fileType ?? "file").toUpperCase()}</strong></span>
          <span><small>文件大小</small><strong>{previewVersion?.sizeLabel ?? "外链"}</strong></span>
        </div>

        {previewRefs.length > 0 && (
          <div className="material-detail-refs">
            <small>已配置课节</small>
            <div>
              {previewRefs.map((ref) => (
                <span key={ref.id}>
                  <b>{phaseLabels[ref.phase]}</b>
                  {state.lessons.find((lesson) => lesson.id === ref.lessonId)?.title ?? "课节"} · {scopeLabel(ref)}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="muted-copy material-detail-description">{previewMaterial?.description}</p>
        {previewUrl && previewKind === "frame" && (
          <iframe className="material-preview-frame" src={previewUrl} title={previewMaterial?.title} />
        )}
        {previewUrl && previewKind === "image" && (
          <img className="material-preview-image" src={previewUrl} alt={previewMaterial?.title} />
        )}
        {previewUrl && previewKind === "audio" && (
          <audio className="material-preview-audio" src={previewUrl} controls />
        )}
        {previewKind === "external" && (
          <div className="material-preview-placeholder">
            <FileText size={26} />
            <strong>{(previewMaterial?.fileType ?? "file").toUpperCase()} 材料</strong>
            <small>该类型无法内嵌预览，可在新窗口打开查看。</small>
          </div>
        )}
      </Modal>

      <MaterialLessonConfigModal
        open={Boolean(configMaterial)}
        material={configMaterial}
        state={state}
        lessons={teacherLessons}
        teacherId={user.id}
        onClose={() => setConfigMaterialId(null)}
      />

      <Modal
        open={uploadOpen}
        title="上传课程材料"
        onClose={() => setUploadOpen(false)}
        footer={
          <div className="modal-footer-split">
            <small>刷新后新上传文件只保留元数据</small>
            <div>
              <Button variant="ghost" onClick={() => setUploadOpen(false)}>取消</Button>
              <PmNote kind="流程" note="点击后创建材料当前版本，并立即关联到所选课节阶段。">
                <Button onClick={saveUpload}>上传并关联</Button>
              </PmNote>
            </div>
          </div>
        }
      >
        <div className="editor-grid">
          <Field label="材料标题" className="field-span-2">
            <TextInput value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="例如：问候句型速查卡" />
          </Field>
          <Field label="材料说明" className="field-span-2">
            <textarea className="input textarea" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} />
          </Field>
          <Field label="文件类型">
            <Select value={form.fileType} onChange={(event) => setForm((value) => ({ ...value, fileType: event.target.value }))}>
              <option value="pdf">PDF</option>
              <option value="pptx">PPTX</option>
              <option value="png">图片</option>
              <option value="wav">音频</option>
              <option value="video">视频外链</option>
            </Select>
          </Field>
          <Field label="语言">
            <Select value={form.language} onChange={(event) => setForm((value) => ({ ...value, language: event.target.value }))}>
              <option value="zh-id">中文 + 印尼语</option>
              <option value="zh-CN">中文</option>
              <option value="id-ID">印尼语</option>
            </Select>
          </Field>
          <Field label="关联课节">
            <Select value={form.lessonId} onChange={(event) => setForm((value) => ({ ...value, lessonId: event.target.value }))}>
              {state.lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
            </Select>
          </Field>
          <Field label="学习阶段">
            <Select value={form.phase} onChange={(event) => setForm((value) => ({ ...value, phase: event.target.value as Phase }))}>
              <option value="preview">课前预习</option>
              <option value="live">课中</option>
              <option value="review">课后复习</option>
            </Select>
          </Field>
        </div>
        <PmNote block kind="注意" note="文件保存后形成材料版本；替换文件不会覆盖历史版本和已有引用。">
          <div className="mock-upload-zone" onClick={() => setForm((value) => ({ ...value, fileName: value.fileName || "demo-upload.pdf" }))}>
            <UploadCloud size={30} />
            <strong>{form.fileName || "点击选择演示文件"}</strong>
            <small>原型不会把本地文件写入长期存储</small>
          </div>
        </PmNote>
      </Modal>
    </>
  );
}
