import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  BookOpenText,
  Check,
  Clock3,
  Eye,
  Presentation,
  Layers3,
  Maximize2,
  Medal,
  Minimize2,
  PauseCircle,
  PlayCircle,
  Radio,
  RotateCcw,
  Sparkles,
  Trophy,
  UsersRound
} from "lucide-react";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, getCurrentInteractionVersion } from "../../lib/domain";
import { formatDateTime, formatRange } from "../../lib/format";
import { interactionTypeLabel, interactionTypeShortLabel } from "../../lib/interactionTypes";
import {
  buildTeacherLiveDemo,
  liveInteractionStatusLabel,
  setTeacherDemoMode,
  useTeacherDemoMode,
  type LiveInteractionMetric,
  type LiveInteractionStatus,
  type LiveRankingEntry,
  type TeacherLiveDemo
} from "../../lib/teacherLiveDemo";
import { Avatar, Badge, Button, Card, EmptyState, Modal, PageHeader, ProgressBar, StatCard } from "../../components/ui";
import { InteractionPlayer } from "../../components/InteractionPlayer";

function buildCoursewareSlides(snapshot: TeacherLiveDemo) {
  return [
    {
      id: "cover",
      kind: "cover",
      eyebrow: "AI Chinese Cloud",
      title: snapshot.lessonTitle,
      subtitle: snapshot.lessonSubtitle,
      lines: [] as string[],
      note: `${snapshot.session.roomLabel} · 课堂课件`
    },
    {
      id: "goals",
      kind: "list",
      eyebrow: "Learning goals",
      title: "今天我们会学",
      subtitle: "Belajar sapaan hari ini",
      lines: ["你好 · Halo", "早上好 · Selamat pagi", "下午好 · Selamat sore", "再见 · Sampai jumpa"],
      note: ""
    },
    {
      id: "key-phrase",
      kind: "focus",
      eyebrow: "Key phrase",
      title: "你好",
      subtitle: "nǐ hǎo",
      lines: [],
      note: "见面时最常用的问候语。"
    },
    {
      id: "dialogue",
      kind: "dialogue",
      eyebrow: "情景对话",
      title: "你好，老师好！",
      subtitle: "Halo, Bu Guru!",
      lines: ["A：你好！", "B：你好，老师好！", "A：大家好！"],
      note: ""
    },
    {
      id: "interaction",
      kind: "list",
      eyebrow: "课堂互动",
      title: "一起练一练",
      subtitle: "Ayo berlatih bersama",
      lines: snapshot.interactions.slice(0, 3).map((interaction) => interaction.title),
      note: ""
    },
    {
      id: "wrap-up",
      kind: "focus",
      eyebrow: "课堂收束",
      title: "和同桌打招呼",
      subtitle: "Halo, apa kabar?",
      lines: [],
      note: "用今天学到的问候语向同伴问好。"
    }
  ];
}

const interactionTone: Record<LiveInteractionStatus, "purple" | "mint" | "orange"> = {
  completed: "mint",
  live: "purple",
  upcoming: "orange"
};

const interactionLabelTone: Record<LiveInteractionStatus, string> = {
  completed: "done",
  live: "active",
  upcoming: "waiting"
};

function RankingRows({ rows, limit }: { rows: LiveRankingEntry[]; limit?: number }) {
  return (
    <div className="live-ranking-list">
      {(limit ? rows.slice(0, limit) : rows).map((row, index) => (
        <div className="live-ranking-row" key={row.studentId}>
          <span className={`live-ranking-number rank-${index + 1}`}>{index + 1}</span>
          <Avatar label={row.avatar} size="sm" tone={index === 0 ? "orange" : index === 1 ? "blue" : "purple"} />
          <div className="live-ranking-name">
            <strong>{row.name}</strong>
            <small>{row.completedLabel}</small>
          </div>
          <b>{row.score || "--"}</b>
        </div>
      ))}
    </div>
  );
}

