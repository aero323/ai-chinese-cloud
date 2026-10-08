import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Pencil, Plus, Search, UserRoundPlus, UsersRound } from "lucide-react";
import type { ClassEnrollment, ClassGroup, GradeCategory } from "../../domain/types";
import { Avatar, Badge, Button, Card, EmptyState, Field, Modal, PageHeader, ProgressBar, Select, Tabs, TextInput } from "../../components/ui";
import { currentUser, getUser, studentMetrics } from "../../lib/domain";
import { getAcademicSchoolId, workspaceState } from "../../lib/academicScope";
import { dateInputInTimeZone, gradeRangeBounds, selectGradePolicy } from "../../lib/gradeAnalytics";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";

type StudentManagementTab = "students" | "classes" | "rules";
const gradeCategories: GradeCategory[] = ["interaction", "homework", "exam"];
const gradeLabels: Record<GradeCategory, string> = { interaction: "互动练习", homework: "作业", exam: "考试" };

export function OperatorStudents({
  academic = false,
  basePath = "/operator"
}: {
  academic?: boolean;
  basePath?: string;
} = {}) {
  const navigate = useNavigate();
  const { state: rawState, run } = usePlatformStore();
  const operator = currentUser(rawState);
  const schoolId = academic ? getAcademicSchoolId(rawState, operator) : "";
  const state = useMemo(() => (academic ? workspaceState(rawState, schoolId) : rawState), [academic, rawState, schoolId]);
  const [tab, setTab] = useState<StudentManagementTab>("students");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [classEditor, setClassEditor] = useState<ClassGroup | "new" | null>(null);
  const [memberClassId, setMemberClassId] = useState("");
  const [form, setForm] = useState({
    name: "",
    schoolId: academic ? schoolId : state.schools.find((item) => item.status === "active")?.id ?? "",
    phone: "",
    timeZone: "Asia/Jakarta",
    locale: "id-ID",
    program: "Mandarin Explorer",
    level: "初级 1",
    className: "待分班",
    learningGoal: "",
    preferredTeacherId: ""
  });

  const students = state.students.filter((profile) => {
    const user = getUser(state, profile.userId);
    const keyword = query.trim().toLowerCase();
    return !keyword || `${user?.name ?? ""} ${profile.level} ${profile.className ?? ""} ${profile.tags.join(" ")}`.toLowerCase().includes(keyword);
  });

  function createStudent() {
    const result = run(
      () => platform.createStudent({ ...form, schoolId: form.schoolId || undefined, actorId: operator.id }),
      "学生档案已创建"
    );
    if (result.ok) {
      setCreateOpen(false);
      setForm((value) => ({ ...value, name: "", phone: "", learningGoal: "" }));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Student operations"
        title={academic ? "本校学生管理" : "学生管理"}
        description={academic ? "维护本校学生档案、班级成员、预约与本校成绩权重。班级名称和成员变化不会拆分历史成绩。" : "维护学生档案、班级成员与全校成绩权重。班级名称和成员变化不会拆分历史成绩。"}
        actions={tab === "students"
          ? <Button onClick={() => setCreateOpen(true)}><UserRoundPlus size={17} /> 新建学生</Button>
          : tab === "classes"
            ? <Button onClick={() => setClassEditor("new")}><Plus size={17} /> 新建班级</Button>
            : undefined}
      />

      <Card className="content-filter-bar student-management-tabs">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "students", label: "学生档案", count: state.students.length },
            { value: "classes", label: "班级与成员", count: state.classes.length },
            { value: "rules", label: academic ? "本校成绩规则" : "成绩规则" }
          ]}
        />
      </Card>

      {tab === "students" && (
        <>
          <Card className="content-filter-bar">
            <div className="search-box wide">
              <Search size={17} />
              <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名、等级、班级或标签" />
            </div>
            <Badge tone="purple"><UsersRound size={13} /> {students.length} 位学生</Badge>
          </Card>
          {students.length > 0 && (
            <Card className="student-roster-table">
              <div className="student-roster-list">
                {students.map((profile) => {
                  const user = getUser(state, profile.userId);
                  if (!user) return null;
                  const metrics = studentMetrics(state, profile.userId);
                  const visibleTags = profile.tags.slice(0, 2);
                  const hiddenTagCount = profile.tags.length - visibleTags.length;
                  return (
                    <article className="student-roster-row" key={profile.userId}>
                      <div className="student-roster-person">
                        <Avatar label={user.avatar} tone="purple" />
                        <div>
                          <strong>{user.name}</strong>
                          <small>{profile.level} · {profile.program}</small>
                        </div>
                      </div>
                      <div className="student-roster-class"><UsersRound size={14} /> {profile.className || "待分班"}</div>
                      <div className="student-roster-tags">
                        {visibleTags.map((tag) => <span key={tag}>{tag}</span>)}
                        {hiddenTagCount > 0 && <span>+{hiddenTagCount}</span>}
                        {profile.tags.length === 0 && <span className="student-roster-tag-empty">暂无标签</span>}
                      </div>
                      <div className="student-roster-stats">
                        <div><strong>{metrics.upcoming.length}</strong><small>待上课程</small></div>
                        <div><strong>{metrics.completedSetIds.size}</strong><small>完成互动</small></div>
                        <div><strong>{metrics.averageScore ? Math.round(metrics.averageScore) : "--"}</strong><small>互动均分</small></div>
                      </div>
                      <div className="student-roster-status">
                        <Badge tone={user.status === "active" ? "mint" : "neutral"}>{user.status === "active" ? "活跃" : "暂停"}</Badge>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => navigate(`${basePath}/students/${profile.userId}`)}>
                        查看完整档案 <ChevronRight size={15} />
                      </Button>
                    </article>
                  );
                })}
              </div>
            </Card>
          )}
          {students.length === 0 && <EmptyState title="没有匹配学生" />}
        </>
      )}

      {tab === "classes" && (
        <ClassManagement
          query={query}
          onQueryChange={setQuery}
          onEdit={setClassEditor}
          onMembers={setMemberClassId}
          academic={academic}
        />
      )}

      {tab === "rules" && <GradeRuleSettings academic={academic} schoolId={schoolId} />}

      <Modal
        open={createOpen}
        title="新建学生档案"
        onClose={() => setCreateOpen(false)}
        width="720px"
        footer={<div className="modal-footer-split"><small>使用虚构演示信息，不接入真实身份系统</small><div><Button variant="ghost" onClick={() => setCreateOpen(false)}>取消</Button><Button onClick={createStudent}>创建档案</Button></div></div>}
      >
        <div className="editor-grid">
          <Field label="学生姓名" className="field-span-2"><TextInput value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder="例如：Nadia" /></Field>
          {!academic && (
            <Field label="所属学校"><Select value={form.schoolId} onChange={(event) => setForm((value) => ({ ...value, schoolId: event.target.value, className: "待分班", preferredTeacherId: "" }))}><option value="">请选择学校</option>{state.schools.filter((item) => item.status === "active").map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</Select></Field>
          )}
          <Field label="联系方式"><TextInput value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} placeholder="+62 ..." /></Field>
          <Field label="界面语言"><Select value={form.locale} onChange={(event) => setForm((value) => ({ ...value, locale: event.target.value }))}><option value="id-ID">Bahasa Indonesia</option><option value="zh-CN">简体中文</option></Select></Field>
          <Field label="主班级">
            <Select value={form.className} onChange={(event) => setForm((value) => ({ ...value, className: event.target.value }))}>
              {state.classes.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              {!state.classes.some((item) => item.name === "待分班") && <option value="待分班">待分班</option>}
            </Select>
          </Field>
          <Field label="时区"><Select value={form.timeZone} onChange={(event) => setForm((value) => ({ ...value, timeZone: event.target.value }))}><option value="Asia/Jakarta">GMT+7 雅加达</option><option value="Asia/Shanghai">GMT+8 上海</option><option value="Asia/Singapore">GMT+8 新加坡</option></Select></Field>
          <Field label="课程项目"><TextInput value={form.program} onChange={(event) => setForm((value) => ({ ...value, program: event.target.value }))} /></Field>
          <Field label="当前等级"><TextInput value={form.level} onChange={(event) => setForm((value) => ({ ...value, level: event.target.value }))} /></Field>
          <Field label="偏好教师"><Select value={form.preferredTeacherId} onChange={(event) => setForm((value) => ({ ...value, preferredTeacherId: event.target.value }))}><option value="">暂不指定</option>{state.users.filter((item) => item.role === "teacher").filter((teacher) => state.schoolMemberships.some((membership) => membership.schoolId === form.schoolId && membership.userId === teacher.id && membership.role === "teacher" && membership.status === "active")).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</Select></Field>
          <Field label="学习目标" className="field-span-2"><textarea className="input textarea" value={form.learningGoal} onChange={(event) => setForm((value) => ({ ...value, learningGoal: event.target.value }))} /></Field>
        </div>
      </Modal>

      <ClassEditorModal classItem={classEditor} onClose={() => setClassEditor(null)} academic={academic} />
      {memberClassId && <ClassMembersModal classId={memberClassId} onClose={() => setMemberClassId("")} academic={academic} />}
    </>
  );
}

