import type { ReactNode } from "react";
import { Download, FileAudio, FileImage, FileText, FileVideo, Link2, PlayCircle, Presentation } from "lucide-react";
import type { Material } from "../domain/types";
import { Badge, Button } from "./ui";

export function MaterialCard({ material, actions, onDownload, onOpen }: { material: Material; actions?: ReactNode; onDownload?: () => void; onOpen?: () => void }) {
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
  return (
    <article className="material-card">
      <span className={`material-icon material-${material.fileType}`}>
        <Icon size={21} />
      </span>
      <div className="material-copy">
        <div className="material-title-row">
          <strong>{material.title}</strong>
          <Badge tone={material.status === "published" ? "mint" : "danger"}>
            {material.status === "published" ? "已发布" : "已下架"}
          </Badge>
        </div>
        <p>{material.description}</p>
        <div className="material-meta">
          <span>v{material.currentVersion}</span>
          <span>{current?.sizeLabel ?? "外链"}</span>
          <span>{material.downloadCount} 次下载</span>
        </div>
      </div>
      <div className="material-actions">
        {material.kind === "courseware" && onOpen ? (
          <>
            <Button size="sm" variant="primary" onClick={onOpen}>
              <PlayCircle size={16} /> 播放课件
            </Button>
            {current?.url && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onDownload?.();
                  const anchor = document.createElement("a");
                  anchor.href = current.url;
                  anchor.download = current.fileName ?? material.title;
                  anchor.click();
                }}
              >
                <Download size={15} /> 下载
              </Button>
            )}
          </>
        ) : material.kind === "file" || current?.url ? (
          <Button
            size="sm"
            variant="soft"
            onClick={() => {
              onDownload?.();
              const url = current?.url;
              if (url) {
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = current?.fileName ?? material.title;
                anchor.click();
              }
            }}
          >
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
