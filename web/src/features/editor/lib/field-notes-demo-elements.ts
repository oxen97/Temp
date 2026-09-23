import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import {
  createSceneLogicRule,
  type SceneLogicRule,
} from "@/features/editor/lib/scene-logic";
import type { CanvasElement } from "@/features/editor/store/editor-store";

// Keep the existing demo URL/page IDs as aliases; everything visible is authored
// canvas content. No page-specific renderer or pointer handler is required.
export const FIELD_NOTES_SCENES = [
  {
    id: "mon-art-scene-1",
    name: "BREEZE",
    subtitle: "A garden made of air.",
    category: "KINETIC HERBARIUM",
    description: "바람은 보이지 않지만,\n지나간 자리는 잠시 남습니다.",
    instruction: "갈대 한 줄을 잡고\n좌우로 천천히 쓸어 보세요.",
    gesture: "DRAG A REED  ↔",
    paper: "#edf0e7",
    panel: "#e0e7d7",
    ink: "#264538",
    accent: "#627854",
  },
  {
    id: "mon-art-scene-2",
    name: "INK",
    subtitle: "A mark, then a memory.",
    category: "TEMPORARY WRITING",
    description:
      "문장이 아니어도 괜찮아요.\n손끝의 속도로 한 줄을 남겨 보세요.",
    instruction:
      "누른 채 움직이면 잉크가 번집니다.\n흔적은 천천히 종이로 돌아갑니다.",
    gesture: "PRESS & DRAW  ∿",
    paper: "#eceeea",
    panel: "#f7f5ec",
    ink: "#213c79",
    accent: "#6b82ad",
  },
  {
    id: "mon-art-scene-3",
    name: "BLOOM",
    subtitle: "Nothing grows in a straight line.",
    category: "CHANCE BOTANICALS",
    description: "계획하지 않은 곳에 꽃이 피고,\n우연들이 모여 정원이 됩니다.",
    instruction: "빈 곳을 클릭하거나 터치해\n나만의 작은 정원을 심어 보세요.",
    gesture: "TAP TO PLANT  +",
    paper: "#f2e8dd",
    panel: "#f9f2e7",
    ink: "#4c4638",
    accent: "#ae7454",
  },
  {
    id: "mon-art-scene-4",
    name: "TOPOGRAPHY",
    subtitle: "The shape of a passing thought.",
    category: "LIVING CARTOGRAPHY",
    description: "같은 풍경도 바라보는 곳에 따라\n조금씩 다른 지도가 됩니다.",
    instruction:
      "지형 위로 포인터를 움직이거나\n손가락으로 흐름을 바꿔 보세요.",
    gesture: "MOVE TO EXPLORE  ↗",
    paper: "#efe5d4",
    panel: "#e8d9bf",
    ink: "#554334",
    accent: "#ae7049",
  },
] as const;

function shape(
  id: string,
  name: string,
  type: CanvasElement["type"],
  x: number,
  y: number,
  width: number,
  height: number,
  fill = "transparent",
): CanvasElement {
  return {
    id,
    name,
    type,
    x,
    y,
    width,
    height,
    fill,
    rotation: 0,
    opacity: 100,
    stroke: "transparent",
    strokeWidth: 0,
    strokeStyle: "none",
    cornerRadius: 0,
    visible: true,
    locked: false,
    interactions: [],
  };
}

function text(
  id: string,
  name: string,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  fill: string,
  family = "Arial",
  weight = "400",
): CanvasElement {
  return {
    ...shape(id, name, "text", x, y, width, height, fill),
    text: value,
    fontFamily: family,
    fontSize,
    fontWeight: weight,
    textResizeMode: "fixed",
    lineHeight: 1.3,
  };
}

function pen(
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  stroke: string,
  strokeWidth: number,
  points: NonNullable<CanvasElement["vectorPaths"]>[number]["points"],
): CanvasElement {
  return {
    ...shape(id, name, "pen", x, y, width, height, "none"),
    stroke,
    strokeWidth,
    strokeStyle: "solid",
    vectorPaths: [{ points }],
  };
}

