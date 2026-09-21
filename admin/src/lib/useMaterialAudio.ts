import { useEffect, useRef, useState } from "react";
import type { Material } from "../domain/types";

/**
 * 音频材料的试听控制：点击“播放”立即播放，再点一次暂停。
 * 同一时间只播放一条，播放结束后按钮自动回到“播放”。
 */
export function useMaterialAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  function toggle(material: Material) {
    const version = material.versions.find((item) => item.version === material.currentVersion) ?? material.versions.at(-1);
    const url = version?.url;
    if (!url) return;

    if (playingId === material.id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }

    audioRef.current?.pause();
    const audio = new Audio(url);
    audio.onended = () => setPlayingId((current) => (current === material.id ? null : current));
    audio.onerror = () => setPlayingId((current) => (current === material.id ? null : current));
    audioRef.current = audio;
    void audio.play().catch(() => setPlayingId((current) => (current === material.id ? null : current)));
    setPlayingId(material.id);
  }

  return { playingId, toggle };
}
