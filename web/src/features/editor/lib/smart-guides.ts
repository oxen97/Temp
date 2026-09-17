import {
  type DistanceMeasurement,
  type EditorGuide,
  type ElementRect,
  type Point,
  type SmartGuide,
  type SnapOption,
} from "@/features/editor/lib/editor-types";
import { centerOf, offsetRect } from "@/features/editor/lib/geometry";

export function chooseSnapOption(options: SnapOption[], threshold = 8) {
  return options
    .filter((option) => Math.abs(option.adjust) <= threshold)
    .sort((a, b) => Math.abs(a.adjust) - Math.abs(b.adjust))[0];
}

export function alignmentOptions(
  axis: "x" | "y",
  proposed: ElementRect,
  fixed: ElementRect[],
  artboard: { width: number; height: number },
): SnapOption[] {
  const isX = axis === "x";
  const size = isX ? proposed.width : proposed.height;
  const start = isX ? proposed.x : proposed.y;
  const anchors = [start, start + size / 2, start + size];
  const boardSize = isX ? artboard.width : artboard.height;
  const boardRect: ElementRect = {
    x: 0,
    y: 0,
    width: artboard.width,
    height: artboard.height,
  };
  const targets = [0, boardSize / 2, boardSize].map((value) => ({
    rect: boardRect,
    value,
  }));
  for (const rect of fixed) {
    const rectStart = isX ? rect.x : rect.y;
    const rectSize = isX ? rect.width : rect.height;
    targets.push(
      { rect, value: rectStart },
      { rect, value: rectStart + rectSize / 2 },
      { rect, value: rectStart + rectSize },
    );
  }

  return targets.flatMap(({ rect, value: target }) =>
    anchors.map((source, index) => {
      const guide: SmartGuide = isX
        ? {
            axis: "vertical",
            coordinate: target,
            end:
              rect === boardRect
                ? artboard.height
                : Math.max(proposed.y + proposed.height, rect.y + rect.height) +
                  12,
            start: rect === boardRect ? 0 : Math.min(proposed.y, rect.y) - 12,
            anchor: rect === boardRect ? undefined : rect,
          }
        : {
            axis: "horizontal",
            coordinate: target,
            end:
              rect === boardRect
                ? artboard.width
                : Math.max(proposed.x + proposed.width, rect.x + rect.width) +
                  12,
            start: rect === boardRect ? 0 : Math.min(proposed.x, rect.x) - 12,
            anchor: rect === boardRect ? undefined : rect,
          };
      return {
        adjust: target - source,
        guide,
        sourceIndex: index,
      };
    }),
  );
}

export function rebaseGuide(
  guide: SmartGuide,
  subject: ElementRect,
): SmartGuide {
  if (!guide.anchor) return guide;
  if (guide.axis === "vertical") {
    return {
      ...guide,
      end:
        Math.max(
          subject.y + subject.height,
          guide.anchor.y + guide.anchor.height,
        ) + 12,
      start: Math.min(subject.y, guide.anchor.y) - 12,
    };
  }
  return {
    ...guide,
    end:
      Math.max(subject.x + subject.width, guide.anchor.x + guide.anchor.width) +
      12,
    start: Math.min(subject.x, guide.anchor.x) - 12,
  };
}

export function spacingOptions(
  axis: "x" | "y",
  proposed: ElementRect,
  fixed: ElementRect[],
): SnapOption[] {
  if (fixed.length < 2) return [];
  const isX = axis === "x";
  const aligned = fixed
    .filter((rect) =>
      isX
        ? Math.abs(centerOf(rect, "y") - centerOf(proposed, "y")) <= 8
        : Math.abs(centerOf(rect, "x") - centerOf(proposed, "x")) <= 8,
    )
    .sort((a, b) => (isX ? a.x - b.x : a.y - b.y));
  const options: SnapOption[] = [];

  for (let index = 0; index < aligned.length - 1; index += 1) {
    const first = aligned[index];
    const second = aligned[index + 1];
    const firstEnd = isX ? first.x + first.width : first.y + first.height;
    const secondStart = isX ? second.x : second.y;
    const gap = secondStart - firstEnd;
    if (gap < 0) continue;
    const size = isX ? proposed.width : proposed.height;
    const between = firstEnd + (gap - size) / 2;
    const before = (isX ? first.x : first.y) - gap - size;
    const after =
      (isX ? second.x + second.width : second.y + second.height) + gap;
    const positions = [before, ...(gap >= size ? [between] : []), after];
    for (const position of positions) {
      const guide: SmartGuide = isX
        ? {
            axis: "horizontal",
            coordinate: centerOf(proposed, "y"),
            end: second.x + second.width,
            start: first.x,
          }
        : {
            axis: "vertical",
            coordinate: centerOf(proposed, "x"),
            end: second.y + second.height,
            start: first.y,
          };
      options.push({
        adjust: position - (isX ? proposed.x : proposed.y),
        guide,
        spacingPair: [first, second],
      });
    }
  }
  return options;
}

