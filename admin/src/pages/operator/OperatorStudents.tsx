import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, Search, UserRoundPlus, UsersRound } from "lucide-react";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, getUser, studentMetrics } from "../../lib/domain";
import { Avatar, Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Select, TextInput } from "../../components/ui";

export function OperatorStudents() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, run } = usePlatformStore();
  const operator = currentUser(state);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    timeZone: "Asia/Jakarta",
    locale: "id-ID",
    program: "Mandarin Explorer",
    level: "初级 1",
    learningGoal: "",
    preferredTeacherId: ""
  });
  const students = state.students.filter((profile) => {
    const user = getUser(state, profile.userId);
    return !query || user?.name.toLowerCase().includes(query.toLowerCase()) || profile.level.toLowerCase().includes(query.toLowerCase()) || profile.tags.some((tag) => tag.includes(query));
  });

  function create() {
    const result = run(
      () => platform.createStudent({ ...form, actorId: operator.id }),
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
        eyebrow="Student directory"
        title={t("operator.studentDirectory")}
        description="维护学生身份、学习偏好、状态、预约历史和互动进度。"
        actions={<Button onClick={() => setCreateOpen(true)}><UserRoundPlus size={17} /> 新建学生</Button>}
      />

      <Card className="content-filter-bar">
        <div className="search-box wide">
          <Search size={17} />
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名、等级或标签" />
        </div>
        <Badge tone="purple"><UsersRound size={13} /> {students.length} 位学生</Badge>
      </Card>

      <div className="student-directory-grid">
        {students.map((profile) => {
          const user = getUser(state, profile.userId);
          const metrics = studentMetrics(state, profile.userId);
          if (!user) return null;
          return (
            <Card className="student-directory-card" key={profile.userId} interactive>
              <div className="student-card-head">
                <Avatar label={user.avatar} size="lg" tone="purple" />
                <div>
                  <h2>{user.name}</h2>
                  <p>{profile.level} · {profile.program}</p>
                </div>
                <Badge tone={user.status === "active" ? "mint" : "neutral"}>{user.status === "active" ? "活跃" : "暂停"}</Badge>
              </div>
              <div className="student-card-tags">
                {profile.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
              <div className="student-card-stats">
                <div><strong>{metrics.upcoming.length}</strong><small>待上课程</small></div>
                <div><strong>{metrics.completedSetIds.size}</strong><small>完成互动</small></div>
                <div><strong>{metrics.averageScore ? Math.round(metrics.averageScore) : "--"}</strong><small>平均分</small></div>
              </div>
              <Button variant="secondary" className="full-width" onClick={() => navigate(`/operator/students/${profile.userId}`)}>
                查看完整档案 <ChevronRight size={16} />
              </Button>
            </Card>
          );
        })}
        {students.length === 0 && <EmptyState title="没有匹配学生" />}
      </div>

      <Modal
        open={createOpen}
        title="新建学生档案"
        onClose={() => setCreateOpen(false)}
        footer={<div className="modal-footer-split"><small>使用虚构演示信息，不接入真实身份系统</small><div><Button variant="ghost" onClick={() => setCreateOpen(false)}>取消</Button><Button onClick={create}>创建档案</Button></div></div>}
      >
        <div className="editor-grid">
          <Field label="学生姓名" className="field-span-2"><TextInput value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder="例如：Nadia" /></Field>
          <Field label="联系方式"><TextInput value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} placeholder="+62 ..." /></Field>
          <Field label="界面语言"><Select value={form.locale} onChange={(event) => setForm((value) => ({ ...value, locale: event.target.value }))}><option value="id-ID"> Bahasa Indonesia</option><option value="zh-CN">简体中文</option></Select></Field>
          <Field label="时区"><Select value={form.timeZone} onChange={(event) => setForm((value) => ({ ...value, timeZone: event.target.value }))}><option value="Asia/Jakarta">GMT+7 雅加达</option><option value="Asia/Shanghai">GMT+8 上海</option><option value="Asia/Singapore">GMT+8 新加坡</option></Select></Field>
          <Field label="课程项目"><TextInput value={form.program} onChange={(event) => setForm((value) => ({ ...value, program: event.target.value }))} /></Field>
          <Field label="当前等级"><TextInput value={form.level} onChange={(event) => setForm((value) => ({ ...value, level: event.target.value }))} /></Field>
          <Field label="偏好教师"><Select value={form.preferredTeacherId} onChange={(event) => setForm((value) => ({ ...value, preferredTeacherId: event.target.value }))}><option value="">暂不指定</option>{state.users.filter((item) => item.role === "teacher").map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</Select></Field>
          <Field label="学习目标" className="field-span-2"><textarea className="input textarea" value={form.learningGoal} onChange={(event) => setForm((value) => ({ ...value, learningGoal: event.target.value }))} /></Field>
        </div>
      </Modal>
    </>
  );
}
