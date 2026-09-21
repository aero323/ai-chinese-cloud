import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarDays,
  CalendarOff,
  ChevronLeft,
  ClipboardList,
  FolderTree,
  GraduationCap,
  Home,
  LibraryBig,
  ListRestart,
  Menu,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  X
} from "lucide-react";
import { platform } from "../lib/platform";
import { FEATURES } from "../config/features";
import { roleHome, usePlatformStore } from "../store/usePlatformStore";
import { currentUser } from "../lib/domain";
import { setTeacherDemoMode, useTeacherDemoMode } from "../lib/teacherLiveDemo";
import { timeZoneLabel } from "../lib/format";
import type { Role } from "../domain/types";
import { Avatar, Badge, Button, Select } from "./ui";

const navIcons = {
  dashboard: Home,
  booking: Sparkles,
  schedule: CalendarDays,
  results: BarChart3,
  interactionDesign: SlidersHorizontal,
  materials: LibraryBig,
  catalog: FolderTree,
  scheduling: ClipboardList,
  students: Users,
  governance: ShieldCheck,
  audit: ListRestart,
  notifications: Bell
};

function navItems(role: Role, t: (key: string) => string) {
  if (role === "student") {
    return [
      { to: "/student", end: true, key: "dashboard", label: t("nav.dashboard") },
      { to: "/student/book", key: "booking", label: t("nav.booking") },
      { to: "/student/schedule", key: "schedule", label: t("nav.schedule") },
      ...(FEATURES.studentResults ? [{ to: "/student/results", key: "results", label: t("nav.results") }] : []),
      { to: "/notifications", key: "dashboard", label: t("common.notifications") }
    ];
  }
  if (role === "teacher") {
    return [
      { to: "/teacher", end: true, key: "dashboard", label: t("nav.dashboard") },
      { to: "/teacher/schedule", key: "schedule", label: t("nav.schedule") },
      { to: "/teacher/interactions", key: "interactionDesign", label: t("nav.interactionDesign") },
      { to: "/teacher/materials", key: "materials", label: t("nav.materials") },
      { to: "/teacher/results", key: "results", label: t("nav.results") },
      { to: "/notifications", key: "dashboard", label: t("common.notifications") }
    ];
  }
  return [
    { to: "/operator", end: true, key: "dashboard", label: t("nav.dashboard") },
    { to: "/operator/catalog", key: "catalog", label: t("nav.catalog") },
    { to: "/operator/scheduling", key: "scheduling", label: t("nav.scheduling") },
    { to: "/operator/students", key: "students", label: t("nav.students") },
    { to: "/operator/governance", key: "governance", label: t("nav.governance") },
    { to: "/operator/audit", key: "audit", label: t("nav.audit") },
    { to: "/notifications", key: "dashboard", label: t("common.notifications") }
  ];
}

export function AppShell() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { state, refresh, switchUser, reset } = usePlatformStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [teacherDemoMode] = useTeacherDemoMode();
  const user = currentUser(state);
  const role = user.role;
  const items = navItems(role, t);
  const unread = state.notifications.filter((notice) => notice.userId === user.id && !notice.read).length;
  const activeUserOptions = useMemo(
    () => [...state.users].sort((a, b) => a.role.localeCompare(b.role)),
    [state.users]
  );

  useEffect(() => {
    const unsubscribe = platform.subscribe((nextState) => refresh(nextState));
    return unsubscribe;
  }, [refresh]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (state.ui.language !== i18n.language) void i18n.changeLanguage(state.ui.language);
  }, [i18n, state.ui.language]);

  function changeUser(userId: string) {
    const next = state.users.find((item) => item.id === userId);
    if (!next) return;
    switchUser(userId);
    navigate(roleHome(next.role));
  }

  return (
    <div className={`admin-layout ${state.ui.sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">
            <GraduationCap size={22} />
          </span>
          <div>
            <strong>{t("common.appName")}</strong>
            <small>{t("common.adminName")}</small>
          </div>
          {mobileOpen && (
            <Button className="mobile-close" size="icon" variant="ghost" aria-label="关闭导航" onClick={() => setMobileOpen(false)}>
              <X size={18} />
            </Button>
          )}
        </div>

        <div className="role-summary">
          <Avatar label={user.avatar} tone={role === "teacher" ? "orange" : role === "operator" ? "blue" : "purple"} />
          <div>
            <strong>{user.name}</strong>
            <small>{t(`common.${role}`)}</small>
          </div>
          <Badge tone={role === "teacher" ? "orange" : role === "operator" ? "blue" : "purple"}>{t(`common.${role}`)}</Badge>
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => {
            const Icon = navIcons[item.key as keyof typeof navIcons] ?? Home;
            const isNotification = item.to === "/notifications";
            return (
              <NavLink key={`${item.to}-${item.label}`} to={item.to} end={item.end}>
                <Icon size={18} />
                <span>{item.label}</span>
                {isNotification && unread > 0 && <b className="nav-count">{unread}</b>}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className="collapse-button"
            onClick={() => {
              platform.updatePreferences({ sidebarCollapsed: !state.ui.sidebarCollapsed });
              refresh();
            }}
          >
            <ChevronLeft size={16} />
            <span>收起侧栏</span>
          </button>
        </div>
      </aside>

      {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="关闭导航" />}

      <main className="workspace">
        <header className="topbar">
          <Button className="mobile-menu" size="icon" variant="ghost" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </Button>

          <div className="demo-switcher">
            <span className="demo-dot" />
            <Select value={user.id} onChange={(event) => changeUser(event.target.value)} aria-label={t("common.switchRole")}>
              {activeUserOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} · {t(`common.${option.role}`)}
                </option>
              ))}
            </Select>
          </div>

          <div className="topbar-spacer" />

          {role === "teacher" && (
            <div className="teacher-demo-mode" role="group" aria-label="教师端演示数据">
              <span className="teacher-demo-mode-label">演示数据</span>
              <button className={teacherDemoMode === "live" ? "active live" : ""} onClick={() => setTeacherDemoMode("live")} type="button">
                <Radio size={14} /> 有课
              </button>
              <button className={teacherDemoMode === "empty" ? "active empty" : ""} onClick={() => setTeacherDemoMode("empty")} type="button">
                <CalendarOff size={14} /> 没课
              </button>
            </div>
          )}

          <Select
            className="timezone-select"
            value={state.ui.language}
            onChange={(event) => {
              const language = event.target.value as "zh-CN" | "id-ID";
              platform.updatePreferences({ language });
              refresh();
              void i18n.changeLanguage(language);
            }}
            aria-label={t("common.language")}
          >
            <option value="zh-CN">中文</option>
            <option value="id-ID">Bahasa Indonesia</option>
          </Select>

          <button className="timezone-chip" title={t("common.timezone")}>
            {timeZoneLabel(user.timeZone)}
          </button>

          <Button size="icon" variant="ghost" className="notification-button" onClick={() => navigate("/notifications")}>
            <Bell size={19} />
            {unread > 0 && <span className="notification-dot">{unread}</span>}
          </Button>

          <Button
            variant="soft"
            size="sm"
            onClick={() => {
              if (window.confirm("确定重置全部演示数据吗？")) reset();
            }}
          >
            <BookOpenCheck size={16} />
            {t("common.resetDemo")}
          </Button>
        </header>

        <div className="workspace-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
