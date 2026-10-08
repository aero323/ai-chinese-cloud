import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import type { ChangeRequestKind, ClassSession } from "../domain/types";
import { platform } from "../lib/platform";
import { usePlatformStore } from "../store/usePlatformStore";
import { formatRange } from "../lib/format";
import { Button, Field, Modal, Select, TextInput } from "./ui";
import { PmNote } from "./PmNote";

/** 向教学管理申请调整课次：老师不直接改排课，统一在这里提交申请。 */
export function SessionChangeRequestModal({
  open,
  onClose,
  sessions,
  teacherId,
  defaultSessionId
}: {
  open: boolean;
  onClose: () => void;
  sessions: ClassSession[];
  teacherId: string;
  defaultSessionId?: string;
}) {
  const { state, run } = usePlatformStore();
  const [sessionId, setSessionId] = useState("");
  const [kind, setKind] = useState<ChangeRequestKind>("reschedule");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setSessionId(defaultSessionId ?? sessions.find((session) => new Date(session.endAt).getTime() > Date.now())?.id ?? sessions[0]?.id ?? "");
    setKind("reschedule");
    setReason("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultSessionId]);

  const session = sessions.find((item) => item.id === sessionId);

  return (
    <Modal
      open={open}
      title="向教学管理申请调整"
      onClose={onClose}
      width="640px"
      footer={
        <div className="modal-footer-split">
          <span>提交后教学管理会在消息中心处理，结果会回到你的消息中心</span>
          <div>
            <Button variant="ghost" onClick={onClose}>取消</Button>
            <PmNote kind="流程" note="提交后进入教学管理待办；处理结果会回到教师消息中心。">
              <Button
                disabled={!session || reason.trim().length < 6}
                onClick={() => {
                  if (!session) return;
                  const result = run(
                    () => platform.requestSessionChange({ sessionId: session.id, kind, reason, actorId: teacherId }),
                    "申请已提交给教学管理"
                  );
                  if (result.ok) onClose();
                }}
              >
                <Send size={16} /> 提交申请
              </Button>
            </PmNote>
          </div>
        </div>
      }
    >
      <div className="editor-grid">
        <Field label="申请课次" className="field-span-2">
          <Select value={sessionId} onChange={(event) => setSessionId(event.target.value)}>
            {sessions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} · {formatRange(item.startAt, item.endAt, state.ui.timeZone, state.ui.language)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="申请类型">
          <Select value={kind} onChange={(event) => setKind(event.target.value as ChangeRequestKind)}>
            <option value="reschedule">申请改期</option>
            <option value="add_session">申请加课</option>
            <option value="new_lesson_plan">申请新增课节</option>
            <option value="teacher_swap">申请更换授课老师</option>
            <option value="cancel">申请取消课次</option>
          </Select>
        </Field>
        <Field label="当前课次">
          <TextInput
            value={session ? `${session.title} · ${formatRange(session.startAt, session.endAt, state.ui.timeZone, state.ui.language)}` : ""}
            readOnly
          />
        </Field>
        <Field label="申请原因（至少 6 个字）" className="field-span-2">
          <PmNote kind="规则" note="原因至少填写 6 个字，提交后作为处理依据并保留操作记录。">
            <textarea
              className="input textarea"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="例如：9月26日学校有教研活动，希望顺延一天同一时间段。"
            />
          </PmNote>
        </Field>
      </div>
      <p className="muted-copy">老师不会直接改时间、容量或学生名单；排课、容量和名单由教学管理维护。</p>
    </Modal>
  );
}
