import { useEffect, useMemo, useState } from "react";
import { Building2, Pencil, Plus, UserMinus, UserPlus, UsersRound } from "lucide-react";
import type { PlatformUser, School, SchoolRole } from "../../domain/types";
import { Avatar, Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Select, TextInput } from "../../components/ui";
import { currentUser, getUser } from "../../lib/domain";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";
import { GradeRuleSettings } from "./OperatorStudents";

export function OperatorSchools() {
  const { state, run } = usePlatformStore();
  const operator = currentUser(state);
  const [editor, setEditor] = useState<School | "new" | null>(null);
  const [memberSchoolId, setMemberSchoolId] = useState("");
  const [policySchoolId, setPolicySchoolId] = useState("");

  const selectedPolicySchool = state.schools.find((item) => item.id === policySchoolId) ?? null;

  return (
    <>
      <PageHeader
        eyebrow="School directory"
        title="学校与成员"
        description="维护学校主数据、学校成员关系以及平台默认与各校成绩规则。"
        actions={<Button onClick={() => setEditor("new")}><Plus size={17} /> 新建学校</Button>}
      />

      <div className="school-management-grid">
        {state.schools.map((school) => {
          const memberships = state.schoolMemberships.filter((item) => item.schoolId === school.id && item.status === "active");
          const classCount = state.classes.filter((item) => item.schoolId === school.id).length;
          const policyCount = state.gradePolicies.filter((item) => item.schoolId === school.id).length;
          return (
            <Card className="school-management-card" key={school.id}>
              <div className="school-card-head">
                <span className="school-mark"><Building2 size={20} /></span>
                <div><h2>{school.name}</h2><p>{school.code} · {school.status === "active" ? "进行中" : "已归档"}</p></div>
                <Badge tone={policyCount ? "mint" : "neutral"}>{policyCount ? "已有本校规则" : "使用平台默认"}</Badge>
              </div>
              <div className="class-management-metrics">
                <div><strong>{memberships.filter((item) => item.role === "teacher").length}</strong><small>教师</small></div>
                <div><strong>{memberships.filter((item) => item.role === "student").length}</strong><small>学生</small></div>
                <div><strong>{classCount}</strong><small>班级</small></div>
              </div>
              <div className="class-management-actions">
                <Button variant="ghost" onClick={() => setEditor(school)}><Pencil size={15} /> 编辑学校</Button>
                <Button variant="secondary" onClick={() => setMemberSchoolId(school.id)}><UsersRound size={15} /> 管理成员</Button>
                <Button variant="soft" onClick={() => setPolicySchoolId(school.id)}>成绩规则</Button>
              </div>
            </Card>
          );
        })}
      </div>
      {state.schools.length === 0 && <EmptyState title="暂无学校" action={<Button onClick={() => setEditor("new")}>新建学校</Button>} />}

      <Card className="operator-subsection">
        <div className="card-heading"><div><span className="eyebrow">Platform default</span><h2>平台默认成绩规则</h2><p>未设置本校规则的学校自动使用这里的最新生效版本。</p></div></div>
        <GradeRuleSettings />
      </Card>

      {selectedPolicySchool && (
        <Modal open title={`${selectedPolicySchool.name} · 本校成绩规则`} onClose={() => setPolicySchoolId("")} width="980px">
          <GradeRuleSettings academic schoolId={selectedPolicySchool.id} />
        </Modal>
      )}

      <SchoolEditorModal item={editor} onClose={() => setEditor(null)} />
      {memberSchoolId && <SchoolMembersModal schoolId={memberSchoolId} onClose={() => setMemberSchoolId("")} />}
    </>
  );
}