function rule(
  id: string,
  x: number,
  y: number,
  width: number,
  color: string,
  opacity = 25,
) {
  return {
    ...shape(id, "Editorial rule", "rectangle", x, y, width, 1, color),
    opacity,
  };
}

function circle(
  id: string,
  name: string,
  cx: number,
  cy: number,
  radius: number,
  fill: string,
): CanvasElement {
  return shape(
    id,
    name,
    "circle",
    cx - radius,
    cy - radius,
    radius * 2,
    radius * 2,
    fill,
  );
}

function sceneBase(index: number) {
  const scene = FIELD_NOTES_SCENES[index];
  const background = shape(
    `mon-art-${index + 1}-backdrop`,
    "Paper background",
    "rectangle",
    0,
    0,
    1920,
    1080,
    scene.paper,
  );
  background.locked = true;
  const field = shape(
    `field-${index + 1}-plate`,
    "Full-width artwork field",
    "rectangle",
    0,
    164,
    1920,
    780,
    scene.panel,
  );
  field.locked = true;
  return [background, field];
}

function breeze(): CanvasElement[] {
  const sun = circle(
    "field-breeze-sun",
    "Pale afternoon sun",
    1670,
    303,
    62,
    "#d6b85f",
  );
  const sunRing = circle(
    "field-breeze-sun-ring",
    "Sun orbit",
    1670,
    303,
    84,
    "none",
  );
  sunRing.stroke = "#a9b393";
  sunRing.strokeStyle = "solid";
  sunRing.strokeWidth = 1;
  const ground = Array.from({ length: 3 }, (_, index) =>
    pen(
      `field-breeze-ground-${index}`,
      "Ground contour",
      50,
      855 + index * 15,
      1820,
      30,
      "#9fac8a",
      1,
      [
        { x: 0, y: 22, handleOut: { x: 500, y: -26 - index * 6 } },
        { x: 1820, y: 12, handleIn: { x: 1350, y: 42 + index * 6 } },
      ],
    ),
  );
  const reeds = Array.from({ length: 19 }, (_, index) => {
    const height = 365 + 126 * Math.sin(index * 0.73 + 0.2) + (index % 4) * 40;
    const tilt = Math.sin(index * 0.89) * 24;
    const rootY = 888 + Math.sin(index * 0.42) * 9;
    const reed = pen(
      `mon-art-1-bar-${index + 1}`,
      `Reed ${index + 1}`,
      70 + index * 95,
      rootY - height,
      72,
      height,
      ["#365c43", "#66794d", "#8c9865", "#4b6950"][index % 4],
      18 + (index % 4) * 2,
      [
        { x: 36 + tilt, y: 0, handleOut: { x: 12 + tilt, y: height * 0.29 } },
        { x: 36, y: height, handleIn: { x: 64, y: height * 0.67 } },
      ],
    );
    reed.interactions = [
      createDefaultInteraction({
        id: `${reed.id}-bend`,
        name: "Brush the reed and pass the breeze",
        trigger: "drag",
        effect: "strand-bend",
        motion: "spring",
        strandDragMode: "swipe",
        strandAnchor: "bottom",
        strandStiffness: 0.29,
        strandDamping: 0.18,
        strandInfluenceRadius: 210,
        strandMaxDisplacement: 210,
        strandNeighborRadius: 245,
        strandNeighborStrength: 80,
      }),
    ];
    return reed;
  });
  const roots = reeds.map((reed, index) =>
    circle(
      `field-breeze-root-${index}`,
      "Reed root",
      reed.x + 36,
      reed.y + reed.height,
      4,
      "#b9a265",
    ),
  );
  return [...sceneBase(0), sun, sunRing, ...ground, ...reeds, ...roots];
}

