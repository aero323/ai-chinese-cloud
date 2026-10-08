import { useEffect, useRef, useState } from "react";
import { BookOpen, Pause, Play } from "lucide-react";
import type { Material, Phase, PlatformState } from "../domain/types";
import { lessonContent } from "../lib/domain";
import { INTERACTION_TYPE_SHORT_LABELS } from "../lib/interactionTypes";
import { platform } from "../lib/platform";
import { usePlatformStore } from "../store/usePlatformStore";
import { Badge, Button, EmptyState, Modal, Tabs } from "./ui";
import { MaterialCard } from "./MaterialCard";
import { InteractionSetPlayerModal } from "./InteractionSetPlayerModal";

type ContentTab = "courseware" | "materials" | "interactions";

const phaseLabels: Record<Phase, string> = { preview: "课前预习", live: "课中", review: "课后复习" };

function materialUrl(material: Material) {
  return material.versions.find((item) => item.version === material.currentVersion)?.url ?? material.versions.at(-1)?.url;
}

/**
 * 课表上的课前 / 课后内容弹窗：顶部标签在课件 / 材料 / 互动之间切换，
 * 让学生在一个弹窗里看完整套课前或课后内容，互动可以直接开始。
 */
export function SessionContentModal({
  open,
  onClose,
  state,
  phase,
  lessonId,
  sessionId,
  title,
  coursewareUrl,
  coursewareMaterialId,
  coursewareBadge = "互动 HTML 课件",
  coursewareNote = "支持词汇点读、选择题和句子排序，可直接在后台内播放。",
  onOpenLesson
}: {
  open: boolean;
  onClose: () => void;
  state: PlatformState;
  phase: Phase;
  lessonId: string;
  sessionId: string;
  title: string;
  coursewareUrl?: string;
  /** 已经作为“课件”展示的材料，不再重复出现在材料标签里。 */
  coursewareMaterialId?: string;
  coursewareBadge?: string;
  coursewareNote?: string;
  onOpenLesson: () => void;
}) {
  const { run } = usePlatformStore();
  const [tab, setTab] = useState<ContentTab>("courseware");
  const [playingId, setPlayingId] = useState("");
  const [activeSetId, setActiveSetId] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (open) return;
    setTab("courseware");
    setPlayingId("");
    setActiveSetId("");
    audioRef.current?.pause();
  }, [open]);

  const content = lessonContent(state, lessonId, phase, sessionId);
  const materials = content.materials
    .filter((material): material is Material => Boolean(material))
    .filter((material) => material.id !== coursewareMaterialId);
  const completed = new Set(
    state.interactionAttempts.filter((attempt) => attempt.studentId === state.currentUserId).map((attempt) => attempt.setId)
  );
  const activeSet = content.sets.find((set) => set.id === activeSetId);
  const hasCourseware = Boolean(coursewareUrl);
  const tabs: Array<{ value: ContentTab; label: string; count?: number }> = [];
  if (hasCourseware || phase === "preview") tabs.push({ value: "courseware", label: "课件" });
  tabs.push({ value: "materials", label: "材料", count: materials.length });
  tabs.push({ value: "interactions", label: "互动", count: content.sets.length });
  const activeTab: ContentTab = tabs.some((item) => item.value === tab) ? tab : tabs[0].value;

  function toggleAudio(material: Material) {
    const url = materialUrl(material);
    if (!url || !audioRef.current) return;
    if (playingId === material.id) {
      audioRef.current.pause();
      setPlayingId("");
      return;
    }
    audioRef.current.src = url;
    void audioRef.current.play();
    setPlayingId(material.id);
  }

  return (
    <>
      <Modal
        open={open}
        title={`${title} · ${phaseLabels[phase]}`}
        onClose={onClose}
        width="1120px"
        panelClassName="session-content-modal"
      >
        <div className="session-preview">
          <Tabs value={activeTab} onChange={(value) => setTab(value as ContentTab)} items={tabs} />

          {activeTab === "courseware" && (
            coursewareUrl ? (
              <div className="courseware-player-shell">
                <div className="courseware-player-toolbar">
                  <div>
                    <Badge tone="purple">{coursewareBadge}</Badge>
                    <span>{coursewareNote}</span>
                  </div>
                  <div className="courseware-player-actions">
                    <Button size="sm" variant="ghost" onClick={onOpenLesson}>
                      <BookOpen size={15} /> 打开学习页
                    </Button>
                  </div>
                </div>
                <iframe className="courseware-frame" src={coursewareUrl} title={title} />
              </div>
            ) : (
              <EmptyState
                title="这节课暂时没有互动课件"
                description={`老师上传课件后会自动出现在这里；也可以先看「材料」里的${phaseLabels[phase]}资料。`}
                action={materials.length > 0 ? <Button variant="secondary" onClick={() => setTab("materials")}>查看材料</Button> : undefined}
              />
            )
          )}

          {activeTab === "materials" && (
            <div className="material-list session-preview-list">
              {materials.map((material) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  playing={playingId === material.id}
                  onPlay={() => toggleAudio(material)}
                  onDownload={() => run(() => platform.trackDownload(material.id), "下载已记录")}
                />
              ))}
              {materials.length === 0 && (
                <EmptyState title="本阶段暂无其他材料" description={`老师补充后会在${phaseLabels[phase]}里出现。`} />
              )}
            </div>
          )}

          {activeTab === "interactions" && (
            <div className="interaction-set-list session-preview-list">
              {content.sets.map((set, index) => {
                const done = completed.has(set.id);
                const version = set.currentVersionId ? state.interactionVersions.find((item) => item.id === set.currentVersionId) : undefined;
                const types = [...new Set((version?.items ?? []).map((item) => item.type))].slice(0, 3);
                return (
                  <article className="session-preview-set" key={set.id}>
                    <span className="set-index">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <div className="set-title-row">
                        <h3>{set.title}</h3>
                        {done ? <Badge tone="mint">已完成</Badge> : <Badge tone="orange">待完成</Badge>}
                      </div>
                      <div className="session-preview-set-meta">
                        <small>{version?.items.length ?? 0} 题</small>
                        {types.map((type) => (
                          <Badge tone="neutral" key={type}>{INTERACTION_TYPE_SHORT_LABELS[type]}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setActiveSetId(set.id)}>{done ? "再练一次" : "开始互动"}</Button>
                  </article>
                );
              })}
              {content.sets.length === 0 && (
                <EmptyState title="本阶段暂无互动" description={`老师发布后会在${phaseLabels[phase]}里出现。`} />
              )}
            </div>
          )}
        </div>
        <audio ref={audioRef} onEnded={() => setPlayingId("")} />
      </Modal>

      {activeSet && (
        <InteractionSetPlayerModal
          set={activeSet}
          sessionId={sessionId}
          phase={phase}
          closeLabel={`返回${phaseLabels[phase]}`}
          onClose={() => setActiveSetId("")}
        />
      )}
    </>
  );
}
