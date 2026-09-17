import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Circle } from "lucide-react";
import { currentUser } from "../lib/domain";
import { relativeTime } from "../lib/format";
import { platform } from "../lib/platform";
import { usePlatformStore } from "../store/usePlatformStore";
import { Button, Card, EmptyState, PageHeader } from "../components/ui";

export function NotificationsPage() {
  const navigate = useNavigate();
  const { state, refresh, run } = usePlatformStore();
  const user = currentUser(state);
  const notices = state.notifications
    .filter((notice) => notice.userId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const locale = state.ui.language;

  return (
    <>
      <PageHeader
        eyebrow="Inbox"
        title="消息中心"
        description={`${notices.filter((notice) => !notice.read).length} 条未读消息`}
        actions={
          <Button
            variant="secondary"
            onClick={() => run(() => platform.markAllNotificationsRead(user.id), "已全部标记为已读")}
          >
            <CheckCheck size={17} /> 全部已读
          </Button>
        }
      />
      <div className="notification-list">
        {notices.length === 0 && <EmptyState title="暂无消息" description="预约、候补和内容更新会显示在这里。" />}
        {notices.map((notice) => (
          <Card className={`notification-card ${notice.read ? "" : "unread"}`} key={notice.id}>
            <span className="notification-icon">
              <Bell size={19} />
            </span>
            <div className="notification-copy">
              <div>
                <strong>{notice.title}</strong>
                {!notice.read && <Circle size={8} fill="currentColor" />}
              </div>
              <p>{notice.body}</p>
              <small>{relativeTime(notice.createdAt, locale)}</small>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                run(() => platform.markNotificationRead(notice.id));
                navigate(notice.link);
              }}
            >
              查看
            </Button>
          </Card>
        ))}
      </div>
    </>
  );
}
