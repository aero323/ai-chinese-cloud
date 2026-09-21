import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FilePlus2, Filter, Layers3, Plus, Search, Sparkles, UploadCloud } from "lucide-react";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, getLesson, getTeacherSessions } from "../../lib/domain";
import type { InteractionType, Phase } from "../../domain/types";
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Select, Tabs, TextInput } from "../../components/ui";
import { MaterialCard } from "../../components/MaterialCard";
import { INTERACTION_TYPE_SHORT_LABELS } from "../../lib/interactionTypes";

type PhaseTab = "all" | Phase;

const templateTypeLabels: Record<InteractionType, string> = INTERACTION_TYPE_SHORT_LABELS;

export function TeacherMaterials() {
  const { t } = useTranslation();
  const { state, run } = usePlatformStore();
  const navigate = useNavigate();
  const user = currentUser(state);
  const teacherSessions = getTeacherSessions(state, user.id);
  const lessonIds = [...new Set(teacherSessions.map((session) => session.lessonId))];
  const [tab, setTab] = useState<PhaseTab>("all");
  const [query, setQuery] = useState("");
  const [libraryTab, setLibraryTab] = useState<"materials" | "templates">("materials");
  const [templateQuery, setTemplateQuery] = useState("");
  const [templateType, setTemplateType] = useState<InteractionType | "all">("all");
  const [templateVisible, setTemplateVisible] = useState(12);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    fileType: "pdf",
    language: "zh-id",
    lessonId: lessonIds[0] ?? state.lessons[0]?.id ?? "",
    phase: "preview" as Phase,
    fileName: ""
  });

  const materials = state.materials.filter((material) => {
    const refs = state.materialRefs.filter((ref) => ref.materialId === material.id && lessonIds.includes(ref.lessonId));
    const phaseMatch = tab === "all" || refs.some((ref) => ref.phase === tab);
    const queryMatch = !query || material.title.toLowerCase().includes(query.toLowerCase()) || material.description.toLowerCase().includes(query.toLowerCase());
    return (material.ownerId === user.id || refs.length > 0) && phaseMatch && queryMatch;
  });

  const templates = useMemo(() => {
    const keyword = templateQuery.trim().toLowerCase();
    return state.interactionTemplates.filter((template) => {
      const typeMatch = templateType === "all" || template.type === templateType;
      const queryMatch =
        !keyword ||
        template.title.toLowerCase().includes(keyword) ||
        template.topic.toLowerCase().includes(keyword) ||
        template.tags.join(" ").toLowerCase().includes(keyword);
      return typeMatch && queryMatch;
    });
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
      "模拟上传完成，材料已关联课节"
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
        description={`${t("teacher.materialHint")}课节与排课由运营创建，你只需为自己课次准备材料；互动题目可以直接引用模板库。`}
        actions={
          libraryTab === "materials" ? (
            <Button onClick={() => setUploadOpen(true)}><UploadCloud size={17} /> 模拟上传材料</Button>
          ) : undefined
        }
      />

      <Card className="content-filter-bar library-tab-bar">
        <Tabs
          value={libraryTab}
          onChange={(value) => setLibraryTab(value)}
          items={[
            { value: "materials", label: "课程材料", count: materials.length },
            { value: "templates", label: "预制互动模板库", count: state.interactionTemplates.length }
          ]}
        />
        <span className="library-tab-hint">
          {libraryTab === "materials"
            ? "文件与外链材料，按预习 / 课中 / 复习关联到课节。"
            : "题型 × 主题 × 难度生成的预制模板，可直接用于互动设计。"}
        </span>
      </Card>

      {libraryTab === "materials" && (
      <>
      <Card className="content-filter-bar">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "全部", count: state.materials.length },
            { value: "preview", label: "预习", count: state.materialRefs.filter((ref) => ref.phase === "preview").length },
            { value: "live", label: "课中", count: state.materialRefs.filter((ref) => ref.phase === "live").length },
            { value: "review", label: "复习", count: state.materialRefs.filter((ref) => ref.phase === "review").length }
          ]}
        />
        <div className="search-box">
          <Search size={17} />
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索材料名称或说明" />
        </div>
      </Card>

      <div className="material-grid">
        {materials.map((material) => {
          const refs = state.materialRefs.filter((ref) => ref.materialId === material.id);
          return (
            <div className="material-card-wrap" key={material.id}>
              <MaterialCard
                material={material}
                actions={
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        run(
                          () => platform.addMaterialVersion({ materialId: material.id, fileName: `${material.title}-v${material.currentVersion + 1}.pdf`, sizeLabel: `${28 + material.currentVersion * 6} KB`, actorId: user.id }),
                          "已模拟上传新版本"
                        )
                      }
                    >
                      <FilePlus2 size={15} /> 新版本
                    </Button>
                  </>
                }
              />
              <div className="material-refs">
                {refs.length === 0 && <Badge tone="neutral">未关联课节</Badge>}
                {refs.map((ref) => (
                  <Badge key={ref.id} tone={ref.phase === "preview" ? "blue" : ref.phase === "live" ? "purple" : "mint"}>
                    {getLesson(state, ref.lessonId)?.title} · {ref.phase === "preview" ? "预习" : ref.phase === "live" ? "课中" : "复习"}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
        {materials.length === 0 && <EmptyState title="暂无材料" description="上传第一批课程材料并关联课节。" action={<Button onClick={() => setUploadOpen(true)}>上传材料</Button>} />}
      </div>
      </>
      )}

      {libraryTab === "templates" && (
      <>
        <Card className="content-filter-bar">
          <div className="template-chip-row">
            <button className={templateType === "all" ? "active" : ""} onClick={() => { setTemplateType("all"); setTemplateVisible(12); }}>全部题型</button>
            {(Object.keys(templateTypeLabels) as InteractionType[]).map((key) => (
              <button key={key} className={templateType === key ? "active" : ""} onClick={() => { setTemplateType(key); setTemplateVisible(12); }}>
                {templateTypeLabels[key]}
              </button>
            ))}
          </div>
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
          {templates.slice(0, templateVisible).map((template) => (
            <article key={template.id} className="template-card">
              <div className="template-card-head">
                <span className="phase-badge phase-live">{templateTypeLabels[template.type]}</span>
                <Badge tone="neutral">{template.level === "beginner" ? "初级" : template.level === "intermediate" ? "中级" : "高级"}</Badge>
              </div>
              <strong>{template.title}</strong>
              <small>{template.summary}</small>
              <div className="template-tags">
                {template.tags.slice(1, 3).map((tag) => <span key={tag}>{tag}</span>)}
              </div>
              <Button size="sm" variant="secondary" onClick={() => navigate(`/teacher/interactions?templateId=${template.id}`)}>
                <Sparkles size={14} /> 用这个模板新建
              </Button>
            </article>
          ))}
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
        open={uploadOpen}
        title="模拟上传课程材料"
        onClose={() => setUploadOpen(false)}
        footer={
          <div className="modal-footer-split">
            <small>刷新后新上传文件只保留元数据</small>
            <div><Button variant="ghost" onClick={() => setUploadOpen(false)}>取消</Button><Button onClick={saveUpload}>上传并关联</Button></div>
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
        <div className="mock-upload-zone" onClick={() => setForm((value) => ({ ...value, fileName: value.fileName || "demo-upload.pdf" }))}>
          <UploadCloud size={30} />
          <strong>{form.fileName || "点击选择演示文件"}</strong>
          <small>原型不会把本地文件写入长期存储</small>
        </div>
      </Modal>
    </>
  );
}