function ClassManagement({
  query,
  onQueryChange,
  onEdit,
  onMembers,
  academic = false
}: {
  query: string;
  onQueryChange: (query: string) => void;
  onEdit: (classItem: ClassGroup) => void;
  onMembers: (classId: string) => void;
  academic?: boolean;
}) {
  const { state: rawState } = usePlatformStore();
  const actor = currentUser(rawState);
  const state = useMemo(
    () => (academic ? workspaceState(rawState, getAcademicSchoolId(rawState, actor)) : rawState),
    [academic, rawState, actor]
  );
  const classes = state.classes.filter((item) => !query || item.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <Card className="content-filter-bar">
        <div className="search-box wide"><Search size={17} /><TextInput value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索班级名称" /></div>
        <Badge tone="blue">{classes.length} 个班级</Badge>
      </Card>
      {classes.length > 0 && (
        <Card className="student-roster-table">
          <div className="student-roster-list">
            {classes.map((classItem) => {
              const teacher = getUser(state, classItem.teacherId);
              const members = state.classEnrollments.filter((item) => item.classId === classItem.id && item.status === "active");
              const sessions = state.sessions.filter((item) => item.classId === classItem.id && item.status !== "cancelled");
              const publishedAssessments = state.assessments.filter((item) => item.classId === classItem.id && item.status === "published").length;
              return (
                <article className="student-roster-row class-roster-row" key={classItem.id}>
                  <div className="student-roster-person">
                    <span className="class-roster-mark">{classItem.name.slice(0, 1)}</span>
                    <div>
                      <strong>{classItem.name}</strong>
                      <small>{teacher?.name ?? "未分配教师"} · {members.length} 位成员</small>
                    </div>
                  </div>
                  <div className="student-roster-stats">
                    <div><strong>{members.length}</strong><small>有效成员</small></div>
                    <div><strong>{sessions.length}</strong><small>关联课次</small></div>
                    <div><strong>{publishedAssessments}</strong><small>正式考核</small></div>
                  </div>
                  <div className="student-roster-status">
                    <Badge tone={classItem.status === "active" ? "mint" : "neutral"}>{classItem.status === "active" ? "进行中" : "已归档"}</Badge>
                  </div>
                  <div className="class-roster-actions">
                    <Button variant="ghost" onClick={() => onEdit(classItem)}><Pencil size={15} /> 编辑班级</Button>
                    <Button variant="secondary" onClick={() => onMembers(classItem.id)}><UsersRound size={15} /> 管理成员</Button>
                  </div>
                </article>
              );
            })}
          </div>
        </Card>
      )}
      {classes.length === 0 && <EmptyState title="没有匹配班级" />}
    </>
  );
}