function SchoolEditorModal({ item, onClose }: { item: School | "new" | null; onClose: () => void }) {
  const { state, run } = usePlatformStore();
  const operator = currentUser(state);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<School["status"]>("active");

  useEffect(() => {
    if (!item) return;
    setName(item === "new" ? "" : item.name);
    setCode(item === "new" ? "" : item.code);
    setStatus(item === "new" ? "active" : item.status);
  }, [item]);

  if (!item) return null;
  const currentItem = item;
  function save() {
    const result = currentItem === "new"
      ? run(() => platform.createSchool({ name, code, actorId: operator.id }), "学校已创建")
      : run(() => platform.updateSchool({ schoolId: currentItem.id, patch: { name, code, status }, actorId: operator.id }), "学校已更新");
    if (result.ok) onClose();
  }

  return (
    <Modal open title={item === "new" ? "新建学校" : "编辑学校"} onClose={onClose} footer={<div className="modal-footer-split"><small>学校编码用于内部识别，建议保持稳定。</small><div><Button variant="ghost" onClick={onClose}>取消</Button><Button disabled={!name.trim() || !code.trim()} onClick={save}>保存学校</Button></div></div>}>
      <div className="editor-grid">
        <Field label="学校名称" className="field-span-2"><TextInput value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="学校编码"><TextInput value={code} onChange={(event) => setCode(event.target.value)} /></Field>
        <Field label="状态"><Select value={status} onChange={(event) => setStatus(event.target.value as School["status"])}><option value="active">进行中</option><option value="archived">已归档</option></Select></Field>
      </div>
    </Modal>
  );
}

function SchoolMembersModal({ schoolId, onClose }: { schoolId: string; onClose: () => void }) {
  const { state, run } = usePlatformStore();
  const operator = currentUser(state);
  const school = state.schools.find((item) => item.id === schoolId);
  const memberships = state.schoolMemberships.filter((item) => item.schoolId === schoolId && item.status === "active");
  const [userId, setUserId] = useState("");
  const available = state.users.filter((user) => {
    if (!["student", "teacher", "academic"].includes(user.role)) return false;
    return !memberships.some((item) => item.userId === user.id && item.role === user.role);
  });

  function addMember() {
    const user = getUser(state, userId);
    if (!user) return;
    const result = run(
      () => platform.saveSchoolMembership({ schoolId, userId: user.id, role: user.role as SchoolRole, status: "active", actorId: operator.id }),
      "成员已加入学校"
    );
    if (result.ok) setUserId("");
  }

  function removeMember(member: PlatformUser) {
    run(
      () => platform.saveSchoolMembership({ schoolId, userId: member.id, role: member.role as SchoolRole, status: "left", actorId: operator.id }),
      "成员已移出学校"
    );
  }

  return (
    <Modal open title={`${school?.name ?? "学校"} · 成员管理`} onClose={onClose} width="820px" footer={<div className="modal-footer-split"><small>移除成员不会删除账号，也不会改写已产生的历史成绩。</small><div><Button variant="ghost" onClick={onClose}>完成</Button></div></div>}>
      <div className="school-member-add">
        <Select value={userId} onChange={(event) => setUserId(event.target.value)}>
          <option value="">选择要加入的用户</option>
          {available.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}
        </Select>
        <Button disabled={!userId} onClick={addMember}><UserPlus size={16} /> 加入学校</Button>
      </div>
      <div className="class-member-list">
        {memberships.map((membership) => {
          const member = getUser(state, membership.userId);
          if (!member) return null;
          return (
            <article className="class-member-row is-selected" key={membership.id}>
              <Avatar label={member.avatar} size="sm" tone={member.role === "teacher" ? "orange" : member.role === "academic" ? "mint" : "purple"} />
              <span><strong>{member.name}</strong><small>{membership.role} · 加入于 {membership.joinedAt.slice(0, 10)}</small></span>
              <Button size="sm" variant="ghost" onClick={() => removeMember(member)}><UserMinus size={14} /> 移出</Button>
            </article>
          );
        })}
      </div>
      {memberships.length === 0 && <EmptyState title="暂无成员" />}
    </Modal>
  );
}
