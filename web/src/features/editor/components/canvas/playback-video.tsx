import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from "react";

/**
 * A looping, muted artwork video that decodes only while someone can see it.
 *
 * `paused` is the caller's visibility knowledge (a closed dialog layer, or
 * content behind an open modal backdrop). The element also pauses itself while
 * it has no visible box in the viewport (display: none, scrolled away), so no
 * hidden video keeps a decoder busy. Playback resumes where it stopped.
 */
export const PlaybackVideo = forwardRef<
  HTMLVideoElement,
  {
    src?: string;
    paused?: boolean;
    className?: string;
    crossOrigin?: "anonymous";
    style?: CSSProperties;
  }
>(function PlaybackVideo(
  { src, paused = false, className = "video-shape", crossOrigin, style },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => videoRef.current!, []);
  const [inView, setInView] = useState(true);
  const shouldPlay = !paused && inView;
  const mountedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) setInView(entry.isIntersecting);
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // `autoPlay` covers the first state; later changes are explicit.
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (shouldPlay) {
      video.play()?.catch(() => {
        /* Autoplay can be refused; the element stays usable. */
      });
    } else if (!video.paused) {
      video.pause();
    }
  }, [shouldPlay]);

  return (
    <video
      ref={videoRef}
      aria-hidden="true"
      autoPlay={shouldPlay}
      className={className}
      crossOrigin={crossOrigin}
      data-playback={shouldPlay ? "playing" : "paused"}
      loop
      muted
      playsInline
      preload="auto"
      src={src}
      style={style}
    />
  );
});
