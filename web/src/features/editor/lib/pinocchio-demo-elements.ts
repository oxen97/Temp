import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import {
  pinocchioBackdropSvg,
  PINOCCHIO_NOSE_BASE,
  PINOCCHIO_NOSE_REST_TIP,
} from "@/features/editor/lib/pinocchio-demo-art";
import type { CanvasElement } from "@/features/editor/store/editor-store";

/** A second native preview demo: the nose is an editable strand-bend path. */
export function createPinocchioDemoElements(
  width: number,
  height: number,
): CanvasElement[] {
  const sx = width / 1920;
  const sy = height / 1080;
  const noseLength = (PINOCCHIO_NOSE_REST_TIP.x - PINOCCHIO_NOSE_BASE.x) * sx;
  const noseHeight = 52 * sy;
  const noseBaseX = PINOCCHIO_NOSE_BASE.x * sx;
  const noseCenterY = PINOCCHIO_NOSE_BASE.y * sy;
  return [
    {
      id: "pinocchio-demo-backdrop",
      name: "Pinocchio · illustrated stage",
      type: "image",
      x: 0,
      y: 0,
      width,
      height,
      rotation: 0,
      opacity: 100,
      fill: "transparent",
      stroke: "transparent",
      strokeWidth: 0,
      strokeStyle: "none",
      cornerRadius: 0,
      visible: true,
      locked: true,
      src: pinocchioBackdropSvg,
      interactions: [],
    },
    {
      id: "pinocchio-demo-nose",
      name: "Pinocchio · springy nose",
      type: "pen",
      x: noseBaseX,
      y: noseCenterY - noseHeight / 2,
      width: noseLength,
      height: noseHeight,
      rotation: 0,
      opacity: 100,
      fill: "none",
      stroke: "#d48d60",
      strokeWidth: 42 * sx,
      strokeStyle: "solid",
      cornerRadius: 0,
      visible: true,
      locked: false,
      vectorPaths: [
        {
          points: [
            { x: 0, y: noseHeight / 2 },
            { x: noseLength, y: noseHeight / 2 },
          ],
        },
      ],
      interactions: [
        createDefaultInteraction({
          id: "pinocchio-demo-nose-spring",
          name: "Pull and release nose",
          trigger: "drag",
          effect: "strand-bend",
          motion: "spring",
          dragAxis: "free",
          strandAnchor: "left",
          strandStiffness: 1,
          strandDamping: 0.32,
          strandInfluenceRadius: 180 * sx,
          strandMaxDisplacement: 610 * sx,
          strandNeighborRadius: 0,
          strandNeighborStrength: 0,
        }),
      ],
    },
  ];
}