function InteractionCard({
  interaction,
  projected,
  onProject,
  onOpen
}: {
  interaction: LiveInteractionMetric;
  projected: boolean;
  onProject: () => void;
  onOpen: () => void;
}) {
  const completion = interaction.participantCount ? Math.round((interaction.answered / interaction.participantCount) * 100) : 0;
  return (
    <article className={`live-interaction-card is-${interaction.status} ${projected ? "is-projected" : ""}`}>
      <header className="live-interaction-head">
        <div className="live-interaction-title">
          <span className={`live-interaction-status status-${interactionLabelTone[interaction.status]}`}>
            {interaction.status === "live" && <span className="live-pulse-dot" />}
            {liveInteractionStatusLabel(interaction.status)}
          </span>
          <h3>{interaction.title}</h3>
          {interaction.items[0] && (
            <div className="live-interaction-type">
              <Badge tone={interactionTone[interaction.status]}>{interactionTypeShortLabel(interaction.items[0].type)}</Badge>
            </div>
          )}
        </div>
        <div className="live-interaction-count">
          <strong>{interaction.answered}</strong>
          <span>/ {interaction.participantCount} 已答</span>
        </div>
      </header>

      <div className="live-interaction-progress">
        <ProgressBar value={completion} tone={interactionTone[interaction.status]} />
        <span>{completion}%</span>
      </div>

      <div className="live-interaction-metrics">
        <div><strong>{interaction.averageScore || "--"}</strong><small>平均分</small></div>
        <div><strong>{interaction.correctRate ? `${interaction.correctRate}%` : "--"}</strong><small>正确率</small></div>
        <div><strong>{interaction.durationLabel}</strong><small>课堂进度</small></div>
      </div>

      {interaction.status !== "upcoming" ? (
        <div className="live-interaction-ranking">
          <div className="live-interaction-section-label"><Trophy size={14} /> 当前排名</div>
          <RankingRows rows={interaction.ranking} limit={3} />
        </div>
      ) : (
        <div className="live-interaction-waiting">
          <Clock3 size={16} />
          <span>待开启</span>
        </div>
      )}

      <footer className="live-interaction-actions">
        <Button size="sm" variant={projected ? "soft" : "secondary"} onClick={onProject} disabled={interaction.status === "upcoming"}>
          {projected ? <Radio size={15} /> : <PlayCircle size={15} />}
          {projected ? "正在投影" : "投影这道题"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onOpen}>
          <Eye size={15} /> 查看完整数据
        </Button>
      </footer>
    </article>
  );
}