function ink(): CanvasElement[] {
  const guides = Array.from({ length: 9 }, (_, index) =>
    rule(`field-ink-guide-${index}`, 76, 276 + index * 68, 1768, "#c4cbbc", 42),
  );
  const washes = Array.from({ length: 43 }, (_, index) => {
    const t = index / 42;
    const mark = circle(
      `field-ink-wash-${index}`,
      "Editable pigment study",
      225 + t * 1470,
      548 + Math.sin(t * Math.PI * 2.3 - 1.1) * 145,
      30 + Math.sin(t * Math.PI) * 40,
      index % 3 === 0 ? "#506d9a" : "#1d4985",
    );
    mark.opacity = 6 + (index % 4) * 2;
    return mark;
  });
  const stroke = pen(
    "field-ink-sample-stroke",
    "Dry brush line",
    160,
    340,
    1580,
    390,
    "#203f7e",
    2,
    [
      { x: 0, y: 285, handleOut: { x: 435, y: -108 } },
      {
        x: 810,
        y: 179,
        handleIn: { x: 450, y: 134 },
        handleOut: { x: 1160, y: 397 },
      },
      { x: 1580, y: 67, handleIn: { x: 1264, y: 409 } },
    ],
  );
  stroke.opacity = 53;
  const pigments = ["#173a76", "#5a7fa7", "#b9c8cf"].map((color, index) =>
    circle(
      `field-ink-swatch-${index}`,
      "Pigment swatch",
      1650 + index * 58,
      862,
      14,
      color,
    ),
  );
  const emitter = shape(
    "mon-art-2-trail-emitter",
    "Draw with water and ink",
    "rectangle",
    0,
    164,
    1920,
    780,
  );
  emitter.interactions = [
    createDefaultInteraction({
      id: "mon-art-2-drag-trail",
      name: "Leave a slowly evaporating ink trace",
      trigger: "drag",
      triggerArea: "entire-artwork",
      effect: "pointer-trail",
      motion: "direct",
      trailSpacing: 5,
      trailSizeMin: 15,
      trailSizeMax: 30,
      trailLifespan: 8,
      trailGrowth: 165,
      trailFade: 100,
      trailColors: "#1e4984,#345f93,#5a7b9e",
      trailBlendMode: "normal",
      trailMaxCount: 430,
      trailBlur: 0,
    }),
  ];
  return [...sceneBase(1), ...guides, ...washes, stroke, ...pigments, emitter];
}

function flower(
  index: number,
  cx: number,
  cy: number,
  size: number,
  petalFill: string,
): CanvasElement[] {
  const groupId = `mon-art-3-flower-${index}`;
  const petals = Array.from({ length: 8 }, (_, petalIndex) => {
    const angle = (petalIndex * Math.PI) / 4;
    const petal = shape(
      `${groupId}-petal-${petalIndex + 1}`,
      `Flower ${index} · petal ${petalIndex + 1}`,
      "circle",
      cx + Math.cos(angle) * size * 0.27 - size * 0.26,
      cy + Math.sin(angle) * size * 0.27 - size * 0.11,
      size * 0.52,
      size * 0.22,
      petalFill,
    );
    petal.rotation = petalIndex * 45;
    petal.groupId = groupId;
    return petal;
  });
  const center = circle(
    `${groupId}-center`,
    `Flower ${index} · seed head`,
    cx,
    cy,
    size * 0.135,
    "#536449",
  );
  center.groupId = groupId;
  const pollen = Array.from({ length: 5 }, (_, dot) => {
    const angle = (dot * Math.PI * 2) / 5;
    const grain = circle(
      `${groupId}-pollen-${dot}`,
      `Flower ${index} · pollen`,
      cx + Math.cos(angle) * size * 0.063,
      cy + Math.sin(angle) * size * 0.063,
      size * 0.013,
      "#eee2ad",
    );
    grain.groupId = groupId;
    return grain;
  });
  return [...petals, center, ...pollen];
}

