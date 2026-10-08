import type { ReactNode } from "react";
import { Download, Eye, FileAudio, FileImage, FileText, FileVideo, Link2, Pause, Play, PlayCircle, Presentation } from "lucide-react";
import type { Material } from "../domain/types";
import { Badge, Button } from "./ui";

export function MaterialCard({
  material,
  actions,
  onDownload,
  onOpen,
  onPlay,
  onView,
  playing = false,
  showVersion = false
}: {
  material: Material;
  actions?: ReactNode;
  onDownload?: () => void;
  onOpen?: () => void;
  onPlay?: () => void;
  /** 传入后卡片主操作为“查看详情”，下载退化成右侧的 icon 按钮。 */
  onView?: () => void;
  playing?: boolean;
  showVersion?: boolean;
}) {
  const Icon =
    material.fileType === "pptx"
      ? Presentation
      : material.fileType === "wav" || material.fileType === "mp3"
        ? FileAudio
        : material.fileType === "video"
          ? FileVideo
          : material.fileType === "image" || material.fileType === "png"
            ? FileImage
            : material.kind === "link"
              ? Link2
              : FileText;
  const current = material.versions.find((version) => version.version === material.currentVersion) ?? material.versions.at(-1);
  const isAudio = material.fileType === "wav" || material.fileType === "mp3";
  const canDownload = Boolean(current?.url) || material.kind === "file";

  function downloadMaterial() {
    onDownload?.();
    const url = current?.url;
    if (!url) return;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = current?.fileName ?? material.title;
    anchor.click();
  }

  return (
    <article className="material-card">
      <span className={`material-icon material-${material.fileType}`}>
        <Icon size={21} />
      </span>
      <div className="material-copy">
        <div className="material-title-row">
          <strong>{material.title}</strong>
          {material.status !== "published" && <Badge tone="danger">已下架</Badge>}
        </div>
        <p>{material.description}</p>
        <div className="material-meta">
          {showVersion && <span>v{material.currentVersion}</span>}
          <span>{current?.sizeLabel ?? "外链"}</span>
        </div>
      </div>
      <div className="material-actions">
        {isAudio && onPlay && (
          <Button size="sm" variant="ghost" onClick={onPlay}>
            {playing ? <Pause size={15} /> : <Play size={15} />} {playing ? "暂停" : "播放"}
          </Button>
        )}
        {onView ? (
          <>
            <Button size="sm" variant="soft" onClick={onView}>
              <Eye size={16} /> 查看
            </Button>
            {canDownload ? (
              <Button
                size="sm"
                variant="ghost"
                className="material-icon-button"
                aria-label={`下载 ${material.title}`}
                title="下载"
                onClick={downloadMaterial}
              >
                <Download size={16} />
              </Button>
            ) : material.externalUrl ? (
              <Button
                size="sm"
                variant="ghost"
                className="material-icon-button"
                aria-label={`打开链接 ${material.title}`}
                title="打开链接"
                onClick={() => window.open(material.externalUrl, "_blank", "noopener,noreferrer")}
              >
                <Link2 size={16} />
              </Button>
            ) : null}
          </>
        ) : material.kind === "courseware" && onOpen ? (
          <>
            <Button size="sm" variant="primary" onClick={onOpen}>
              <PlayCircle size={16} /> 播放课件
            </Button>
            {current?.url && (
              <Button size="sm" variant="ghost" onClick={downloadMaterial}>
                <Download size={15} /> 下载
              </Button>
            )}
          </>
        ) : material.kind === "file" || current?.url ? (
          <Button size="sm" variant="soft" onClick={downloadMaterial}>
            <Download size={16} /> 下载
          </Button>
        ) : (
          <Button size="sm" variant="soft" onClick={() => window.open(material.externalUrl, "_blank", "noopener,noreferrer")}>
            <Link2 size={16} /> 打开
          </Button>
        )}
        {actions}
      </div>
    </article>
  );
}