export function buildSpacingMeasurements(
  axis: "x" | "y",
  rects: ElementRect[],
): DistanceMeasurement[] {
  if (rects.length < 2) return [];
  const isX = axis === "x";
  const sorted = [...rects].sort((a, b) => (isX ? a.x - b.x : a.y - b.y));
  const cross =
    sorted.reduce((total, rect) => total + centerOf(rect, isX ? "y" : "x"), 0) /
    sorted.length;
  const measurements: DistanceMeasurement[] = [];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const first = sorted[index];
    const second = sorted[index + 1];
    const firstEnd = isX ? first.x + first.width : first.y + first.height;
    const secondStart = isX ? second.x : second.y;
    pushDistance(
      measurements,
      isX ? "horizontal" : "vertical",
      firstEnd,
      secondStart,
      cross,
    );
  }

  return measurements;
}

export function buildSmartSnap(
  selectionBounds: ElementRect | null,
  fixedRects: ElementRect[],
  rawDelta: Point,
  artboard: { width: number; height: number },
  enableSpacing: boolean,
) {
  if (!selectionBounds) {
    return {
      delta: rawDelta,
      guides: [] as SmartGuide[],
      spacingMeasurements: [] as DistanceMeasurement[],
    };
  }
  const proposed = offsetRect(selectionBounds, rawDelta);
  const xAlignment = alignmentOptions("x", proposed, fixedRects, artboard);
  const yAlignment = alignmentOptions("y", proposed, fixedRects, artboard);
  const xOption = chooseSnapOption([
    ...xAlignment,
    ...(enableSpacing ? spacingOptions("x", proposed, fixedRects) : []),
  ]);
  const yOption = chooseSnapOption([
    ...yAlignment,
    ...(enableSpacing ? spacingOptions("y", proposed, fixedRects) : []),
  ]);
  const delta = {
    x: rawDelta.x + (xOption?.adjust ?? 0),
    y: rawDelta.y + (yOption?.adjust ?? 0),
  };
  const snappedBounds = offsetRect(selectionBounds, delta);
  const spacingMeasurements = [
    ...(xOption?.spacingPair
      ? buildSpacingMeasurements("x", [
          xOption.spacingPair[0],
          xOption.spacingPair[1],
          snappedBounds,
        ])
      : []),
    ...(yOption?.spacingPair
      ? buildSpacingMeasurements("y", [
          yOption.spacingPair[0],
          yOption.spacingPair[1],
          snappedBounds,
        ])
      : []),
  ];
  const guides = [xOption, yOption]
    .filter((option): option is SnapOption => Boolean(option))
    .map((option) => {
      const guide = rebaseGuide(option.guide, snappedBounds);
      if (!option.spacingPair) return guide;
      return {
        ...guide,
        coordinate:
          guide.axis === "horizontal"
            ? centerOf(snappedBounds, "y")
            : centerOf(snappedBounds, "x"),
      };
    });
  return {
    delta,
    guides,
    spacingMeasurements,
  };
}

export function pushDistance(
  measurements: DistanceMeasurement[],
  axis: "horizontal" | "vertical",
  from: number,
  to: number,
  cross: number,
  arrowVisibility?: Pick<DistanceMeasurement, "hideMaxArrow" | "hideMinArrow">,
) {
  if (Math.abs(to - from) < 1) return;
  measurements.push({
    axis,
    cross,
    from,
    ...arrowVisibility,
    to,
    value: Math.round(Math.abs(to - from)),
  });
}

