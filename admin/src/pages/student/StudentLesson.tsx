import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, Clock3, Download, LockKeyhole, Play, Sparkles } from "lucide-react";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";
import {
  currentUser,
  getCurrentInteractionVersion,
  getLesson,
  getSession,
  isSessionBooked,
  lessonContent,
  phaseAvailabilityLabel,
  sessionPhase
} from "../../lib/domain";
import type { Phase } from "../../domain/types";
import { Badge, Button, Card, EmptyState, Modal, PageHeader, ProgressBar, Tabs } from "../../components/ui";
import { InteractionPlayer, type PlayerResult } from "../../components/InteractionPlayer";
import { MaterialCard } from "../../components/MaterialCard";
import { formatDateTime } from "../../lib/format";

const phaseMeta: Array<{ phase: Phase; label: string; icon: typeof Play }> = [
  { phase: "preview", label: "课前预习", icon: Sparkles },
  { phase: "live", label: "课中互动", icon: Play },
  { phase: "review", label: "课后复习", icon: CheckCircle2 }
];

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
  const initialPhase = (searchParams.get("phase") as Phase) || "preview";
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [activeCoursewareId, setActiveCoursewareId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PlayerResult | null>(null);

  const content = lessonContent(state, lessonId, phase, sessionId || undefined);
  const activeSet = content.sets.find((set) => set.id === activeSetId);
  const activeVersion = activeSet ? getCurrentInteractionVersion(state, activeSet) : undefined;
  const activeCourseware = content.materials.find((material) => material?.id === activeCoursewareId);
  const activeCoursewareUrl = activeCourseware?.versions.find((version) => version.version === activeCourseware.currentVersion)?.url ?? activeCourseware?.versions.at(-1)?.url;
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

  if (!lesson) {
    return <EmptyState title="课节不存在" description="请返回课表重新选择。" action={<Button onClick={() => navigate("/student/schedule")}>返回课表</Button>} />;
  }

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
            <span><Clock3 size={16} /> {lesson.durationMinutes} 分钟</span>
            {session && <span>{formatDateTime(session.startAt, state.ui.timeZone, state.ui.language)}</span>}
            <span>{state.ui.timeZone}</span>
          </div>
          <div className="overview-progress">
            <div>
              <span>本课互动完成</span>
              <strong>{content.sets.filter((set) => completed.has(set.id)).length}/{content.sets.length}</strong>
            </div>
            <ProgressBar value={content.sets.length ? (content.sets.filter((set) => completed.has(set.id)).length / content.sets.length) * 100 : 0} />
          </div>
        </div>
      </Card>

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

      {!isBooked && (
        <Card className="locked-stage-card">
          <LockKeyhole size={25} />
          <div>
            <strong>预约后解锁该课节</strong>
            <p>预习和复习材料只对已预约学生开放。</p>
          </div>
          <Button onClick={() => navigate("/student/book")}>去约课</Button>
        </Card>
      )}

      {isBooked && !phaseOpen && (
        <Card className="locked-stage-card">
          <LockKeyhole size={25} />
          <div>
            <strong>{t("student.phaseLocked")}</strong>
            <p>
              {phase === "live"
                ? "课中互动会在课堂开始前 10 分钟开放。"
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
          <div className="interaction-set-list">
            {content.sets.map((set, index) => {
              const version = getCurrentInteractionVersion(state, set);
              const done = completed.has(set.id);
              return (
                <Card className={`interaction-set-card ${done ? "completed" : ""}`} key={set.id} interactive>
                  <span className="set-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="set-title-row">
                      <h3>{set.title}</h3>
                      {done ? <Badge tone="mint">已完成</Badge> : <Badge tone="orange">待完成</Badge>}
                    </div>
                    <p>{set.description}</p>
                    <div className="set-meta">
                      <span>{version?.items.length ?? 0} 题</span>
                      <span>v{version?.version ?? 1}</span>
                      <span>自动评分</span>
                    </div>
                  </div>
                  <Button
                    disabled={!isBooked || !phaseOpen}
                    onClick={() => {
                      setActiveSetId(set.id);
                      setLastResult(null);
                    }}
                  >
                    {done ? t("student.retry") : "开始互动"}
                  </Button>
                </Card>
              );
            })}
            {content.sets.length === 0 && <EmptyState title="本阶段暂无互动" description="教师发布后会立即出现在这里。" />}
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading-row">
            <div>
              <span className="eyebrow">Materials</span>
              <h2>{t("student.material")}</h2>
            </div>
            <Badge tone="blue">{content.materials.length} 个文件</Badge>
          </div>
          <div className="material-list">
            {content.materials.map((material) => (
              <MaterialCard
                key={material!.id}
                material={material!}
                onDownload={() => run(() => platform.trackDownload(material!.id), "下载已记录")}
                onOpen={() => setActiveCoursewareId(material!.id)}
              />
            ))}
            {content.materials.length === 0 && <EmptyState title={t("student.noMaterials")} />}
          </div>
          {materialsDone && <p className="muted-copy">已预约学生可下载当前阶段材料；新上传文件在原型中只保留元数据。</p>}
        </section>
      </div>

      <Modal
        open={Boolean(activeCourseware)}
        title={activeCourseware?.title ?? "互动课件"}
        onClose={() => setActiveCoursewareId(null)}
        width="1180px"
      >
        {activeCourseware && activeCoursewareUrl && (
          <div className="courseware-player-shell">
            <div className="courseware-player-toolbar">
              <div>
                <Badge tone="purple">互动 HTML 课件</Badge>
                <span>支持词汇点读、选择题和句子排序，可直接在后台内播放。</span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => window.open(activeCoursewareUrl, "_blank", "noopener,noreferrer")}
              >
                新窗口打开
              </Button>
            </div>
            <iframe
              className="courseware-frame"
              src={activeCoursewareUrl}
              title={activeCourseware.title}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(activeSet)}
        title={activeSet?.title ?? "互动"}
        onClose={() => setActiveSetId(null)}
        width="900px"
        footer={
          lastResult ? (
            <div className="result-modal-footer">
              <span>本次得分</span>
              <strong>{lastResult.score}</strong>
              {lastResult.score < 100 && <Badge tone="orange">可再次练习提升最佳分</Badge>}
            </div>
          ) : undefined
        }
      >
        {activeSet && activeVersion && !lastResult && (
          <InteractionPlayer
            items={activeVersion.items}
            onClose={() => setActiveSetId(null)}
            onComplete={(result) => {
              setLastResult(result);
              run(
                () =>
                  platform.recordAttempt({
                    setId: activeSet.id,
                    studentId: user.id,
                    sessionId: session?.id,
                    phase,
                    answers: result.answers,
                    score: result.score,
                    timeSpentSeconds: result.elapsedSeconds,
                    wrongItemIds: result.wrongItemIds,
                    pollAnswers: result.pollAnswers
                  }),
                `练习完成，本次得分 ${result.score}`
              );
            }}
          />
        )}
        {lastResult && (
          <div className="player-result-summary">
            <div className="result-score-ring">
              <strong>{lastResult.score}</strong>
              <span>分</span>
            </div>
            <div>
              <h3>{lastResult.score === 100 ? "全部掌握，太棒了！" : "已经完成，再练一次会更好。"}</h3>
              <p>本次用时 {lastResult.elapsedSeconds} 秒，错题 {lastResult.wrongItemIds.length} 道。</p>
            </div>
            <Button
              onClick={() => {
                setLastResult(null);
              }}
            >
              再练一次
            </Button>
            <Button variant="secondary" onClick={() => setActiveSetId(null)}>
              返回课节
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
