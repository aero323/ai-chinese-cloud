import { useState } from "react";
import type { InteractionSet, Phase } from "../domain/types";
import { currentUser, getCurrentInteractionVersion } from "../lib/domain";
import { platform } from "../lib/platform";
import { usePlatformStore } from "../store/usePlatformStore";
import { InteractionPlayer, type PlayerResult } from "./InteractionPlayer";
import { Badge, Button, Modal } from "./ui";
import { PmNote } from "./PmNote";

/**
 * 学生端通用互动弹窗：课节学习页和首页「学习任务」都用它，
 * 答完直接写一条答题记录，不用再跳到课节页。
 */
export function InteractionSetPlayerModal({
  set,
  sessionId,
  phase,
  closeLabel = "关闭",
  onClose
}: {
  set: InteractionSet;
  sessionId?: string;
  phase: Phase;
  closeLabel?: string;
  onClose: () => void;
}) {
  const { state, run } = usePlatformStore();
  const user = currentUser(state);
  const version = getCurrentInteractionVersion(state, set);
  const [lastResult, setLastResult] = useState<PlayerResult | null>(null);

  return (
    <Modal
      open
      title={set.title}
      onClose={onClose}
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
      {version && !lastResult && (
        <PmNote block kind="流程" note="提交后记录本次答案、得分、用时与错题，并绑定当前互动版本。">
          <InteractionPlayer
            items={version.items}
            onClose={onClose}
            onComplete={(result) => {
              setLastResult(result);
              run(
                () =>
                  platform.recordAttempt({
                    setId: set.id,
                    studentId: user.id,
                    sessionId,
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
        </PmNote>
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
          <PmNote kind="流程" note="再次提交会新增一条作答历史，并保留历史最高分。">
            <Button onClick={() => setLastResult(null)}>再练一次</Button>
          </PmNote>
          <Button variant="secondary" onClick={onClose}>{closeLabel}</Button>
        </div>
      )}
    </Modal>
  );
}