export function buildDistanceMeasurements(
  subject: ElementRect,
  artboard: { width: number; height: number },
  target?: ElementRect,
) {
  const measurements: DistanceMeasurement[] = [];
  if (target) {
    const horizontal =
      target.x + target.width <= subject.x
        ? {
            from: target.x + target.width,
            to: subject.x,
            cross: (centerOf(subject, "y") + centerOf(target, "y")) / 2,
          }
        : subject.x + subject.width <= target.x
          ? {
              from: subject.x + subject.width,
              to: target.x,
              cross: (centerOf(subject, "y") + centerOf(target, "y")) / 2,
            }
          : null;
    const vertical =
      target.y + target.height <= subject.y
        ? {
            from: target.y + target.height,
            to: subject.y,
            cross: (centerOf(subject, "x") + centerOf(target, "x")) / 2,
          }
        : subject.y + subject.height <= target.y
          ? {
              from: subject.y + subject.height,
              to: target.y,
              cross: (centerOf(subject, "x") + centerOf(target, "x")) / 2,
            }
          : null;

    if (horizontal && vertical) {
      const targetIsAbove = target.y + target.height <= subject.y;
      const subjectIsRight = target.x + target.width <= subject.x;
      horizontal.cross = targetIsAbove ? target.y + target.height : target.y;
      vertical.cross = subjectIsRight ? subject.x : subject.x + subject.width;
    }

    if (horizontal) {
      const minimum = Math.min(horizontal.from, horizontal.to);
      const maximum = Math.max(horizontal.from, horizontal.to);
      pushDistance(
        measurements,
        "horizontal",
        horizontal.from,
        horizontal.to,
        horizontal.cross,
        vertical
          ? {
              hideMaxArrow: Math.abs(vertical.cross - maximum) < 0.001,
              hideMinArrow: Math.abs(vertical.cross - minimum) < 0.001,
            }
          : undefined,
      );
    }
    if (vertical) {
      const minimum = Math.min(vertical.from, vertical.to);
      const maximum = Math.max(vertical.from, vertical.to);
      pushDistance(
        measurements,
        "vertical",
        vertical.from,
        vertical.to,
        vertical.cross,
        horizontal
          ? {
              hideMaxArrow: Math.abs(horizontal.cross - maximum) < 0.001,
              hideMinArrow: Math.abs(horizontal.cross - minimum) < 0.001,
            }
          : undefined,
      );
    }
  } else {
    if (subject.x > 0) {
      pushDistance(
        measurements,
        "horizontal",
        0,
        subject.x,
        centerOf(subject, "y"),
      );
    }
    if (subject.x + subject.width < artboard.width) {
      pushDistance(
        measurements,
        "horizontal",
        subject.x + subject.width,
        artboard.width,
        centerOf(subject, "y"),
      );
    }
    if (subject.y > 0) {
      pushDistance(
        measurements,
        "vertical",
        0,
        subject.y,
        centerOf(subject, "x"),
      );
    }
    if (subject.y + subject.height < artboard.height) {
      pushDistance(
        measurements,
        "vertical",
        subject.y + subject.height,
        artboard.height,
        centerOf(subject, "x"),
      );
    }
  }
  return measurements;
}

export function areDistanceMeasurementsEqual(
  first: DistanceMeasurement[],
  second: DistanceMeasurement[],
) {
  return (
    first.length === second.length &&
    first.every((measurement, index) => {
      const other = second[index];
      return (
        measurement.axis === other.axis &&
        measurement.cross === other.cross &&
        measurement.from === other.from &&
        measurement.hideMaxArrow === other.hideMaxArrow &&
        measurement.hideMinArrow === other.hideMinArrow &&
        measurement.to === other.to &&
        measurement.value === other.value
      );
    })
  );
}

export function buildGuideDistanceMeasurements(
  subject: ElementRect,
  guide: EditorGuide,
) {
  const measurements: DistanceMeasurement[] = [];
  if (guide.orientation === "horizontal") {
    if (guide.position < subject.y) {
      pushDistance(
        measurements,
        "vertical",
        guide.position,
        subject.y,
        centerOf(subject, "x"),
      );
    } else if (guide.position > subject.y + subject.height) {
      pushDistance(
        measurements,
        "vertical",
        subject.y + subject.height,
        guide.position,
        centerOf(subject, "x"),
      );
    }
  } else if (guide.position < subject.x) {
    pushDistance(
      measurements,
      "horizontal",
      guide.position,
      subject.x,
      centerOf(subject, "y"),
    );
  } else if (guide.position > subject.x + subject.width) {
    pushDistance(
      measurements,
      "horizontal",
      subject.x + subject.width,
      guide.position,
      centerOf(subject, "y"),
    );
  }
  return measurements;
}

export function buildDistanceMeasurementsFromGuide(
  subject: EditorGuide,
  artboard: { width: number; height: number },
  target?: ElementRect,
  targetGuide?: EditorGuide,
) {
  const measurements: DistanceMeasurement[] = [];
  const horizontal = subject.orientation === "horizontal";
  const axis = horizontal ? "vertical" : "horizontal";
  const artboardExtent = horizontal ? artboard.height : artboard.width;
  const fallbackCross = horizontal ? artboard.width / 2 : artboard.height / 2;

  if (targetGuide) {
    if (
      targetGuide.id !== subject.id &&
      targetGuide.orientation === subject.orientation
    ) {
      pushDistance(
        measurements,
        axis,
        subject.position,
        targetGuide.position,
        fallbackCross,
      );
    }
    return measurements;
  }

  if (target) {
    const targetStart = horizontal ? target.y : target.x;
    const targetEnd = targetStart + (horizontal ? target.height : target.width);
    const targetCross = horizontal
      ? centerOf(target, "x")
      : centerOf(target, "y");

    if (subject.position < targetStart) {
      pushDistance(
        measurements,
        axis,
        subject.position,
        targetStart,
        targetCross,
      );
    } else if (subject.position > targetEnd) {
      pushDistance(
        measurements,
        axis,
        targetEnd,
        subject.position,
        targetCross,
      );
    }
    return measurements;
  }

  if (subject.position > 0) {
    pushDistance(measurements, axis, 0, subject.position, fallbackCross);
  }
  if (subject.position < artboardExtent) {
    pushDistance(
      measurements,
      axis,
      subject.position,
      artboardExtent,
      fallbackCross,
    );
  }
  return measurements;
}