function bloom(): CanvasElement[] {
  const dots = Array.from({ length: 126 }, (_, index) => {
    const dot = circle(
      `field-bloom-grid-${index}`,
      "Planting grid point",
      104 + (index % 18) * 101,
      250 + Math.floor(index / 18) * 96,
      1.5,
      "#c5b6a1",
    );
    dot.opacity = 55;
    return dot;
  });
  const stems = [
    pen(
      "field-bloom-stem-a",
      "Botanical stem",
      160,
      415,
      510,
      456,
      "#8e9b75",
      2,
      [
        { x: 0, y: 445, handleOut: { x: 292, y: 388 } },
        { x: 294, y: 0, handleIn: { x: 218, y: 200 } },
      ],
    ),
    pen(
      "field-bloom-stem-b",
      "Botanical stem",
      1035,
      513,
      520,
      373,
      "#8e9b75",
      2,
      [
        { x: 0, y: 360, handleOut: { x: 382, y: 279 } },
        { x: 386, y: 0, handleIn: { x: 302, y: 154 } },
      ],
    ),
  ];
  const flowers = [
    ...flower(1, 450, 425, 390, "#d8a46b"),
    ...flower(2, 1420, 513, 345, "#aeb89c"),
    ...flower(3, 906, 725, 238, "#c48265"),
  ];
  const emitter = shape(
    "mon-art-3-spawn-emitter",
    "Tap to plant a flower",
    "rectangle",
    0,
    164,
    1920,
    780,
  );
  emitter.interactions = [
    createDefaultInteraction({
      id: "mon-art-3-click-spawn-flower",
      name: "Plant a new flower",
      trigger: "click-tap",
      triggerArea: "entire-artwork",
      effect: "spawn-instance",
      motion: "direct",
      spawnSourceId: "mon-art-3-flower-1",
      spawnSizeMin: 30,
      spawnSizeMax: 58,
      spawnRotationMin: -28,
      spawnRotationMax: 28,
      spawnMaxCount: 12,
      spawnOverflow: "remove-oldest",
      spawnInheritInteractions: false,
    }),
  ];
  return [...sceneBase(2), ...dots, ...stems, ...flowers, emitter];
}

function topography(): CanvasElement[] {
  const strokes = Array.from({ length: 28 }, (_, index) => {
    const rx = 155 + index * 25;
    const ry = 85 + index * 9;
    const w = rx * 2;
    const h = ry * 2;
    const path = pen(
      `mon-art-4-wave-${index + 1}`,
      `Contour path ${index + 1}`,
      960 - rx,
      553 - ry,
      w,
      h,
      index % 5 === 0 ? "#9e5c39" : "#af8660",
      index % 5 === 0 ? 1.8 : 1,
      [
        { x: w * 0.02, y: h * 0.51, handleOut: { x: w * 0.02, y: h * 0.2 } },
        {
          x: w * 0.3,
          y: h * 0.06,
          handleIn: { x: w * 0.13, y: h * 0.02 },
          handleOut: { x: w * 0.47, y: h * 0.1 },
        },
        {
          x: w * 0.63,
          y: h * 0.07,
          handleIn: { x: w * 0.51, y: h * 0.15 },
          handleOut: { x: w * 0.84, y: -h * 0.02 },
        },
        {
          x: w * 0.98,
          y: h * 0.42,
          handleIn: { x: w * 0.99, y: h * 0.16 },
          handleOut: { x: w * 1.02, y: h * 0.62 },
        },
        {
          x: w * 0.65,
          y: h * 0.96,
          handleIn: { x: w * 0.79, y: h * 1.03 },
          handleOut: { x: w * 0.46, y: h * 0.93 },
        },
        {
          x: w * 0.27,
          y: h * 0.88,
          handleIn: { x: w * 0.41, y: h * 0.93 },
          handleOut: { x: w * 0.08, y: h * 0.93 },
        },
        { x: w * 0.02, y: h * 0.51, handleIn: { x: 0, y: h * 0.73 } },
      ],
    );
    path.strokeOpacity = index % 5 === 0 ? 88 : 66;
    path.interactions = [
      createDefaultInteraction({
        id: `mon-art-4-wave-response-${index + 1}`,
        name: "Pointer-responsive contour field",
        trigger: "pointer-move",
        triggerArea: "entire-artwork",
        effect: "wave-deform",
        motion: "direct",
        wavePointerX: 82,
        wavePointerY: 48,
        waveAmplitude: 8,
        waveLength: 480,
        waveSpeed: 0.055,
        waveFalloff: 1050,
        wavePhaseSpread: 13,
      }),
    ];
    return path;
  });
  const center = circle(
    "field-topography-center",
    "Terracotta summit",
    960,
    553,
    34,
    "#bd7951",
  );
  center.interactions = [
    createDefaultInteraction({
      id: "field-topography-center-follow",
      name: "Summit follows a passing thought",
      trigger: "pointer-move",
      triggerArea: "entire-artwork",
      effect: "move",
      motion: "direct",
      moveX: 32,
      moveY: 21,
      trackDistance: 620,
    }),
  ];
  const marks = [
    text(
      "field-topography-north",
      "North coordinate",
      "N",
      1782,
      243,
      40,
      30,
      15,
      "#6d5840",
    ),
    pen(
      "field-topography-compass",
      "North indicator",
      1800,
      280,
      1,
      65,
      "#6d5840",
      1,
      [
        { x: 0, y: 0 },
        { x: 0, y: 65 },
      ],
    ),
    text(
      "field-topography-elevation",
      "Elevation annotation",
      "+ 248 m",
      964,
      603,
      130,
      26,
      13,
      "#704d34",
      "Arial",
      "500",
    ),
  ];
  return [...sceneBase(3), ...strokes, center, ...marks];
}

