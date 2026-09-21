import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CalendarClock, Eye, FileText, Layers3, Lock, MapPin, Plus, Send, UsersRound } from "lucide-react";
import { usePlatformStore } from "../../store/usePlatformStore";
import { getBookedCount, getLesson, getSession, getStudent, getUser, setsForSession } from "../../lib/domain";
import { formatDate, formatRange, timeZoneLabel } from "../../lib/format";
import { Avatar, Badge, Button, Card, EmptyState, Field, Modal, PageHeader, ProgressBar, Select, SourceBadge, TextInput } from "../../components/ui";
import { platform } from "../../lib/platform";
import type { ChangeRequestKind } from "../../domain/types";

export function TeacherSessionDetail() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { state, run } = usePlatformStore();
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkSelection, setLinkSelection] = useState<string[]>([]);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState<{ kind: ChangeRequestKind; reason: string }>({ kind: "reschedule", reason: "" });
  const session = getSession(state, sessionId);
  const lesson = session ? getLesson(state, session.lessonId) : undefined;
  if (!session || !lesson) return <EmptyState title="课程不存在" action={<Button onClick={() => navigate("/teacher/schedule")}>返回课表</Button>} />;
  const activeSession = session;
  const bookings = state.bookings
    .filter((booking) => booking.sessionId === session.id && booking.status === "booked")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const sets = state.interactionSets.filter((set) => set.lessonId === lesson.id);
  const sessionSets = setsForSession(state, activeSession).filter((set) => set.status === "published");
  const linkableSets = sets.filter(
    (set) => set.status === "published" && set.sessionIds && set.sessionIds.length > 0 && !set.sessionIds.includes(activeSession.id)
  );

  function linkSets() {
    linkSelection.forEach((setId) => {
      const target = state.interactionSets.find((item) => item.id === setId);
      if (!target) return;
      run(
        () =>
          platform.assignInteractionSessions({
            setId,
            sessionIds: [...new Set([...(target.sessionIds ?? []), activeSession.id])],
            actorId: state.users.find((user) => user.id === activeSession.teacherId)?.id
          }),
        "已引用到本节课"
      );
    });
    setLinkSelection([]);
    setLinkOpen(false);
  }
  const booked = getBookedCount(state, session.id);

  return (
    <>
      <PageHeader
        eyebrow="Session detail"
        title={session.title}
        description={`${lesson.title} · ${formatDate(session.startAt, state.ui.timeZone, state.ui.language)}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/teacher/schedule")}><ArrowLeft size={17} /> 返回课表</Button>
            <Button onClick={() => setRequestOpen(true)}><Send size={16} /> 向运营申请调整</Button>
          </>
        }
      />

      <section className="teacher-session-hero">
        <div className="session-hero-cover" style={{ background: `linear-gradient(135deg, ${lesson.color}, #f6f2ff)` }}>{lesson.coverEmoji}</div>
        <div>
          <Badge tone="orange"><Lock size={13} /> 教师只读</Badge>
          <h2>{lesson.title}</h2>
          <p>{lesson.description}</p>
          <div className="lesson-overview-meta">
            <span><CalendarClock size={16} /> {formatRange(session.startAt, session.endAt, state.ui.timeZone, state.ui.language)}</span>
            <span><MapPin size={16} /> {session.roomLabel}</span>
            <span><UsersRound size={16} /> {booked}/{session.capacity}</span>
          </div>
        </div>
        <div className="timezone-note">{timeZoneLabel(state.ui.timeZone)}</div>
      </section>

      <div className="dashboard-columns teacher-detail-layout">
        <Card className="roster-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">Roster</span>
              <h2>{t("teacher.sessionRoster")}</h2>
              <p>{t("teacher.rosterHint")}</p>
            </div>
            <Badge tone="blue">{bookings.length} 人</Badge>
          </div>
          <div className="roster-list">
            {bookings.map((booking) => {
              const user = getUser(state, booking.studentId);
              const profile = getStudent(state, booking.studentId);
              if (!user || !profile) return null;
              return (
                <article className="roster-row" key={booking.id}>
                  <Avatar label={user.avatar} tone="purple" />
                  <div>
                    <strong>{user.name}</strong>
                    <small>{profile.level} · {profile.program}</small>
                  </div>
                  <div className="roster-tags">
                    {profile.tags.slice(0, 2).map((tag) => <Badge key={tag} tone="neutral">{tag}</Badge>)}
                  </div>
                  <SourceBadge source={booking.source} />
                </article>
              );
            })}
          </div>
          <p className="privacy-note">{t("teacher.noContact")}</p>
        </Card>

        <div className="teacher-detail-side">
          <Card className="session-interaction-card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">Interactions</span>
                <h2>本节课的互动设计</h2>
                <p>发布后按预习 / 课中 / 复习顺序出现在学生端。</p>
              </div>
              <Layers3 size={20} />
            </div>
            <div className="session-interaction-list">
              {sessionSets.map((set) => {
                const scope = set.sessionIds && set.sessionIds.length > 0 ? "仅此课节" : "全部课次";
                return (
                  <article key={set.id}>
                    <span className={`phase-badge phase-${set.phase}`}>
                      {set.phase === "preview" ? "预习" : set.phase === "live" ? "课中" : "复习"}
                    </span>
                    <div>
                      <strong>{set.title}</strong>
                      <small>{set.description}</small>
                    </div>
                    <Badge tone={scope === "仅此课节" ? "purple" : "neutral"}>{scope}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/teacher/interactions?editSetId=${set.id}`)}>编辑</Button>
                  </article>
                );
              })}
              {sessionSets.length === 0 && <p className="muted-copy">这节课还没有互动，先引用已有设计或新建一个。</p>}
            </div>
            <div className="session-interaction-actions">
              <Button variant="secondary" disabled={linkableSets.length === 0} onClick={() => setLinkOpen(true)}>
                <Layers3 size={16} /> 引用已有设计{linkableSets.length ? `（${linkableSets.length}）` : ""}
              </Button>
              <Button onClick={() => navigate(`/teacher/interactions?sessionId=${activeSession.id}&lessonId=${lesson.id}&phase=live`)}>
                <Plus size={16} /> 为这节课新建设计
              </Button>
            </div>
          </Card>

          <Modal
            open={linkOpen}
            title="引用已有互动设计到本节课"
            onClose={() => setLinkOpen(false)}
            footer={
              <div className="modal-footer-split">
                <span>所选设计会额外配置到本节课（原来配置的课次不受影响）</span>
                <div>
                  <Button variant="ghost" onClick={() => setLinkOpen(false)}>取消</Button>
                  <Button disabled={linkSelection.length === 0} onClick={linkSets}>引用 {linkSelection.length || ""}</Button>
                </div>
              </div>
            }
          >
            <div className="assign-session-list">
              {linkableSets.map((set) => {
                const checked = linkSelection.includes(set.id);
                return (
                  <label key={set.id} className={`assign-session-row ${checked ? "selected" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setLinkSelection((value) => (checked ? value.filter((id) => id !== set.id) : [...value, set.id]))
                      }
                    />
                    <span className="assign-session-copy">
                      <strong>{set.title}</strong>
                      <small>{set.phase === "preview" ? "预习" : set.phase === "live" ? "课中" : "复习"} · {set.description}</small>
                    </span>
                  </label>
                );
              })}
              {linkableSets.length === 0 && <p className="muted-copy">这门课节的其它互动都已包含本节课。可以先复制或重新设计一个。</p>}
            </div>
          </Modal>

          <Card>
            <div className="card-heading">
              <div>
                <span className="eyebrow">Readiness</span>
                <h2>课程内容准备</h2>
              </div>
              <FileText size={20} />
            </div>
            <div className="readiness-list">
              {["preview", "live", "review"].map((phase) => {
                const phaseSets = sets.filter((set) => set.phase === phase);
                const label = phase === "preview" ? "预习" : phase === "live" ? "课中" : "复习";
                return (
                  <div key={phase}>
                    <strong>{label}内容</strong>
                    <span>{phaseSets.length} 项</span>
                    <ProgressBar value={phaseSets.length ? 100 : 0} tone={phaseSets.length ? "mint" : "orange"} />
                  </div>
                );
              })}
            </div>
            <Button variant="secondary" onClick={() => navigate("/teacher/interactions")}>进入互动设计</Button>
          </Card>

          <Card>
            <div className="card-heading">
              <div>
                <span className="eyebrow">Results</span>
                <h2>课堂结果概览</h2>
              </div>
              <Eye size={20} />
            </div>
            <div className="result-mini-metrics">
              <div><strong>{state.interactionAttempts.filter((attempt) => attempt.sessionId === session.id).length}</strong><small>答题次数</small></div>
              <div><strong>{booked ? Math.round((bookings.filter((booking) => state.interactionAttempts.some((attempt) => attempt.studentId === booking.studentId)).length / booked) * 100) : 0}%</strong><small>参与率</small></div>
            </div>
            <Button variant="ghost" onClick={() => navigate("/teacher/results")}>查看完整结果</Button>
          </Card>
        </div>
      </div>

      <Modal
        open={requestOpen}
        title="向运营申请调整"
        onClose={() => setRequestOpen(false)}
        footer={
          <div className="modal-footer-split">
            <span>排课、容量和名单由运营维护，提交后运营会在消息中心处理。</span>
            <div>
              <Button variant="ghost" onClick={() => setRequestOpen(false)}>取消</Button>
              <Button
                disabled={requestForm.reason.trim().length < 6}
                onClick={() => {
                  const result = run(
                    () =>
                      platform.requestSessionChange({
                        sessionId: activeSession.id,
                        kind: requestForm.kind,
                        reason: requestForm.reason,
                        actorId: activeSession.teacherId
                      }),
                    "申请已提交给运营"
                  );
                  if (result.ok) {
                    setRequestOpen(false);
                    setRequestForm({ kind: "reschedule", reason: "" });
                  }
                }}
              >
                提交申请
              </Button>
            </div>
          </div>
        }
      >
        <div className="editor-grid">
          <Field label="申请类型">
            <Select
              value={requestForm.kind}
              onChange={(event) => setRequestForm((value) => ({ ...value, kind: event.target.value as ChangeRequestKind }))}
            >
              <option value="reschedule">申请改期</option>
              <option value="add_session">申请加课</option>
              <option value="new_lesson_plan">申请新增课节</option>
              <option value="teacher_swap">申请更换授课老师</option>
              <option value="cancel">申请取消课次</option>
            </Select>
          </Field>
          <Field label="当前课次">
            <TextInput value={`${session.title} · ${formatRange(session.startAt, session.endAt, state.ui.timeZone, state.ui.language)}`} readOnly />
          </Field>
          <Field label="申请原因（至少 6 个字）" className="field-span-2">
            <textarea
              className="input textarea"
              value={requestForm.reason}
              onChange={(event) => setRequestForm((value) => ({ ...value, reason: event.target.value }))}
              placeholder="例如：9月26日学校有教研活动，希望顺延一天同一时间段。"
            />
          </Field>
        </div>
        <p className="muted-copy">老师不会直接改时间、容量或学生名单；提交后运营会收到站内通知并处理，处理结果会回到你的消息中心。</p>
      </Modal>
    </>
  );
}
