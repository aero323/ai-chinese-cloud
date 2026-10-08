import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, Clock3, Download, GraduationCap, LockKeyhole, MapPin, Play, PlayCircle, Sparkles } from "lucide-react";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";
import {
  currentUser,
  getCurrentInteractionVersion,
  getLesson,
  getSession,
  getUser,
  isSessionBooked,
  lessonContent,
  phaseAvailabilityLabel,
  sessionPhase
} from "../../lib/domain";
import type { Material, Phase } from "../../domain/types";
import { Avatar, Badge, Button, Card, EmptyState, Modal, PageHeader, ProgressBar, Tabs } from "../../components/ui";
import { InteractionSetPlayerModal } from "../../components/InteractionSetPlayerModal";
import { MaterialCard } from "../../components/MaterialCard";
import { PmNote } from "../../components/PmNote";
import { useMaterialAudio } from "../../lib/useMaterialAudio";
import { formatDateTime } from "../../lib/format";

/** 课中互动改由学生端 App（移动端）承载，网页端不再展示这一档；恢复时把开关改成 true。 */
const SHOW_LIVE_PHASE = false;

const phaseMeta: Array<{ phase: Phase; label: string; icon: typeof Play }> = [
  { phase: "preview", label: "课前预习", icon: Sparkles },
  // 课中互动这一档先隐藏（去掉下面两行的注释、并把 SHOW_LIVE_PHASE 改成 true 即可恢复）。
  // ...(SHOW_LIVE_PHASE ? [{ phase: "live" as Phase, label: "课中互动", icon: Play }] : []),
  { phase: "review", label: "课后复习", icon: CheckCircle2 }
];

function currentMaterialUrl(material: Material) {
  return material.versions.find((version) => version.version === material.currentVersion)?.url ?? material.versions.at(-1)?.url;
}