function chrome(index: number): CanvasElement[] {
  const scene = FIELD_NOTES_SCENES[index];
  const prefix = `mon-art-${index + 1}`;
  const symbol = circle(
    `${prefix}-brand-symbol`,
    "Field Notes emblem",
    117,
    83,
    14,
    scene.ink,
  );
  const symbolCut = circle(
    `${prefix}-brand-cut`,
    "Emblem cutout",
    121,
    78,
    8,
    scene.paper,
  );
  const brand = text(
    `${prefix}-brand`,
    "AMOUS collection title",
    "FIELD NOTES",
    150,
    64,
    460,
    45,
    28,
    scene.ink,
    "Arial",
    "600",
  );
  brand.letterSpacing = 5;
  const brandSub = text(
    `${prefix}-brand-sub`,
    "AMOUS collection subtitle",
    "AMOUS / INTERACTIVE COLLECTION",
    104,
    117,
    540,
    24,
    12,
    scene.ink,
  );
  brandSub.letterSpacing = 2;
  const title = text(
    `${prefix}-scene-title`,
    "Scene title",
    scene.name,
    1302,
    76,
    320,
    36,
    18,
    scene.ink,
    "Arial",
    "500",
  );
  title.textAlign = "right";
  title.letterSpacing = 2;
  const close = text(
    `${prefix}-close`,
    "Close label",
    "CLOSE  ×",
    1692,
    76,
    124,
    36,
    15,
    scene.ink,
    "Arial",
    "500",
  );
  close.textAlign = "right";
  close.interactions = [
    createDefaultInteraction({
      id: `${prefix}-close-click`,
      name: "Close artwork",
      trigger: "click-tap",
      effect: "emit-event",
      motion: "direct",
    }),
  ];
  const progress = Array.from({ length: 4 }, (_, dot) => {
    const mark = shape(
      `${prefix}-progress-${dot}`,
      `Chapter ${dot + 1} indicator`,
      "rectangle",
      106 + dot * 50,
      1003,
      34,
      3,
      dot === index ? scene.ink : scene.accent,
    );
    mark.opacity = dot === index ? 100 : 28;
    return mark;
  });
  const next = shape(
    `${prefix}-next-border`,
    "Next field button",
    "rectangle",
    1502,
    972,
    314,
    62,
    scene.ink,
  );
  next.cornerRadius = 31;
  const nextLabel = text(
    `${prefix}-next-label`,
    "Next field label",
    index === 3 ? "BACK TO BREEZE   →" : "NEXT FIELD   →",
    1530,
    990,
    258,
    34,
    16,
    scene.paper,
    "Arial",
    "500",
  );
  nextLabel.textAlign = "center";
  nextLabel.letterSpacing = 1;
  const nextHit = shape(
    `${prefix}-next-hit`,
    "Next scene · Logic trigger",
    "rectangle",
    1502,
    972,
    314,
    62,
  );
  nextHit.cornerRadius = 31;
  nextHit.interactions = [
    createDefaultInteraction({
      id: `${prefix}-next-click`,
      name: "Next Scene",
      trigger: "click-tap",
      effect: "emit-event",
      motion: "direct",
    }),
  ];
  return [
    symbol,
    symbolCut,
    brand,
    brandSub,
    title,
    close,
    ...progress,
    next,
    nextLabel,
    nextHit,
  ];
}

