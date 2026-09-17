import Image from "next/image";

import {
  designAssetDimensions,
  pathfinderLayerAssets,
} from "@/features/editor/lib/editor-constants";
import { type CanvasElement } from "@/features/editor/store/editor-store";
import { assetPath } from "@/lib/asset-path";

export function LayerSymbol({ element }: { element: CanvasElement }) {
  const { pathfinder, type } = element;
  if (pathfinder) {
    const asset = pathfinderLayerAssets[pathfinder.operation];
    const dimensions = designAssetDimensions[asset] ?? {
      height: 17,
      width: 17,
    };
    return (
      <Image
        alt=""
        aria-hidden="true"
        className="layer-pathfinder-icon"
        height={dimensions.height}
        src={assetPath(`/figma/design/${encodeURIComponent(asset)}`)}
        width={dimensions.width}
      />
    );
  }

  if (type === "text") {
    return (
      <Image
        alt=""
        aria-hidden="true"
        className="layer-text-icon"
        height={17}
        src={assetPath("/figma/text.svg")}
        width={18}
      />
    );
  }

  if (type === "triangle") {
    return (
      <svg aria-hidden="true" viewBox="0 0 15 15">
        <polygon
          fill="none"
          points="7.5,1 14,13.5 1,13.5"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="0.8"
        />
      </svg>
    );
  }

  if (type === "star") {
    return (
      <svg aria-hidden="true" viewBox="0 0 15 15">
        <polygon
          fill="none"
          points="7.5,1 9.15,5.4 13.85,5.4 10.05,8.1 11.5,13 7.5,10.25 3.5,13 4.95,8.1 1.15,5.4 5.85,5.4"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="0.8"
        />
      </svg>
    );
  }

  if (type === "line") {
    return (
      <svg aria-hidden="true" viewBox="0 0 15 15">
        <line
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="0.8"
          x1="2"
          x2="13"
          y1="13"
          y2="2"
        />
      </svg>
    );
  }

  if (type === "pen") {
    return <span aria-hidden="true" className="pen-icon" />;
  }

  return null;
}
