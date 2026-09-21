import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { AppShell } from "./components/AppShell";
import { currentUser } from "./lib/domain";
import { FEATURES } from "./config/features";
import { roleHome, usePlatformStore } from "./store/usePlatformStore";
import type { Role } from "./domain/types";
import { LoginPage } from "./pages/LoginPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { StudentDashboard } from "./pages/student/StudentDashboard";
import { StudentBook } from "./pages/student/StudentBook";
import { StudentSchedule } from "./pages/student/StudentSchedule";
import { StudentLesson } from "./pages/student/StudentLesson";
import { StudentResults } from "./pages/student/StudentResults";
import { TeacherDashboard } from "./pages/teacher/TeacherDashboard";
import { TeacherLiveClass } from "./pages/teacher/TeacherLiveClass";
import { TeacherSchedule } from "./pages/teacher/TeacherSchedule";
import { TeacherSessionDetail } from "./pages/teacher/TeacherSessionDetail";
import { TeacherInteractions } from "./pages/teacher/TeacherInteractions";
import { TeacherMaterials } from "./pages/teacher/TeacherMaterials";
import { TeacherResults } from "./pages/teacher/TeacherResults";
import { OperatorDashboard } from "./pages/operator/OperatorDashboard";
import { CourseCatalog } from "./pages/operator/CourseCatalog";
import { OperatorScheduling } from "./pages/operator/OperatorScheduling";
import { OperatorSessionDetail } from "./pages/operator/OperatorSessionDetail";
import { OperatorStudents } from "./pages/operator/OperatorStudents";
import { OperatorStudentDetail } from "./pages/operator/OperatorStudentDetail";
import { OperatorGovernance } from "./pages/operator/OperatorGovernance";
import { OperatorAudit } from "./pages/operator/OperatorAudit";

function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const state = usePlatformStore((store) => store.state);
  const user = currentUser(state);
  const location = useLocation();
  if (user.role !== role) {
    return <Navigate to={roleHome(user.role)} replace state={{ from: location.pathname }} />;
  }
  return children;
}

function IndexRedirect() {
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<IndexRedirect />} />
        <Route element={<AppShell />}>
          <Route path="/notifications" element={<NotificationsPage />} />

          <Route path="/student" element={<RoleGate role="student"><Outlet /></RoleGate>}>
            <Route index element={<StudentDashboard />} />
            <Route path="book" element={<StudentBook />} />
            <Route path="schedule" element={<StudentSchedule />} />
            <Route path="lesson/:lessonId" element={<StudentLesson />} />
            <Route path="results" element={FEATURES.studentResults ? <StudentResults /> : <Navigate to="/student" replace />} />
          </Route>

          <Route path="/teacher" element={<RoleGate role="teacher"><Outlet /></RoleGate>}>
            <Route index element={<TeacherDashboard />} />
            <Route path="live/:sessionId" element={<TeacherLiveClass />} />
            <Route path="schedule" element={<TeacherSchedule />} />
            <Route path="session/:sessionId" element={<TeacherSessionDetail />} />
            <Route path="interactions" element={<TeacherInteractions />} />
            <Route path="materials" element={<TeacherMaterials />} />
            <Route path="results" element={<TeacherResults />} />
          </Route>

          <Route path="/operator" element={<RoleGate role="operator"><Outlet /></RoleGate>}>
            <Route index element={<OperatorDashboard />} />
            <Route path="catalog" element={<CourseCatalog />} />
            <Route path="scheduling" element={<OperatorScheduling />} />
            <Route path="sessions/:sessionId" element={<OperatorSessionDetail />} />
            <Route path="students" element={<OperatorStudents />} />
            <Route path="students/:studentId" element={<OperatorStudentDetail />} />
            <Route path="governance" element={<OperatorGovernance />} />
            <Route path="audit" element={<OperatorAudit />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
}
