import { colorWithOpacity } from "@/features/editor/lib/element-style";
import { clamp } from "@/features/editor/lib/geometry";
import { type ArtboardSettings } from "@/features/editor/store/editor-store";

export function gradientStopsForArtboard(artboard: ArtboardSettings) {
  if (artboard.gradientStops?.length) {
    return [...artboard.gradientStops].sort(
      (left, right) => left.position - right.position,
    );
  }
  return [
    {
      color: artboard.gradientStartColor ?? "#d9d9d9",
      opacity: artboard.gradientStartOpacity ?? 100,
      position: 0,
    },
    {
      color: artboard.gradientEndColor ?? "#737373",
      opacity: artboard.gradientEndOpacity ?? 100,
      position: 100,
    },
  ];
}

export function gradientCssFromStops(
  artboard: ArtboardSettings,
  gradientStops: ReturnType<typeof gradientStopsForArtboard>,
) {
  const normalizedStops = gradientStops.map((stop) => ({
    ...stop,
    position: clamp(stop.position, 0, 100),
  }));
  const stops = normalizedStops
    .map(
      (stop) =>
        `${colorWithOpacity(stop.color, stop.opacity)} ${stop.position}%`,
    )
    .join(", ");
  const type = artboard.gradientType ?? "linear";
  const angle = artboard.gradientAngle ?? 0;

  if (type === "radial") {
    return `radial-gradient(circle at center, ${stops})`;
  }
  if (type === "conic") {
    return `conic-gradient(from ${angle}deg at center, ${stops})`;
  }
  if (type === "rectangular") {
    return `radial-gradient(closest-side at center, ${stops})`;
  }
  if (type === "freeform") {
    const layers = normalizedStops
      .map((stop, index) => {
        const y = clamp(
          50 + Math.sin(((stop.position + index * 31) * Math.PI) / 100) * 32,
          12,
          88,
        );
        return `radial-gradient(circle at ${stop.position}% ${Math.round(y)}%, ${colorWithOpacity(stop.color, stop.opacity)} 0%, transparent 55%)`;
      })
      .reverse();
    return layers.join(", ");
  }
  return `linear-gradient(${90 + angle}deg, ${stops})`;
}

export function gradientCssForArtboard(artboard: ArtboardSettings) {
  return gradientCssFromStops(artboard, gradientStopsForArtboard(artboard));
}

export function mediaObjectFit(artboard: ArtboardSettings) {
  const fit = artboard.backgroundImageFit ?? "cover";
  if (fit === "stretch" || fit === "fill") return "fill";
  if (fit === "original") return "none";
  return fit;
}

export function mediaBackgroundSize(artboard: ArtboardSettings) {
  const fit = artboard.backgroundImageFit ?? "cover";
  if (fit === "stretch" || fit === "fill") return "100% 100%";
  if (fit === "original") return "auto";
  return fit;
}

export function hasSolidBackground(artboard: ArtboardSettings) {
  return (
    artboard.backgroundSolidEnabled ??
    (artboard.backgroundType ?? "solid") === "solid"
  );
}

export function hasGradientBackground(artboard: ArtboardSettings) {
  return (
    artboard.backgroundGradientEnabled ??
    artboard.backgroundType === "gradation"
  );
}

export function backgroundMediaType(artboard: ArtboardSettings) {
  return (
    artboard.backgroundMediaType ??
    (artboard.backgroundType === "image" || artboard.backgroundType === "video"
      ? artboard.backgroundType
      : undefined)
  );
}

export function backgroundMediaStyle(artboard: ArtboardSettings) {
  return {
    backgroundImage: artboard.backgroundImage
      ? `url(${artboard.backgroundImage})`
      : undefined,
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: mediaBackgroundSize(artboard),
    opacity: (artboard.backgroundImageOpacity ?? 100) / 100,
  };
}