export function TeacherLiveClass() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const state = usePlatformStore((store) => store.state);
  const user = currentUser(state);
  const [demoMode] = useTeacherDemoMode();
  const [projectedSetId, setProjectedSetId] = useState("");
  const [projectionSetId, setProjectionSetId] = useState("");
  const [detailSetId, setDetailSetId] = useState("");
  const [coursewareOpen, setCoursewareOpen] = useState(false);
  const [coursewareSlideIndex, setCoursewareSlideIndex] = useState(0);
  const [coursewareFullscreen, setCoursewareFullscreen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [ended, setEnded] = useState(false);

  const snapshot = useMemo(
    () => buildTeacherLiveDemo(state, user.id, sessionId),
    [state, user.id, sessionId]
  );
  const coursewareSlides = useMemo(() => (snapshot ? buildCoursewareSlides(snapshot) : []), [snapshot]);

  useEffect(() => {
    if (!snapshot) return;
    const active = snapshot.interactions.find((interaction) => interaction.status === "live") ?? snapshot.interactions[0];
    setProjectedSetId((current) => current || active?.id || "");
  }, [snapshot]);

  useEffect(() => {
    if (!coursewareOpen || coursewareSlides.length === 0) return;
    setCoursewareSlideIndex(Math.min(Math.max(0, (snapshot?.courseware[0]?.currentSlide ?? 1) - 1), coursewareSlides.length - 1));
  }, [coursewareOpen, coursewareSlides.length, snapshot]);

  if (!snapshot) {
    return <EmptyState title="没有可演示的课堂" description="当前老师没有可用的课堂数据，请先切换到有课演示。" action={<Button onClick={() => navigate("/teacher")}>返回教师首页</Button>} />;
  }

  const activeInteraction = snapshot.interactions.find((interaction) => interaction.id === projectedSetId) ?? snapshot.interactions[0];
  const detailInteraction = snapshot.interactions.find((interaction) => interaction.id === detailSetId);
  const projectionInteraction = snapshot.interactions.find((interaction) => interaction.id === projectionSetId);
  const projectionSet = state.interactionSets.find((set) => set.id === projectionSetId);
  const projectionItems = projectionSet ? getCurrentInteractionVersion(state, projectionSet)?.items ?? [] : [];
  const selectedCourseware = snapshot.courseware[0];
  const interactionProgress = snapshot.interactions.length
    ? Math.round((snapshot.interactions.filter((interaction) => interaction.status === "completed").length / snapshot.interactions.length) * 100)
    : 0;
  const classProgress = Math.round((snapshot.elapsedMinutes / (snapshot.elapsedMinutes + snapshot.remainingMinutes)) * 100);
  const scheduleDate = new Intl.DateTimeFormat(state.ui.language, {
    timeZone: state.ui.timeZone,
    month: "numeric",
    day: "numeric"
  }).format(new Date(snapshot.session.startAt));
  const scheduleLabel = `${scheduleDate} ${formatRange(snapshot.session.startAt, snapshot.session.endAt, state.ui.timeZone, state.ui.language)}`;

  if (ended) {
    return (
      <>
        <PageHeader
          eyebrow="Live classroom · wrapped"
          title="课堂已结束"
          description={`${snapshot.session.title} · ${formatDateTime(snapshot.session.startAt, state.ui.timeZone, state.ui.language)}`}
          actions={<Button onClick={() => navigate("/teacher")}><ArrowLeft size={16} /> 返回教师首页</Button>}
        />
        <Card className="live-ended-card">
          <span className="live-ended-icon"><Check size={28} /></span>
          <div>
            <Badge tone="mint">演示已结束</Badge>
            <h2>本节课的实时数据已经归档</h2>
            <p>课件、互动设计和学生作答记录已同步到“学习结果”，可以继续查看课堂回放数据。</p>
          </div>
          <div className="live-ended-actions">
            <Button variant="secondary" onClick={() => navigate("/teacher/results")}><BarChart3 size={16} /> 查看学习结果</Button>
            <Button variant="ghost" onClick={() => { setEnded(false); setTeacherDemoMode("live"); }}><RotateCcw size={16} /> 重新演示</Button>
          </div>
        </Card>
      </>
    );
  }

  if (demoMode === "empty") {
    return (
      <>
        <PageHeader
          eyebrow="Live classroom"
          title="当前没有进行中的课堂"
          description="右上角切换到“有课”，即可演示老师正在上课时的实时课堂视图。"
          actions={<Button variant="secondary" onClick={() => navigate("/teacher")}><ArrowLeft size={16} /> 返回教师首页</Button>}
        />
        <section className="live-class-empty">
          <span><PauseCircle size={30} /></span>
          <div>
            <h2>课堂演示暂时关闭</h2>
            <p>切换到“有课”后，这里会显示课件、互动进度、学生作答和实时排名。</p>
          </div>
          <Button onClick={() => setTeacherDemoMode("live")}><PlayCircle size={16} /> 切换到有课演示</Button>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Live classroom · teacher view"
        title={snapshot.session.title}
        description={`${snapshot.lessonTitle} · ${snapshot.lessonSubtitle} · ${snapshot.session.roomLabel}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/teacher")}><ArrowLeft size={16} /> 返回教师首页</Button>
            <Button variant="danger" onClick={() => setEndOpen(true)}><PauseCircle size={16} /> 结束课堂</Button>
          </>
        }
      />

      <section className="live-class-banner">
        <div className="live-class-banner-main">
          <span className="live-status-pill"><span className="live-pulse-dot" /> 正在进行中</span>
          <h2>{snapshot.lessonTitle}</h2>
          <p>{snapshot.lessonDescription}</p>
          <div className="live-class-meta">
            <span><CalendarClock size={15} /> {scheduleLabel}</span>
            <span><UsersRound size={15} /> {snapshot.presentCount}/{snapshot.participantTotal} 人在线</span>
            <span><Layers3 size={15} /> {snapshot.interactions.length} 组互动已配置</span>
          </div>
        </div>
        <div className="live-class-banner-timer">
          <span>课堂进度</span>
          <strong>{classProgress}%</strong>
          <ProgressBar value={classProgress} tone="mint" />
          <small>已上 {snapshot.elapsedMinutes} 分钟 · 还有 {snapshot.remainingMinutes} 分钟</small>
        </div>
        <div className="live-class-banner-orbit orbit-one" />
        <div className="live-class-banner-orbit orbit-two" />
      </section>

      <section className="stat-grid stat-grid-4 live-class-stats">
        <StatCard label="在线学生" value={`${snapshot.presentCount}/${snapshot.participantTotal}`} icon={<UsersRound size={19} />} tone="blue" />
        <StatCard label="已完成互动" value={`${snapshot.interactions.filter((item) => item.status === "completed").length}/${snapshot.interactions.length}`} icon={<Check size={19} />} tone="mint" progress={interactionProgress} />
        <StatCard label="当前正确率" value={`${snapshot.interactions.find((item) => item.status === "live")?.correctRate ?? 0}%`} icon={<BarChart3 size={19} />} tone="purple" />
        <StatCard label="平均分" value={snapshot.interactions.find((item) => item.status === "live")?.averageScore ?? "--"} icon={<Medal size={19} />} tone="orange" />
      </section>

      <div className="live-class-detail-grid">
        <div className="live-class-main-column">
          <Card className="live-courseware-card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">Courseware</span>
                <h2>课堂课件</h2>
              </div>
              <BookOpenText size={20} />
            </div>
            {selectedCourseware ? (
              <div className="live-courseware-body">
                <div className="live-courseware-icon"><Presentation size={24} /></div>
                <div className="live-courseware-copy">
                  <div className="live-courseware-title-row">
                    <strong>{selectedCourseware.material.title}</strong>
                  </div>
                  <p>{selectedCourseware.material.description}</p>
                  <div className="live-courseware-meta">
                    <span>{selectedCourseware.material.fileType.toUpperCase()}</span>
                    <span>第 {selectedCourseware.currentSlide} / {selectedCourseware.totalSlides} 页</span>
                    <span>最近更新 {selectedCourseware.material.versions.at(-1)?.sizeLabel ?? "课堂版"}</span>
                  </div>
                  <ProgressBar value={selectedCourseware.progress} tone="purple" />
                </div>
                <Button variant="secondary" onClick={() => setCoursewareOpen(true)}><Eye size={16} /> 查看课件</Button>
              </div>
            ) : (
              <div className="live-courseware-empty"><Presentation size={20} /> 暂无已关联的课中课件</div>
            )}
          </Card>

          <section className="section-block live-interaction-section">
            <div className="section-heading-row">
              <div>
                <span className="eyebrow">Live interaction board</span>
                <h2>实时互动进度</h2>
              </div>
            </div>
            <div className="live-interaction-grid">
              {snapshot.interactions.map((interaction) => (
                <InteractionCard
                  key={interaction.id}
                  interaction={interaction}
                  projected={activeInteraction?.id === interaction.id}
                  onProject={() => {
                    setProjectedSetId(interaction.id);
                    setProjectionSetId(interaction.id);
                  }}
                  onOpen={() => setDetailSetId(interaction.id)}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="live-class-side-column">
          <Card className="live-feed-card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">Class pulse</span>
                <h2>课堂动态</h2>
              </div>
              <Sparkles size={19} />
            </div>
            <div className="live-feed-list">
              {snapshot.activityFeed.map((item) => (
                <div className="live-feed-row" key={item.id}>
                  <span className={`live-feed-dot tone-${item.tone}`} />
                  <div><strong>{item.label}</strong><small>{item.detail}</small></div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="live-quick-card">
            <span className="live-quick-icon"><Radio size={20} /></span>
            <div>
              <strong>当前投影</strong>
              <p>{activeInteraction?.title ?? "等待选择互动"}</p>
            </div>
            <ArrowRight size={17} />
          </Card>
        </aside>
      </div>

      <Modal
        open={Boolean(detailInteraction)}
        title={detailInteraction ? `互动数据 · ${detailInteraction.title}` : "互动数据"}
        onClose={() => setDetailSetId("")}
        width="760px"
        footer={<Button variant="secondary" onClick={() => setDetailSetId("")}>关闭</Button>}
      >
        {detailInteraction && (
          <div className="live-detail-content">
            <div className="live-detail-summary">
              <div><strong>{detailInteraction.answered}/{detailInteraction.participantCount}</strong><small>已作答</small></div>
              <div><strong>{detailInteraction.averageScore || "--"}</strong><small>平均分</small></div>
              <div><strong>{detailInteraction.correctRate ? `${detailInteraction.correctRate}%` : "--"}</strong><small>正确率</small></div>
              <div><strong>{detailInteraction.items.length}</strong><small>题目数</small></div>
            </div>
            <h3 className="live-detail-title">学生排名</h3>
            <RankingRows rows={detailInteraction.ranking} />
            <h3 className="live-detail-title">题目状态</h3>
            <div className="live-detail-item-list">
              {detailInteraction.items.map((item, index) => (
                <div className="live-detail-item-row" key={item.id}>
                  <span>{index + 1}</span>
                  <div><strong>{item.prompt}</strong><small>{interactionTypeLabel(item.type)}</small></div>
                  <b>{item.answered} 人</b>
                  <em>{item.status === "upcoming" ? "待开始" : `${item.correctRate}% 正确`}</em>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(projectionInteraction)}
        title={projectionInteraction ? `投影原题 · ${projectionInteraction.title}` : "投影原题"}
        onClose={() => setProjectionSetId("")}
        width="980px"
      >
        <div className="projection-modal">
          <div className="projection-player-shell">
            <InteractionPlayer items={projectionItems} preview onClose={() => setProjectionSetId("")} />
          </div>
        </div>
      </Modal>

      <Modal
        open={coursewareOpen}
        title="课堂课件"
        onClose={() => {
          setCoursewareOpen(false);
          setCoursewareFullscreen(false);
        }}
        width="980px"
        fullscreen={coursewareFullscreen}
        footer={<Button variant="secondary" onClick={() => { setCoursewareOpen(false); setCoursewareFullscreen(false); }}>关闭预览</Button>}
      >
        <div className="courseware-deck">
          <div className="courseware-deck-toolbar">
            <span className="courseware-deck-live"><span className="live-pulse-dot" /> 正在投影</span>
            <div className="courseware-deck-toolbar-actions">
              <span>第 {Math.min(coursewareSlideIndex + 1, coursewareSlides.length)} / {coursewareSlides.length} 页</span>
              <Button variant="secondary" size="sm" onClick={() => setCoursewareFullscreen((value) => !value)}>
                {coursewareFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                {coursewareFullscreen ? "退出全屏" : "全屏投影"}
              </Button>
            </div>
          </div>

          {coursewareSlides[coursewareSlideIndex] && (
            <article className={`courseware-slide-canvas slide-${coursewareSlides[coursewareSlideIndex].kind}`}>
              <span className="courseware-slide-kicker">{coursewareSlides[coursewareSlideIndex].eyebrow}</span>
              {coursewareSlides[coursewareSlideIndex].kind === "cover" && <span className="courseware-slide-emoji">{snapshot.coverEmoji}</span>}
              <h3>{coursewareSlides[coursewareSlideIndex].title}</h3>
              {coursewareSlides[coursewareSlideIndex].subtitle && <p className="courseware-slide-subtitle">{coursewareSlides[coursewareSlideIndex].subtitle}</p>}
              {coursewareSlides[coursewareSlideIndex].lines.length > 0 && (
                <div className="courseware-slide-lines">
                  {coursewareSlides[coursewareSlideIndex].lines.map((line) => <span key={line}>{line}</span>)}
                </div>
              )}
              {coursewareSlides[coursewareSlideIndex].note && <small className="courseware-slide-note">{coursewareSlides[coursewareSlideIndex].note}</small>}
              <span className="courseware-slide-page">{coursewareSlideIndex + 1}</span>
            </article>
          )}

          <div className="courseware-deck-footer">
            <div className="courseware-thumbnails" aria-label="课件缩略页">
              {coursewareSlides.map((slide, index) => (
                <button
                  className={index === coursewareSlideIndex ? "active" : ""}
                  key={slide.id}
                  onClick={() => setCoursewareSlideIndex(index)}
                  title={slide.title}
                >
                  <span>{index + 1}</span>
                  <strong>{slide.title}</strong>
                </button>
              ))}
            </div>
            <div className="courseware-deck-nav">
              <Button size="icon" variant="secondary" disabled={coursewareSlideIndex === 0} onClick={() => setCoursewareSlideIndex((value) => Math.max(0, value - 1))} aria-label="上一页">
                <ChevronLeft size={17} />
              </Button>
              <Button size="icon" variant="secondary" disabled={coursewareSlideIndex >= coursewareSlides.length - 1} onClick={() => setCoursewareSlideIndex((value) => Math.min(coursewareSlides.length - 1, value + 1))} aria-label="下一页">
                <ChevronRight size={17} />
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={endOpen}
        title="结束这节课？"
        onClose={() => setEndOpen(false)}
        footer={
          <div className="modal-footer-split">
            <span>结束后会把当前课堂标记为已完成，演示数据仍可重新开启。</span>
            <div>
              <Button variant="ghost" onClick={() => setEndOpen(false)}>取消</Button>
              <Button variant="danger" onClick={() => { setEndOpen(false); setEnded(true); setTeacherDemoMode("empty"); }}>确认结束</Button>
            </div>
          </div>
        }
      >
        <div className="live-end-confirmation">
          <span><PauseCircle size={24} /></span>
          <div><strong>{snapshot.session.title}</strong><p>已进行 {snapshot.elapsedMinutes} 分钟，{snapshot.presentCount} 位学生在课堂中。</p></div>
        </div>
      </Modal>
    </>
  );
}
