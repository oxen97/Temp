import {
  type CanvasElement,
  type ImageCrop,
} from "@/features/editor/store/editor-store";

export function imageCropForElement(element: CanvasElement): ImageCrop {
  const crop = element.imageCrop;
  const baseWidth = Math.max(
    8,
    crop?.baseWidth ?? element.width + (crop?.left ?? 0) + (crop?.right ?? 0),
  );
  const baseHeight = Math.max(
    8,
    crop?.baseHeight ?? element.height + (crop?.top ?? 0) + (crop?.bottom ?? 0),
  );
  return {
    baseHeight,
    baseWidth,
    bottom: Math.max(0, crop?.bottom ?? 0),
    left: Math.max(0, crop?.left ?? 0),
    right: Math.max(0, crop?.right ?? 0),
    scaleX: Math.max(0.001, crop?.scaleX ?? 1),
    scaleY: Math.max(0.001, crop?.scaleY ?? 1),
    top: Math.max(0, crop?.top ?? 0),
  };
}

export function fittedImageSize(naturalWidth: number, naturalHeight: number) {
  const maxWidth = 280;
  const maxHeight = 200;
  const scale = Math.min(
    maxWidth / Math.max(1, naturalWidth),
    maxHeight / Math.max(1, naturalHeight),
    1,
  );
  return {
    height: Math.max(1, naturalHeight * scale),
    width: Math.max(1, naturalWidth * scale),
  };
}

export function scaleImageCrop(
  crop: ImageCrop,
  widthScale: number,
  heightScale: number,
): ImageCrop {
  return {
    ...crop,
    scaleX: (crop.scaleX ?? 1) * widthScale,
    scaleY: (crop.scaleY ?? 1) * heightScale,
  };
}
