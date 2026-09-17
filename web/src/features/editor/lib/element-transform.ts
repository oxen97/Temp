import {
  type ElementRect,
  type ResizeHandle,
} from "@/features/editor/lib/editor-types";
import {
  imageCropForElement,
  scaleImageCrop,
} from "@/features/editor/lib/image-crop";
import {
  pathData,
  scaleVectorPaths,
  vectorPathsForElement,
  vectorPathUpdates,
} from "@/features/editor/lib/vector-path";
import { type CanvasElement } from "@/features/editor/store/editor-store";

export function resizedBoundsFromCorner(
  initial: ElementRect,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
  preserveRatio: boolean,
) {
  const minimumSize = 8;
  let x = initial.x;
  let y = initial.y;
  let width = initial.width;
  let height = initial.height;

  if (handle.includes("e")) width = initial.width + deltaX;
  if (handle.includes("s")) height = initial.height + deltaY;
  if (handle.includes("w")) {
    width = initial.width - deltaX;
    x = initial.x + deltaX;
  }
  if (handle.includes("n")) {
    height = initial.height - deltaY;
    y = initial.y + deltaY;
  }

  if (preserveRatio) {
    const widthScale =
      Math.max(minimumSize, width) / Math.max(1, initial.width);
    const heightScale =
      Math.max(minimumSize, height) / Math.max(1, initial.height);
    const uniformScale =
      Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
        ? widthScale
        : heightScale;
    width = initial.width * uniformScale;
    height = initial.height * uniformScale;
  } else {
    width = Math.max(minimumSize, width);
    height = Math.max(minimumSize, height);
  }

  if (handle.includes("w")) x = initial.x + initial.width - width;
  if (handle.includes("n")) y = initial.y + initial.height - height;
  return { height, width, x, y };
}

export function resizeElementWithinSelection(
  element: CanvasElement,
  initialBounds: ElementRect,
  resizedBounds: ElementRect,
) {
  const scaleX = resizedBounds.width / Math.max(1, initialBounds.width);
  const scaleY = resizedBounds.height / Math.max(1, initialBounds.height);
  const resized: CanvasElement = {
    ...element,
    height: Math.max(0.1, element.height * scaleY),
    width: Math.max(0.1, element.width * scaleX),
    x: resizedBounds.x + (element.x - initialBounds.x) * scaleX,
    y: resizedBounds.y + (element.y - initialBounds.y) * scaleY,
  };

  if (element.type === "image" && element.imageCrop) {
    resized.imageCrop = scaleImageCrop(
      imageCropForElement(element),
      scaleX,
      scaleY,
    );
  }

  const paths = vectorPathsForElement(element);
  if (element.type === "pen" && paths.length) {
    const scaledPaths = scaleVectorPaths(paths, scaleX, scaleY);
    Object.assign(resized, vectorPathUpdates(scaledPaths));
    if (element.pathfinder) {
      resized.pathfinder = {
        ...element.pathfinder,
        imageFill: element.pathfinder.imageFill
          ? {
              ...element.pathfinder.imageFill,
              crop: scaleImageCrop(
                element.pathfinder.imageFill.crop,
                scaleX,
                scaleY,
              ),
              height: element.pathfinder.imageFill.height * scaleY,
              width: element.pathfinder.imageFill.width * scaleX,
              x: element.pathfinder.imageFill.x * scaleX,
              y: element.pathfinder.imageFill.y * scaleY,
            }
          : undefined,
        paths: scaledPaths.map((path) => pathData(path.points, path.closed)),
        polygons: element.pathfinder.polygons?.map((polygon) =>
          polygon.map((ring) =>
            ring.map(([x, y]) => [x * scaleX, y * scaleY] as [number, number]),
          ),
        ),
      };
    }
  }

  return resized;
}