function ClassEditorModal({ classItem, onClose, academic = false }: { classItem: ClassGroup | "new" | null; onClose: () => void; academic?: boolean }) {
  const { state: rawState, run } = usePlatformStore();
  const actor = currentUser(rawState);
  const schoolId = academic ? getAcademicSchoolId(rawState, actor) : "";
  const state = useMemo(() => (academic ? workspaceState(rawState, schoolId) : rawState), [academic, rawState, schoolId]);
  const teachers = state.users.filter((item) => item.role === "teacher");
  const [name, setName] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");

  useEffect(() => {
    if (!classItem) return;
    setName(classItem === "new" ? "" : classItem.name);
    setTeacherId(classItem === "new" ? teachers[0]?.id ?? "" : classItem.teacherId);
    setStatus(classItem === "new" ? "active" : classItem.status);
    // 只在打开或切换班级时重置。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classItem]);

  if (!classItem) return null;
  const currentClass = classItem;
  function save() {
    const result = currentClass === "new"
      ? run(() => platform.createClass({ name, teacherId, status, schoolId: schoolId || undefined, actorId: actor.id }), "班级已创建")
      : run(() => platform.updateClass({ classId: currentClass.id, patch: { name, teacherId, status }, actorId: actor.id, reason: academic ? "学校教务维护班级" : "教学管理维护班级" }), "班级已更新");
    if (result.ok) onClose();
  }
  return (
    <Modal open title={classItem === "new" ? "新建班级" : "编辑班级"} onClose={onClose} footer={<div className="modal-footer-split"><small>班级是正式考核名单和教师权限的稳定边界。</small><div><Button variant="ghost" onClick={onClose}>取消</Button><Button disabled={!name.trim() || !teacherId} onClick={save}>保存班级</Button></div></div>}>
      <div className="editor-grid">
        <Field label="班级名称" className="field-span-2"><TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：印尼圣心学校7年级A班" /></Field>
        <Field label="主教师"><Select value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</Select></Field>
        <Field label="状态"><Select value={status} onChange={(event) => setStatus(event.target.value as "active" | "archived")}><option value="active">进行中</option><option value="archived">已归档</option></Select></Field>
      </div>
    </Modal>
  );
}

function ClassMembersModal({ classId, onClose, academic = false }: { classId: string; onClose: () => void; academic?: boolean }) {
  const { state: rawState, run } = usePlatformStore();
  const actor = currentUser(rawState);
  const schoolId = academic ? getAcademicSchoolId(rawState, actor) : "";
  const state = useMemo(() => (academic ? workspaceState(rawState, schoolId) : rawState), [academic, rawState, schoolId]);
  const classItem = state.classes.find((item) => item.id === classId);
  const activeIds = state.classEnrollments.filter((item) => item.classId === classId && item.status === "active").map((item) => item.studentId);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(activeIds));
  const [query, setQuery] = useState("");
  const visibleStudents = state.students.filter((profile) => {
    const user = getUser(state, profile.userId);
    return !query || user?.name.toLowerCase().includes(query.toLowerCase());
  });

  function toggle(studentId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId); else next.add(studentId);
      return next;
    });
  }

  function save() {
    const currentIds = new Set(activeIds);
    const additions = [...selected].filter((studentId) => !currentIds.has(studentId));
    const removals = activeIds.filter((studentId) => !selected.has(studentId));
    const result = run<ClassEnrollment[] | ClassEnrollment>(() => {
      const added = platform.addClassMembers({ classId, studentIds: additions, actorId: actor.id });
      for (const studentId of removals) {
        const removed = platform.removeClassMember({ classId, studentId, actorId: actor.id });
        if (!removed.ok) return removed;
      }
      return added;
    }, "班级成员已更新");
    if (result.ok) onClose();
  }

  return (
    <Modal open title={`${classItem?.name ?? "班级"} · 管理成员`} onClose={onClose} width="760px" footer={<div className="modal-footer-split"><small>已选 {selected.size} 人 · 移除主班级成员会同步改为“待分班”。</small><div><Button variant="ghost" onClick={onClose}>取消</Button><Button onClick={save}>保存成员</Button></div></div>}>
      <div className="search-box wide class-member-search"><Search size={16} /><TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索学生" /></div>
      <div className="class-member-list">
        {visibleStudents.map((profile) => {
          const user = getUser(state, profile.userId);
          if (!user) return null;
          const checked = selected.has(user.id);
          return (
            <label className={`class-member-row ${checked ? "is-selected" : ""}`} key={user.id}>
              <input type="checkbox" checked={checked} onChange={() => toggle(user.id)} />
              <Avatar label={user.avatar} size="sm" tone={checked ? "purple" : "neutral"} />
              <span><strong>{user.name}</strong><small>{profile.level} · 主班级 {profile.className || "待分班"}</small></span>
              {checked && <Badge tone="purple">已加入</Badge>}
            </label>
          );
        })}
      </div>
    </Modal>
  );
}

