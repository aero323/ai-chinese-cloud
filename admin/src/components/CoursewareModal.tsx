import { BookOpen, ExternalLink } from "lucide-react";
import { Badge, Button, Modal } from "./ui";

export function CoursewareModal({
  open,
  title,
  url,
  badgeLabel = "互动 HTML 课件",
  note = "支持词汇点读、选择题和句子排序，可直接在后台内播放。",
  onClose,
  onOpenLesson
}: {
  open: boolean;
  title: string;
  url?: string;
  badgeLabel?: string;
  note?: string;
  onClose: () => void;
  onOpenLesson?: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose} width="1180px">
      {url ? (
        <div className="courseware-player-shell">
          <div className="courseware-player-toolbar">
            <div>
              <Badge tone="purple">{badgeLabel}</Badge>
              <span>{note}</span>
            </div>
            <div className="courseware-player-actions">
              {onOpenLesson && (
                <Button size="sm" variant="ghost" onClick={onOpenLesson}>
                  <BookOpen size={15} /> 打开学习页
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>
                <ExternalLink size={15} /> 新窗口打开
              </Button>
            </div>
          </div>
          <iframe className="courseware-frame" src={url} title={title} />
        </div>
      ) : (
        <p className="muted-copy">这节课暂时没有可播放的课件。</p>
      )}
    </Modal>
  );
}