function scaleArtwork(
  elements: CanvasElement[],
  width: number,
  height: number,
): CanvasElement[] {
  const sx = width / 1920;
  const sy = height / 1080;
  const scale = Math.min(sx, sy);
  return elements.map((element) => ({
    ...element,
    x: element.x * sx,
    y: element.y * sy,
    width: element.width * sx,
    height: element.height * sy,
    strokeWidth: element.strokeWidth * scale,
    cornerRadius: element.cornerRadius * scale,
    ...(element.fontSize !== undefined
      ? { fontSize: element.fontSize * scale }
      : {}),
    ...(typeof element.letterSpacing === "number"
      ? { letterSpacing: element.letterSpacing * scale }
      : {}),
    vectorPaths: element.vectorPaths?.map((path) => ({
      ...path,
      points: path.points.map((point) => ({
        ...point,
        x: point.x * sx,
        y: point.y * sy,
        handleIn: point.handleIn
          ? { x: point.handleIn.x * sx, y: point.handleIn.y * sy }
          : undefined,
        handleOut: point.handleOut
          ? { x: point.handleOut.x * sx, y: point.handleOut.y * sy }
          : undefined,
      })),
    })),
    interactions: element.interactions?.map((interaction) => ({
      ...interaction,
      moveX: interaction.moveX * sx,
      moveY: interaction.moveY * sy,
      trackDistance: interaction.trackDistance * scale,
      strandInfluenceRadius: interaction.strandInfluenceRadius * scale,
      strandMaxDisplacement: interaction.strandMaxDisplacement * scale,
      strandNeighborRadius: interaction.strandNeighborRadius * scale,
      trailSpacing: interaction.trailSpacing * scale,
      trailSizeMin: interaction.trailSizeMin * scale,
      trailSizeMax: interaction.trailSizeMax * scale,
      trailBlur: interaction.trailBlur * scale,
      wavePointerX: interaction.wavePointerX * sx,
      wavePointerY: interaction.wavePointerY * sy,
      waveAmplitude: interaction.waveAmplitude * sy,
      waveLength: interaction.waveLength * sx,
      waveFalloff: interaction.waveFalloff * scale,
    })),
  }));
}

export function createFieldNotesSceneElements(
  index: number,
  width: number,
  height: number,
): CanvasElement[] {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= FIELD_NOTES_SCENES.length
  )
    throw new RangeError(`Unknown Field Notes scene index: ${index}`);
  return scaleArtwork(
    [...[breeze, ink, bloom, topography][index](), ...chrome(index)],
    width,
    height,
  );
}

export function createFieldNotesSceneLogicRules(
  index: number,
): SceneLogicRule[] {
  if (!FIELD_NOTES_SCENES[index]) return [];
  const prefix = `mon-art-${index + 1}`;
  return [
    createSceneLogicRule({
      id: `${prefix}-next-rule`,
      objectId: `${prefix}-next-hit`,
      interactionId: `${prefix}-next-click`,
      targetPageId: FIELD_NOTES_SCENES[(index + 1) % 4].id,
    }),
    {
      ...createSceneLogicRule({
        id: `${prefix}-close-rule`,
        objectId: `${prefix}-close`,
        interactionId: `${prefix}-close-click`,
      }),
      action: "end-artwork",
    },
  ];
}