export function StudentLesson() {
  const { lessonId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { state, run } = usePlatformStore();
  const user = currentUser(state);
  const lesson = getLesson(state, lessonId);
  const sessionId = searchParams.get("sessionId") ?? "";
  const session = sessionId ? getSession(state, sessionId) : undefined;
  const requestedPhase = (searchParams.get("phase") as Phase) || "preview";
  // 带 phase=live 的旧链接（或 App 里跳过来的）在网页端回落到课前预习。
  const initialPhase = requestedPhase === "live" && !SHOW_LIVE_PHASE ? "preview" : requestedPhase;
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [activeCoursewareId, setActiveCoursewareId] = useState<string | null>(null);
  const { playingId, toggle: toggleAudio } = useMaterialAudio();

  const content = lessonContent(state, lessonId, phase, sessionId || undefined);
  const allMaterials = lessonContent(state, lessonId).materials.filter((material): material is Material => Boolean(material));
  const teacher = session ? getUser(state, session.teacherId) : undefined;
  const activeSet = content.sets.find((set) => set.id === activeSetId);
  const activeCourseware = allMaterials.find((material) => material.id === activeCoursewareId);
  const activeCoursewareUrl = activeCourseware ? currentMaterialUrl(activeCourseware) : undefined;
  const activeCoursewareLabel = activeCourseware?.kind === "courseware"
    ? "互动 HTML 课件"
    : activeCourseware?.fileType === "pdf"
      ? "PDF 课件"
      : "课程课件";
  const activeCoursewareDescription = activeCourseware?.kind === "courseware"
    ? "支持词汇点读、选择题和句子排序，可直接在后台内播放。"
    : activeCourseware?.fileType === "pdf"
      ? "在后台内全屏预览该 PDF；内容加载后可直接翻页查看。"
      : "当前课件会在后台内全屏展示；内容加载后可直接查看。";
  const defaultCourseware = allMaterials.find((material) => material.kind === "courseware" && currentMaterialUrl(material)) ??
    allMaterials.find((material) => material.fileType === "pdf" && currentMaterialUrl(material));
  const isBooked = session ? isSessionBooked(state, user.id, session.id) : true;
  const phaseOpen = session ? sessionPhase(session, phase) : true;
  const completed = new Set(state.interactionAttempts.filter((attempt) => attempt.studentId === user.id).map((attempt) => attempt.setId));
  const materialsDone = useMemo(() => state.materials.length > 0, [state.materials.length]);

  function changePhase(next: Phase) {
    setPhase(next);
    const params = new URLSearchParams(searchParams);
    params.set("phase", next);
    setSearchParams(params);
  }

  function openCourseware() {
    if (defaultCourseware) setActiveCoursewareId(defaultCourseware.id);
  }

  if (!lesson) {
    return <EmptyState title="课节不存在" description="请返回课表重新选择。" action={<Button onClick={() => navigate("/student/schedule")}>返回课表</Button>} />;
  }

  const activeCoursewareTitle = activeCourseware?.kind === "courseware"
    ? activeCourseware.title
    : lesson.id === "lesson-greetings"
      ? "第 1 课 · 你好，新朋友"
      : `${lesson.title} · 课堂课件`;

  return (
    <>
      <PageHeader
        eyebrow="Lesson learning"
        title={lesson.title}
        description={lesson.description}
        actions={
          <Button variant="secondary" onClick={() => navigate("/student/schedule")}>
            <ArrowLeft size={17} /> 返回课表
          </Button>
        }
      />

      <Card className="lesson-overview-card">
        <div className="lesson-cover-large" style={{ background: `linear-gradient(145deg, ${lesson.color}, #f6f3ff)` }}>
          <span>{lesson.coverEmoji}</span>
          <Badge tone="purple">{lesson.tags[0] ?? "大班课"}</Badge>
        </div>
        <div className="lesson-overview-copy">
          <h2>{lesson.subtitle}</h2>
          <p>{lesson.description}</p>
          <div className="lesson-overview-meta">
            {session && <span><GraduationCap size={16} /> {session.className}</span>}
            <span><Clock3 size={16} /> {lesson.durationMinutes} 分钟</span>
            {session && <span>{formatDateTime(session.startAt, state.ui.timeZone, state.ui.language)}</span>}
            <span><MapPin size={16} /> {session?.roomLabel ?? "在线课堂"}</span>
            {teacher && (
              <span className="lesson-overview-teacher">
                <Avatar label={teacher.avatar} size="sm" tone="orange" /> {teacher.name}
              </span>
            )}
          </div>
          <div className="lesson-overview-actions">
            <Button variant="secondary" size="sm" disabled={!defaultCourseware} onClick={openCourseware}>
              <PlayCircle size={16} /> 查看课件
            </Button>
          </div>
          <PmNote block kind="口径" note="只统计当前学习阶段中已提交作答的互动。">
            <div className="overview-progress">
            <div>
              <span>本课互动完成</span>
              <strong>{content.sets.filter((set) => completed.has(set.id)).length}/{content.sets.length}</strong>
            </div>
            <ProgressBar value={content.sets.length ? (content.sets.filter((set) => completed.has(set.id)).length / content.sets.length) * 100 : 0} />
            </div>
          </PmNote>
        </div>
      </Card>

      <PmNote kind="规则" note="课前默认提前 48 小时开放，课后默认在下课结束后开放 48 小时；未预约学生不能进入互动和材料。">
        <div className="phase-tabs-wrap">
          <Tabs
            value={phase}
            onChange={changePhase}
            items={phaseMeta.map((item) => ({
              value: item.phase,
              label: item.label,
              count: lessonContent(state, lessonId, item.phase).sets.length
            }))}
          />
        </div>
      </PmNote>

      {!isBooked && (
        <Card className="locked-stage-card">
          <LockKeyhole size={25} />
          <div>
            <strong>预约后解锁该课节</strong>
            <p>预习和复习材料只对已预约学生开放。</p>
          </div>
          <PmNote kind="流程" note="点击进入约课中心；预约成功后当前课节立即解锁。">
            <Button onClick={() => navigate("/student/book")}>去约课</Button>
          </PmNote>
        </Card>
      )}

      {isBooked && !phaseOpen && (
        <Card className="locked-stage-card">
          <LockKeyhole size={25} />
          <div>
            <strong>{t("student.phaseLocked")}</strong>
            <p>
              {phase === "live"
                ? "课中互动会在课堂开始前 10 分钟开放。" // 课中档隐藏后走不到这里，恢复开关后生效
                : phase === "review"
                  ? "课堂结束后，复习内容和结果会在这里出现。"
                  : "该阶段已经结束。"}
            </p>
          </div>
          {session && <Badge tone="neutral">{phaseAvailabilityLabel(session, phase)}</Badge>}
        </Card>
      )}

      <div className="learning-content-grid">
        <section className="section-block">
          <div className="section-heading-row">
            <div>
              <span className="eyebrow">Interactions</span>
              <h2>{t(phase === "preview" ? "student.interactionPreview" : phase === "review" ? "student.interactionReview" : "student.interactionLive")}</h2>
            </div>
            <Badge tone="purple">{content.sets.length} 项</Badge>
          </div>
          <PmNote block kind="流程" note="开始互动会创建作答记录；再练不会覆盖历史，只更新最佳分。这些互动的结果可以在老师端的课程结果处看到。">
            <div className="interaction-set-list">
            {content.sets.map((set, index) => {
              const done = completed.has(set.id);
              return (
                <Card className={`interaction-set-card ${done ? "completed" : ""}`} key={set.id} interactive>
                  <span className="set-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="set-title-row">
                      <h3>{set.title}</h3>
                      {done ? <Badge tone="mint">已完成</Badge> : <Badge tone="orange">待完成</Badge>}
                    </div>
                  </div>
                  <Button
                    disabled={!isBooked || !phaseOpen}
                    onClick={() => setActiveSetId(set.id)}
                  >
                    {done ? t("student.retry") : "开始互动"}
                  </Button>
                </Card>
              );
            })}
            {content.sets.length === 0 && <EmptyState title="本阶段暂无互动" description="教师发布后会立即出现在这里。" />}
            </div>
          </PmNote>
        </section>

        <section className="section-block">
          <div className="section-heading-row">
            <div>
              <span className="eyebrow">Materials</span>
              <h2>{t("student.material")}</h2>
            </div>
            <Badge tone="blue">{content.materials.length} 个文件</Badge>
          </div>
          <PmNote block kind="口径" note="播放、查看和下载会记录为触达；下载只对已预约且阶段开放的学生生效。">
            <div className="material-list">
            {content.materials.map((material) => (
              <MaterialCard
                key={material!.id}
                material={material!}
                playing={playingId === material!.id}
                onPlay={() => toggleAudio(material!)}
                onDownload={() => run(() => platform.trackDownload(material!.id), "下载已记录")}
                onOpen={() => setActiveCoursewareId(material!.id)}
              />
            ))}
            {content.materials.length === 0 && <EmptyState title={t("student.noMaterials")} />}
            </div>
          </PmNote>
          {materialsDone && <p className="muted-copy">已预约学生可下载当前阶段材料；新上传文件在原型中只保留元数据。</p>}
        </section>
      </div>

      <Modal
        open={Boolean(activeCourseware)}
        title={activeCoursewareTitle}
        onClose={() => setActiveCoursewareId(null)}
        fullscreen
      >
        {activeCourseware && activeCoursewareUrl && (
          <div className="courseware-player-shell">
            <PmNote block kind="流程" note="全屏只改变课件展示方式，不改变课节进度和作答记录。">
              <div className="courseware-player-toolbar">
              <div>
                <Badge tone="purple">{activeCoursewareLabel}</Badge>
                <span>{activeCoursewareDescription}</span>
              </div>
              </div>
            </PmNote>
            <iframe
              className="courseware-frame"
              src={activeCoursewareUrl}
              title={activeCourseware.title}
            />
          </div>
        )}
      </Modal>

      {activeSet && (
        <InteractionSetPlayerModal
          set={activeSet}
          sessionId={session?.id}
          phase={phase}
          closeLabel="返回课节"
          onClose={() => setActiveSetId(null)}
        />
      )}
    </>
  );
}
