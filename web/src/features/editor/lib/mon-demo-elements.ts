import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import type { CanvasElement } from "@/features/editor/store/editor-store";

function svgImage(markup: string) {
  // ShapeGraphic inserts this into an unquoted CSS url(...); encode the
  // punctuation encodeURIComponent intentionally leaves untouched as well.
  const encoded = encodeURIComponent(markup).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

/** An original, editable study of the eyes visible between MON's strands. */
const hairyBackdropSvg = svgImage(`
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="room" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f05d41"/>
      <stop offset=".34" stop-color="#c92546"/>
      <stop offset=".7" stop-color="#7f1947"/>
      <stop offset="1" stop-color="#32112e"/>
    </linearGradient>
    <radialGradient id="eyeLight"><stop stop-color="#fffdf1"/><stop offset="1" stop-color="#ffdbe0"/></radialGradient>
    <filter id="softEye" x="-30%" y="-100%" width="160%" height="300%">
      <feGaussianBlur stdDeviation="16"/>
    </filter>
  </defs>
  <rect width="1920" height="1080" fill="url(#room)"/>
  <ellipse cx="960" cy="437" rx="540" ry="215" fill="#270b28" opacity=".42" filter="url(#softEye)"/>
  <path d="M505 433 Q661 378 828 429 Q665 472 505 433Z" fill="#240d25" stroke="#351027" stroke-width="14"/>
  <path d="M1092 429 Q1259 378 1415 433 Q1254 472 1092 429Z" fill="#240d25" stroke="#351027" stroke-width="14"/>
  <path d="M524 432 Q666 407 810 432 Q668 448 524 432Z" fill="url(#eyeLight)"/>
  <path d="M1110 432 Q1254 407 1396 432 Q1253 448 1110 432Z" fill="url(#eyeLight)"/>
  <path d="M723 420 Q743 430 724 444 Q711 434 723 420Z" fill="#231025" opacity=".9"/>
  <path d="M1194 420 Q1174 430 1193 444 Q1206 434 1194 420Z" fill="#231025" opacity=".9"/>
</svg>`);

function backdropElement(width: number, height: number): CanvasElement {
  return {
    cornerRadius: 0,
    fill: "transparent",
    height,
    id: "mon-demo-backdrop",
    interactions: [],
    locked: true,
    name: "Hairy study · backdrop and eyes",
    opacity: 100,
    rotation: 0,
    src: hairyBackdropSvg,
    stroke: "transparent",
    strokeStyle: "none",
    strokeWidth: 0,
    type: "image",
    visible: true,
    width,
    x: 0,
    y: 0,
  };
}

/** Native, individually editable strands with authored Bend and Merge rules. */
export function createMonDemoElements(width: number, height: number) {
  const sx = width / 1920;
  const sy = height / 1080;
  const strandCount = 45;
  const pitch = width / strandCount;
  const strandWidth = 52 * sx;
  const strandCenter = strandWidth / 2;
  const strands: CanvasElement[] = Array.from(
    { length: strandCount },
    (_, index) => {
      const strandHeight = (925 + ((index * 73) % 220)) * sy;
      const id = `mon-demo-strand-${index + 1}`;
      const tint = Math.round(33 + 12 * Math.sin(index * 0.47));
      const channel = (value: number) => value.toString(16).padStart(2, "0");
      const red = `#${channel(216 + Math.round(9 * Math.sin(index * 0.69)))}${channel(tint)}${channel(67 + Math.round(10 * Math.cos(index * 0.38)))}`;
      return {
        id,
        name: `MON strand ${index + 1}`,
        type: "pen",
        x: (index + 0.5) * pitch - strandCenter,
        y: -48 * sy,
        width: strandWidth,
        height: strandHeight,
        rotation: 0,
        opacity: 100,
        fill: "none",
        stroke: red,
        // The narrow gaps keep each ribbon distinct and avoid pre-merging.
        strokeWidth: (33 + Math.sin(index * 1.39) * 1.5) * sx,
        strokeStyle: "solid",
        cornerRadius: 0,
        visible: true,
        locked: false,
        vectorPaths: [
          {
            points: [
              { x: strandCenter, y: 0 },
              { x: strandCenter, y: strandHeight },
            ],
          },
        ],
        interactions: [
          createDefaultInteraction({
            id: `${id}-bend`,
            name: "Drag to bend strand",
            trigger: "drag",
            effect: "strand-bend",
            motion: "spring",
            strandAnchor: "top",
            strandStiffness: 0.53,
            strandDamping: 0.78,
            strandInfluenceRadius: 230 * sy,
            strandMaxDisplacement: 1100 * sx,
            strandNeighborRadius: 205 * sx,
            strandNeighborStrength: 68,
          }),
          ...Array.from(
            { length: Math.min(4, strandCount - index - 1) },
            (_, neighborIndex) => {
              const offset = neighborIndex + 1;
              return createDefaultInteraction({
                id: `${id}-liquid-${offset}`,
                name:
                  offset === 1
                    ? "Merge with neighboring strand"
                    : `Merge with nearby strand +${offset}`,
                trigger: "near-target",
                effect: "liquid-merge",
                motion: "direct",
                collisionTarget: `mon-demo-strand-${index + offset + 1}`,
                joinDistance: 2 * sx,
                releaseDistance: 7 * sx,
                bridgeWidth: 4 * sx,
                liquidSmoothness: 28,
                liquidAttraction: 100,
              });
            },
          ),
        ],
      };
    },
  );
  return [backdropElement(width, height), ...strands];
}

// Preserve existing imports and shared links while the four-page collection
// is now the original AMOUS Field Notes artwork.
export {
  FIELD_NOTES_SCENES as MON_ART_SCENES,
  createFieldNotesSceneElements as createMonArtSceneElements,
  createFieldNotesSceneLogicRules as createMonArtSceneLogicRules,
} from "@/features/editor/lib/field-notes-demo-elements";