export function GradeRuleSettings({ academic = false, schoolId = "" }: { academic?: boolean; schoolId?: string }) {
  const { state: rawState, run } = usePlatformStore();
  const operator = currentUser(rawState);
  const state = useMemo(
    () => (academic ? workspaceState(rawState, schoolId) : rawState),
    [academic, rawState, schoolId]
  );
  const policySchoolId = academic ? schoolId : null;
  const currentPolicy = selectGradePolicy(state, new Date().toISOString(), policySchoolId);
  const [weights, setWeights] = useState(currentPolicy.weights);
  const [effectiveFrom, setEffectiveFrom] = useState(dateInputInTimeZone(new Date(), state.ui.timeZone));
  const total = gradeCategories.reduce((sum, category) => sum + Number(weights[category] || 0), 0);
  const history = useMemo(
    () => [...state.gradePolicies].filter((item) => item.schoolId === policySchoolId).sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()),
    [policySchoolId, state.gradePolicies]
  );

  function save() {
    const effectiveAt = gradeRangeBounds({ start: effectiveFrom, end: effectiveFrom, timeZone: state.ui.timeZone }).startAt;
    run(() => platform.saveGradePolicy({ effectiveFrom: effectiveAt, weights, schoolId: policySchoolId, actorId: operator.id }), academic ? "本校成绩权重已更新" : "平台默认成绩权重已更新");
  }

  return (
    <div className="grade-rule-layout">
      <Card className="grade-rule-editor">
        <div className="card-heading"><div><span className="eyebrow">Weighting</span><h2>{academic ? "本校综合成绩权重" : "平台默认综合成绩权重"}</h2></div><Badge tone={total === 100 ? "mint" : "danger"}>合计 {total}%</Badge></div>
        <p>权重按生效日期分版本。统计区间跨过生效日时，整个区间使用区间末期最新政策。</p>
        <div className="grade-rule-fields">
          {gradeCategories.map((category) => (
            <Field label={gradeLabels[category]} key={category}>
              <TextInput type="number" min="0" max="100" value={weights[category]} onChange={(event) => setWeights((current) => ({ ...current, [category]: Number(event.target.value) }))} />
            </Field>
          ))}
          <Field label="生效日期"><TextInput type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></Field>
        </div>
        <div className="grade-rule-preview">
          {gradeCategories.map((category) => <div key={category}><ProgressBar value={weights[category]} tone={category === "interaction" ? "mint" : category === "homework" ? "orange" : "blue"} /><span>{gradeLabels[category]} {weights[category]}%</span></div>)}
        </div>
        <Button disabled={total !== 100} onClick={save}>保存新权重版本</Button>
      </Card>
      <Card className="grade-policy-history">
        <div className="card-heading"><div><span className="eyebrow">History</span><h2>政策历史</h2></div></div>
        <div className="grade-policy-list">
          {history.map((policy) => (
            <article key={policy.id}>
              <div><strong>{formatPolicyDate(policy.effectiveFrom, state.ui.timeZone)}</strong><Badge tone={policy.id === currentPolicy.id ? "mint" : "neutral"}>{policy.id === currentPolicy.id ? "当前生效" : "历史"}</Badge></div>
              <p>互动 {policy.weights.interaction}% · 作业 {policy.weights.homework}% · 考试 {policy.weights.exam}%</p>
              <small>{getUser(state, policy.updatedBy)?.name ?? policy.updatedBy}</small>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}

function formatPolicyDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("zh-CN", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
