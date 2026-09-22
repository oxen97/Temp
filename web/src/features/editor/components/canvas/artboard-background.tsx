import { useEffect, useRef } from "react";

import {
  backgroundMediaStyle,
  backgroundMediaType,
  gradientCssForArtboard,
  hasGradientBackground,
  hasSolidBackground,
  mediaObjectFit,
} from "@/features/editor/lib/artboard-style";
import { colorWithOpacity } from "@/features/editor/lib/element-style";
import { type ArtboardSettings } from "@/features/editor/store/editor-store";

export function ArtboardBackground({
  artboard,
  playVideo = true,
}: {
  artboard: ArtboardSettings;
  playVideo?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaType = backgroundMediaType(artboard);
  const mediaSource =
    mediaType === "video"
      ? artboard.backgroundVideo
      : artboard.backgroundImage;
  const staticMediaPreview =
    artboard.backgroundMediaPreviewSource === mediaSource
      ? artboard.backgroundMediaPreview
      : undefined;
  const autoPlay = artboard.backgroundAutoPlay ?? true;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!autoPlay) {
      video.pause();
      return;
    }
    const playResult = video.play();
    playResult?.catch(() => {
      // Browsers can block unmuted autoplay; the selected mute state is preserved.
    });
  }, [autoPlay, artboard.backgroundVideo]);

  return (
    <div aria-hidden="true" className="artboard-background">
      {hasSolidBackground(artboard) ? (
        <span
          className="artboard-background-layer"
          style={{
            backgroundColor: colorWithOpacity(
              artboard.background,
              artboard.backgroundOpacity ?? 100,
            ),
          }}
        />
      ) : null}
      {hasGradientBackground(artboard) ? (
        <span
          className="artboard-background-layer"
          data-background-layer="gradient"
          style={{ backgroundImage: gradientCssForArtboard(artboard) }}
        />
      ) : null}
      {mediaType === "image" &&
      artboard.backgroundImage &&
      (playVideo || staticMediaPreview !== "") ? (
        <span
          className="artboard-background-layer"
          data-background-layer="image"
          style={{
            ...backgroundMediaStyle(artboard),
            backgroundImage: `url(${playVideo ? artboard.backgroundImage : (staticMediaPreview ?? artboard.backgroundImage)})`,
          }}
        />
      ) : null}
      {mediaType === "video" && artboard.backgroundVideo && playVideo ? (
        <span
          className="artboard-background-layer"
          style={{ opacity: (artboard.backgroundImageOpacity ?? 100) / 100 }}
        >
          <video
            autoPlay={autoPlay}
            loop={artboard.backgroundLoop ?? true}
            muted={artboard.backgroundMute ?? true}
            playsInline
            ref={videoRef}
            src={artboard.backgroundVideo}
            style={{ objectFit: mediaObjectFit(artboard) }}
          />
        </span>
      ) : null}
      {mediaType === "video" &&
      artboard.backgroundVideo &&
      !playVideo &&
      staticMediaPreview ? (
        <span
          className="artboard-background-layer"
          data-background-layer="video-poster"
          style={{
            ...backgroundMediaStyle(artboard),
            backgroundImage: `url(${staticMediaPreview})`,
          }}
        />
      ) : null}
    </div>
  );
}
