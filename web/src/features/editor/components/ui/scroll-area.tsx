import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { clamp } from "@/features/editor/lib/geometry";

export function ScrollArea({
  children,
  className,
}: {
  children: ReactNode;
  className: "asset-grid" | "layer-list" | "scene-list";
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    renderScale: number;
    startTop: number;
    startY: number;
    travel: number;
    scrollRange: number;
  } | null>(null);
  const [metrics, setMetrics] = useState({
    clientHeight: 0,
    scrollHeight: 0,
    scrollTop: 0,
  });

  const measure = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setMetrics({
      clientHeight: viewport.clientHeight,
      scrollHeight: viewport.scrollHeight,
      scrollTop: viewport.scrollTop,
    });
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    measure();
    const handleScroll = () => measure();
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    resizeObserver?.observe(viewport);
    const mutationObserver =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(measure);
    mutationObserver?.observe(viewport, { childList: true, subtree: true });

    return () => {
      viewport.removeEventListener("scroll", handleScroll);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [children]);

  const hasOverflow = metrics.scrollHeight > metrics.clientHeight + 1;
  const hasInsetTrack =
    className === "asset-grid" || className === "scene-list";
  const compactScrollbarTrack = hasInsetTrack && metrics.clientHeight < 60;
  const scrollbarInset = hasInsetTrack && !compactScrollbarTrack ? 20 : 0;
  const scrollbarTrackHeight = Math.max(
    0,
    metrics.clientHeight - scrollbarInset,
  );
  const thumbHeight = hasOverflow
    ? scrollbarTrackHeight > 0
      ? Math.min(
          scrollbarTrackHeight,
          Math.max(
            28,
            (scrollbarTrackHeight * metrics.clientHeight) /
              metrics.scrollHeight,
          ),
        )
      : 0
    : scrollbarTrackHeight;
  const travel = Math.max(0, scrollbarTrackHeight - thumbHeight);
  const scrollRange = Math.max(1, metrics.scrollHeight - metrics.clientHeight);
  const thumbTop = hasOverflow ? travel * (metrics.scrollTop / scrollRange) : 0;

  const handleThumbPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport || !hasOverflow) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const renderedHeight = viewport.getBoundingClientRect().height;
    const renderScale =
      viewport.clientHeight > 0 && Number.isFinite(renderedHeight)
        ? renderedHeight / viewport.clientHeight
        : 1;
    dragRef.current = {
      pointerId: event.pointerId,
      renderScale: renderScale > 0 ? renderScale : 1,
      scrollRange,
      startTop: thumbTop,
      startY: event.clientY,
      travel,
    };
  };

  const handleThumbPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag || !viewport || drag.pointerId !== event.pointerId) return;
    const nextTop = clamp(
      drag.startTop + (event.clientY - drag.startY) / drag.renderScale,
      0,
      drag.travel,
    );
    viewport.scrollTop =
      (nextTop / Math.max(1, drag.travel)) * drag.scrollRange;
  };

  const handleThumbPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  return (
    <div className={`scroll-area ${className}-scroll-area`}>
      <div className={`scroll-viewport ${className}`} ref={viewportRef}>
        {children}
      </div>
      {hasOverflow ? (
        <div
          aria-hidden="true"
          className={
            compactScrollbarTrack
              ? "custom-scrollbar is-compact"
              : "custom-scrollbar"
          }
          data-scrollbar-for={className}
        >
          <div
            className="custom-scrollbar-thumb"
            onPointerCancel={handleThumbPointerUp}
            onPointerDown={handleThumbPointerDown}
            onPointerMove={handleThumbPointerMove}
            onPointerUp={handleThumbPointerUp}
            style={{
              height: thumbHeight,
              minHeight: thumbHeight,
              transform: `translateY(${thumbTop}px)`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
