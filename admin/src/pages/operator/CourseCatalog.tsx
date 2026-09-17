import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, ChevronRight, Folder, FolderOpen, Plus, Search, Tag } from "lucide-react";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser } from "../../lib/domain";
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Select, TextInput } from "../../components/ui";

export function CourseCatalog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, run } = usePlatformStore();
  const user = currentUser(state);
  const [activeFolderId, setActiveFolderId] = useState("folder-root");
  const [query, setQuery] = useState("");
  const [lessonOpen, setLessonOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    subtitle: "",
    description: "",
    durationMinutes: 40,
    tags: "中文, 大班课",
    color: "#6552ff",
    coverEmoji: "📘"
  });
  const [folderForm, setFolderForm] = useState({ name: "", description: "", color: "#69d5c5" });
  const activeFolder = state.folders.find((folder) => folder.id === activeFolderId);
  const children = state.folders.filter((folder) => folder.parentId === activeFolderId);
  const lessons = state.lessons.filter((lesson) => lesson.folderId === activeFolderId && (!query || lesson.title.toLowerCase().includes(query.toLowerCase()) || lesson.description.toLowerCase().includes(query.toLowerCase())));

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    state.lessons.forEach((lesson) => map.set(lesson.folderId, (map.get(lesson.folderId) ?? 0) + 1));
    return map;
  }, [state.lessons]);

  function createLesson() {
    const result = run(
      () =>
        platform.createLesson({
          folderId: activeFolderId,
          title: lessonForm.title,
          subtitle: lessonForm.subtitle,
          description: lessonForm.description,
          durationMinutes: lessonForm.durationMinutes,
          tags: lessonForm.tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
          color: lessonForm.color,
          coverEmoji: lessonForm.coverEmoji,
          actorId: user.id
        }),
      "课节已创建"
    );
    if (result.ok) {
      setLessonOpen(false);
      setLessonForm((value) => ({ ...value, title: "", subtitle: "", description: "" }));
    }
  }

  function createFolder() {
    const result = run(
      () =>
        platform.createFolder({
          parentId: activeFolderId,
          name: folderForm.name,
          description: folderForm.description,
          color: folderForm.color,
          actorId: user.id
        }),
      "目录已创建"
    );
    if (result.ok) {
      setFolderOpen(false);
      setFolderForm({ name: "", description: "", color: "#69d5c5" });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Course structure"
        title={t("operator.courseTree")}
        description="使用不限层级的自由目录组织课节，不绑定固定 HSK 层级。"
        actions={<><Button variant="secondary" onClick={() => setFolderOpen(true)}><Folder size={17} /> 新建目录</Button><Button onClick={() => setLessonOpen(true)}><Plus size={17} /> {t("operator.createLesson")}</Button></>}
      />

      <div className="catalog-layout">
        <aside className="catalog-sidebar">
          <div className="search-box">
            <Search size={17} />
            <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索课节" />
          </div>
          <nav>
            {state.folders.map((folder) => {
              const depth = folder.parentId ? 1 : 0;
              return (
                <button
                  key={folder.id}
                  className={folder.id === activeFolderId ? "active" : ""}
                  style={{ paddingLeft: `${14 + depth * 18}px` }}
                  onClick={() => setActiveFolderId(folder.id)}
                >
                  {folder.id === activeFolderId ? <FolderOpen size={17} /> : <Folder size={17} />}
                  <span>{folder.name}</span>
                  <small>{counts.get(folder.id) ?? 0}</small>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="catalog-main">
          <Card className="folder-header-card" style={{ borderColor: activeFolder?.color }}>
            <span className="folder-large-icon" style={{ background: `${activeFolder?.color}20`, color: activeFolder?.color }}>
              <FolderOpen size={28} />
            </span>
            <div>
              <span className="eyebrow">Current folder</span>
              <h2>{activeFolder?.name}</h2>
              <p>{activeFolder?.description}</p>
            </div>
            <div className="folder-stats">
              <strong>{lessons.length}</strong>
              <span>{t("operator.lessonCount", { count: lessons.length })}</span>
            </div>
          </Card>

          {children.length > 0 && (
            <div className="subfolder-grid">
              {children.map((folder) => (
                <button key={folder.id} onClick={() => setActiveFolderId(folder.id)}>
                  <span style={{ background: `${folder.color}20`, color: folder.color }}><Folder size={21} /></span>
                  <div><strong>{folder.name}</strong><small>{counts.get(folder.id) ?? 0} 个课节</small></div>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          )}

          <div className="lesson-catalog-grid">
            {lessons.map((lesson) => {
              const sessions = state.sessions.filter((session) => session.lessonId === lesson.id);
              const sets = state.interactionSets.filter((set) => set.lessonId === lesson.id);
              return (
                <Card className="lesson-catalog-card" key={lesson.id} interactive>
                  <div className="lesson-catalog-cover" style={{ background: `linear-gradient(145deg, ${lesson.color}, #f4f1ff)` }}>
                    <span>{lesson.coverEmoji}</span>
                    <Badge tone="purple">{lesson.durationMinutes} 分钟</Badge>
                  </div>
                  <div className="lesson-catalog-body">
                    <span className="eyebrow">{lesson.subtitle}</span>
                    <h2>{lesson.title}</h2>
                    <p>{lesson.description}</p>
                    <div className="lesson-tags">{lesson.tags.map((tag) => <span key={tag}><Tag size={12} /> {tag}</span>)}</div>
                    <div className="lesson-catalog-stats">
                      <span><BookOpen size={15} /> {sets.length} 个互动</span>
                      <span>{sessions.length} 个班次</span>
                    </div>
                    <Button variant="secondary" className="full-width" onClick={() => navigate("/operator/scheduling")}>从此课节排课</Button>
                  </div>
                </Card>
              );
            })}
            {lessons.length === 0 && <EmptyState title="当前目录没有课节" description="创建第一个课节后即可排课并配置互动。" action={<Button onClick={() => setLessonOpen(true)}>新建课节</Button>} />}
          </div>
        </section>
      </div>

      <Modal
        open={lessonOpen}
        title="新建课节"
        onClose={() => setLessonOpen(false)}
        footer={<div className="modal-footer-split"><small>课节创建后可直接在排课中使用</small><div><Button variant="ghost" onClick={() => setLessonOpen(false)}>取消</Button><Button onClick={createLesson}>创建课节</Button></div></div>}
      >
        <div className="editor-grid">
          <Field label="课节标题" className="field-span-2"><TextInput value={lessonForm.title} onChange={(event) => setLessonForm((value) => ({ ...value, title: event.target.value }))} placeholder="例如：在学校的一天" /></Field>
          <Field label="副标题 / 印尼语" className="field-span-2"><TextInput value={lessonForm.subtitle} onChange={(event) => setLessonForm((value) => ({ ...value, subtitle: event.target.value }))} /></Field>
          <Field label="课节说明" className="field-span-2"><textarea className="input textarea" value={lessonForm.description} onChange={(event) => setLessonForm((value) => ({ ...value, description: event.target.value }))} /></Field>
          <Field label="时长（分钟）"><TextInput type="number" value={lessonForm.durationMinutes} onChange={(event) => setLessonForm((value) => ({ ...value, durationMinutes: Number(event.target.value) }))} /></Field>
          <Field label="标签（逗号分隔）"><TextInput value={lessonForm.tags} onChange={(event) => setLessonForm((value) => ({ ...value, tags: event.target.value }))} /></Field>
          <Field label="主题色"><input className="input color-input" type="color" value={lessonForm.color} onChange={(event) => setLessonForm((value) => ({ ...value, color: event.target.value }))} /></Field>
          <Field label="封面表情"><TextInput value={lessonForm.coverEmoji} onChange={(event) => setLessonForm((value) => ({ ...value, coverEmoji: event.target.value }))} /></Field>
        </div>
      </Modal>

      <Modal
        open={folderOpen}
        title="新建课程目录"
        onClose={() => setFolderOpen(false)}
        footer={<div className="modal-footer-split"><small>新目录将创建在“{activeFolder?.name}”下</small><div><Button variant="ghost" onClick={() => setFolderOpen(false)}>取消</Button><Button onClick={createFolder}>创建目录</Button></div></div>}
      >
        <div className="editor-grid">
          <Field label="目录名称" className="field-span-2"><TextInput value={folderForm.name} onChange={(event) => setFolderForm((value) => ({ ...value, name: event.target.value }))} placeholder="例如：文化活动" /></Field>
          <Field label="目录说明" className="field-span-2"><textarea className="input textarea" value={folderForm.description} onChange={(event) => setFolderForm((value) => ({ ...value, description: event.target.value }))} /></Field>
          <Field label="目录颜色" className="field-span-2"><input className="input color-input" type="color" value={folderForm.color} onChange={(event) => setFolderForm((value) => ({ ...value, color: event.target.value }))} /></Field>
        </div>
      </Modal>
    </>
  );
}
