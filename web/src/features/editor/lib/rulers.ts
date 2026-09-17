import { type RulerRange } from "@/features/editor/lib/editor-types";

export const rulerSize = 24;

export function rulerMajorInterval(scale: number) {
  const targetUnits = 80 / Math.max(0.08, scale);
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(0.0001, targetUnits)));
  const normalized = targetUnits / magnitude;
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function prepareRulerCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) {
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const pixelWidth = Math.max(1, Math.round(width * ratio));
  const pixelHeight = Math.max(1, Math.round(height * ratio));
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "rgba(255, 255, 255, 0.97)";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#8c8c8c";
  context.fillStyle = "#666666";
  context.lineWidth = 1;
  context.font =
    '500 9px "Inter Variable", "Malgun Gothic", "Apple SD Gothic Neo", "Segoe UI", Arial, sans-serif';
  return context;
}

export function drawRuler(
  context: CanvasRenderingContext2D,
  orientation: "horizontal" | "vertical",
  width: number,
  height: number,
  origin: number,
  scale: number,
  ranges: RulerRange[],
) {
  const major = rulerMajorInterval(scale);
  const minor = major;
  const span = orientation === "horizontal" ? width : height;
  const worldStart = (0 - origin) / scale;
  const worldEnd = (span - origin) / scale;
  const first = Math.floor(worldStart / minor) * minor;

  context.save();
  context.beginPath();
  context.rect(0, 0, width, height);
  context.clip();
  context.fillStyle = "rgba(171, 81, 240, 0.14)";
  for (const range of ranges) {
    const start = Math.max(0, range.start);
    const end = Math.min(span, range.end);
    if (end <= start) continue;
    if (orientation === "horizontal") {
      context.fillRect(start, 0, end - start, height);
      context.fillStyle = "#ab51f0";
      context.fillRect(start, height - 2, end - start, 2);
      context.fillStyle = "rgba(171, 81, 240, 0.14)";
    } else {
      context.fillRect(0, start, width, end - start);
      context.fillStyle = "#ab51f0";
      context.fillRect(width - 2, start, 2, end - start);
      context.fillStyle = "rgba(171, 81, 240, 0.14)";
    }
  }

  context.strokeStyle = "#8c8c8c";
  context.fillStyle = "#666666";
  context.textBaseline = "top";
  for (let value = first; value <= worldEnd + minor; value += minor) {
    const position = origin + value * scale;
    const isMajor =
      Math.abs(value / major - Math.round(value / major)) < 0.0001;
    const roundedPosition = Math.round(position) + 0.5;
    context.beginPath();
    if (orientation === "horizontal") {
      context.moveTo(roundedPosition, isMajor ? 12 : 18);
      context.lineTo(roundedPosition, height);
    } else {
      context.moveTo(isMajor ? 12 : 18, roundedPosition);
      context.lineTo(width, roundedPosition);
    }
    context.stroke();

    if (isMajor) {
      const label = Math.abs(value) < 0.0001 ? "0" : String(Math.round(value));
      if (orientation === "horizontal") {
        context.fillText(label, Math.round(position) + 3, 1);
      } else {
        context.save();
        context.translate(13, Math.round(position) - 3);
        context.rotate(-Math.PI / 2);
        context.fillText(label, 0, 0);
        context.restore();
      }
    }
  }
  context.restore();
}
