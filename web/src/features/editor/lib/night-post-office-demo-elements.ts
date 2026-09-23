import { createDefaultInteraction } from "@/features/editor/lib/interaction-model";
import type { CanvasElement } from "@/features/editor/store/editor-store";

export const NIGHT_POST_OFFICE_FIRST_STAR_ID = "night-post-office-star-memory";

const SCENE_WIDTH = 1920;
const SCENE_HEIGHT = 1080;
const MODAL_GROUP_ID = "night-post-office-letter-group";
const MODAL_ID = "night-post-office-letter-dialog";

function svgImage(markup: string) {
  const encoded = encodeURIComponent(markup).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

const nightSky = svgImage(`
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <radialGradient id="sky" cx="53%" cy="25%" r="84%">
      <stop stop-color="#35436b"/>
      <stop offset=".55" stop-color="#1a2747"/>
      <stop offset="1" stop-color="#0c152c"/>
    </radialGradient>
    <radialGradient id="moon"><stop stop-color="#fff4d5"/><stop offset=".75" stop-color="#e6c892"/><stop offset="1" stop-color="#c79570"/></radialGradient>
    <linearGradient id="wall" x2=".8" y2="1"><stop stop-color="#e5c49b"/><stop offset="1" stop-color="#a87867"/></linearGradient>
    <linearGradient id="roof" x2="0" y2="1"><stop stop-color="#9a6470"/><stop offset="1" stop-color="#593f5a"/></linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="22"/></filter>
  </defs>
  <rect width="1920" height="1080" fill="url(#sky)"/>
  <path d="M0 756 Q335 674 646 771 T1308 740 T1920 790 V1080 H0Z" fill="#111c34"/>
  <path d="M0 854 Q394 762 825 876 T1920 820 V1080 H0Z" fill="#0c172b"/>
  <circle cx="1462" cy="202" r="104" fill="#eacb91" opacity=".29" filter="url(#glow)"/>
  <circle cx="1462" cy="202" r="75" fill="url(#moon)"/>
  <circle cx="1438" cy="174" r="14" fill="#c99f79" opacity=".24"/>
  <circle cx="1492" cy="218" r="22" fill="#c99f79" opacity=".18"/>
  <g fill="#ead8b1">
    <circle cx="102" cy="116" r="2"/><circle cx="244" cy="198" r="2"/><circle cx="393" cy="94" r="3"/>
    <circle cx="554" cy="160" r="2"/><circle cx="654" cy="83" r="2"/><circle cx="1018" cy="113" r="2"/>
    <circle cx="1293" cy="124" r="2"/><circle cx="1682" cy="105" r="3"/><circle cx="1797" cy="274" r="2"/>
    <circle cx="187" cy="444" r="2"/><circle cx="349" cy="361" r="2"/><circle cx="1580" cy="410" r="2"/>
    <circle cx="1769" cy="520" r="2"/><circle cx="117" cy="611" r="2"/><circle cx="1684" cy="638" r="2"/>
  </g>
  <g fill="none" stroke="#e9c990" stroke-opacity=".42" stroke-width="2" stroke-dasharray="9 13">
    <path d="M774 405 960 352 1146 405"/>
  </g>
  <path d="M603 687 960 520 1317 687Z" fill="#4d3b58" stroke="#d0a779" stroke-width="7"/>
  <path d="M651 691H1269V1053H651Z" fill="url(#wall)" stroke="#674d57" stroke-width="9"/>
  <path d="M673 722H1247V1044H673Z" fill="#c69a7d" opacity=".62"/>
  <path d="M838 835Q838 755 960 755T1082 835V1053H838Z" fill="#3b314a" stroke="#edd09e" stroke-width="9"/>
  <path d="M878 844Q878 788 960 788T1042 844V1053H878Z" fill="#202c42"/>
  <circle cx="1015" cy="937" r="7" fill="#e8c583"/>
  <g fill="#f4d18e" stroke="#73555a" stroke-width="7">
    <path d="M698 778H808V900H698Z"/><path d="M1112 778H1222V900H1112Z"/>
  </g>
  <path d="M753 778V900M698 838H808M1167 778V900M1112 838H1222" stroke="#79545a" stroke-width="6"/>
  <rect x="817" y="659" width="286" height="70" rx="9" fill="#293149" stroke="#e3bb83" stroke-width="5"/>
  <text x="960" y="701" text-anchor="middle" fill="#f3d5a4" font-family="Georgia, serif" font-size="30" letter-spacing="4">NIGHT POST</text>
  <text x="122" y="165" fill="#f2dfbb" font-family="Georgia, serif" font-size="28" letter-spacing="8">AMOUS · NIGHT POST</text>
  <text x="122" y="235" fill="#fbedd5" font-family="Georgia, serif" font-size="56">별을 배달하는 우체국</text>
  <text x="122" y="282" fill="#bdc5d6" font-family="sans-serif" font-size="25">별 편지를 빈 금빛 자리에 놓아 주세요.</text>
  <text x="122" y="315" fill="#8fa0bd" font-family="sans-serif" font-size="21">편지 봉투를 누르면 밤의 문장이 열립니다.</text>
  <text x="1680" y="1014" text-anchor="end" fill="#8993ae" font-family="Georgia, serif" font-size="20" letter-spacing="4">MEMORY · HELLO · DREAM</text>
</svg>`);

function starArtwork(word: string) {
  return svgImage(`
<svg xmlns="http://www.w3.org/2000/svg" width="130" height="146" viewBox="0 0 130 146">
  <defs><radialGradient id="halo"><stop stop-color="#fce3a6" stop-opacity=".5"/><stop offset="1" stop-color="#fce3a6" stop-opacity="0"/></radialGradient></defs>
  <circle cx="65" cy="63" r="61" fill="url(#halo)"/>
  <path d="M65 10 77 43 112 45 85 67 94 101 65 82 36 101 45 67 18 45 53 43Z" fill="#f5d891" stroke="#fff1cc" stroke-width="4" stroke-linejoin="round"/>
  <path d="M46 55H84V78H46Z" fill="#fff8e8" stroke="#aa7567" stroke-width="2"/>
  <path d="M46 55 65 68 84 55" fill="none" stroke="#aa7567" stroke-width="2"/>
  <text x="65" y="135" text-anchor="middle" fill="#f6e5c4" font-family="sans-serif" font-size="17" font-weight="600">${word}</text>
</svg>`);
}

const letterEnvelope = svgImage(`
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="135" viewBox="0 0 160 135">
  <defs><radialGradient id="glow"><stop stop-color="#f3d69b" stop-opacity=".4"/><stop offset="1" stop-color="#f3d69b" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="80" cy="64" rx="78" ry="62" fill="url(#glow)"/>
  <rect x="29" y="33" width="102" height="70" rx="7" fill="#eed4a9" stroke="#fff0c9" stroke-width="3"/>
  <path d="M30 39 80 74 130 39M30 98 65 65M130 98 95 65" fill="none" stroke="#9b705f" stroke-width="3"/>
  <circle cx="80" cy="72" r="11" fill="#a64756"/>
  <text x="80" y="128" text-anchor="middle" fill="#fbe8bd" font-family="sans-serif" font-size="15" font-weight="600">편지 열기</text>
</svg>`);

function element(
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
    rotation: 0,
    opacity: 100,
    fill,
    stroke: "transparent",
    strokeWidth: 0,
    strokeStyle: "none",
    cornerRadius: 0,
    visible: true,
    locked: false,
  };
}

export function createNightPostOfficeDemoElements(
  artboardWidth: number,
  artboardHeight: number,
): CanvasElement[] {
  const sx = artboardWidth / SCENE_WIDTH;
  const sy = artboardHeight / SCENE_HEIGHT;
  const scaled = (
    id: string,
    name: string,
    type: CanvasElement["type"],
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: string,
  ) => element(id, name, type, x * sx, y * sy, width * sx, height * sy, fill);

  const backdrop = element(
    "night-post-office-backdrop",
    "밤하늘과 우체국",
    "image",
    0,
    0,
    artboardWidth,
    artboardHeight,
  );
  backdrop.src = nightSky;
  backdrop.locked = true;

  const destinations = [
    { id: "night-post-office-slot-1", x: 719, y: 350 },
    { id: "night-post-office-slot-2", x: 905, y: 297 },
    { id: "night-post-office-slot-3", x: 1091, y: 350 },
  ];
  const slots = destinations.map(({ id, x, y }, index) => {
    const slot = scaled(
      id,
      `별자리 ${index + 1}번 자리`,
      "circle",
      x,
      y,
      110,
      110,
      "#33415e",
    );
    slot.fillOpacity = 76;
    slot.stroke = "#efd090";
    slot.strokeStyle = "dashed";
    slot.strokeWidth = 3 * sx;
    return slot;
  });

  const starSpecs = [
    { id: NIGHT_POST_OFFICE_FIRST_STAR_ID, name: "그리움", x: 336, y: 710 },
    { id: "night-post-office-star-hello", name: "안부", x: 1490, y: 724 },
    { id: "night-post-office-star-dream", name: "꿈", x: 293, y: 864 },
  ];
  const stars = starSpecs.map(({ id, name, x, y }) => {
    const star = scaled(id, `${name} · 별 편지`, "image", x, y, 130, 146);
    star.src = starArtwork(name);
    star.interactions = destinations.map((target, index) =>
      createDefaultInteraction({
        id: `${id}-drop-${index + 1}`,
        name: `${name} → 별자리 ${index + 1}번 자리`,
        trigger: "drop-on-target",
        collisionTarget: target.id,
        dropTolerance: 10 * Math.min(sx, sy),
        targetCapacity: 1,
        occupiedBehavior: "reject",
        effect: "snap-to-target",
        snapAnchor: "center",
        motion: "spring",
        duration: 0.35,
        resetMode: "contextual",
      }),
    );
    return star;
  });

  const opener = scaled(
    "night-post-office-letter-opener",
    "편지 열기",
    "image",
    880,
    819,
    160,
    135,
  );
  opener.src = letterEnvelope;
  opener.interactions = [
    createDefaultInteraction({
      id: "night-post-office-open-letter",
      name: "봉투를 눌러 편지 열기",
      trigger: "click-tap",
      effect: "open-modal",
      modalTarget: MODAL_ID,
      modalBackdrop: true,
      modalCloseOnEscape: true,
      modalCloseOnBackdrop: true,
      modalTrapFocus: true,
      modalRestoreFocus: true,
      motion: "direct",
    }),
  ];

  const card = scaled(
    "night-post-office-letter-card",
    "편지 카드",
    "rectangle",
    585,
    217,
    750,
    647,
    "#f4e8d3",
  );
  card.cornerRadius = 24 * sx;
  card.groupId = MODAL_GROUP_ID;
  card.stroke = "#d2a978";
  card.strokeWidth = 4 * sx;
  card.strokeStyle = "solid";

  const modalText = (
    id: string,
    name: string,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fontSize: number,
    fill: string,
    fontFamily = "Georgia, serif",
  ) => {
    const field = scaled(id, name, "text", x, y, width, height, fill);
    field.groupId = MODAL_GROUP_ID;
    field.text = text;
    field.textResizeMode = "fixed";
    field.fontFamily = fontFamily;
    field.fontSize = fontSize * Math.min(sx, sy);
    field.lineHeight = 1.42;
    field.textAlign = "center";
    return field;
  };
  const dialog = modalText(
    MODAL_ID,
    "오늘의 편지",
    "오늘의 수신인에게\n\n잘 지내고 있나요?\n\n가장 어두운 밤에도\n당신을 생각하는 작은 빛이 있어요.\n그 빛이 길을 잃지 않도록\n오늘의 안부를 별에 묶어 보냅니다.\n\n밤의 우체국에서, 당신을 기억하는 이가",
    675,
    291,
    570,
    525,
    34,
    "#4f4050",
  );
  const close = modalText(
    "night-post-office-letter-close",
    "편지 닫기",
    "×",
    1256,
    248,
    56,
    70,
    52,
    "#684d57",
    "Arial, sans-serif",
  );
  close.interactions = [
    createDefaultInteraction({
      id: "night-post-office-close-letter",
      name: "닫기 버튼",
      trigger: "click-tap",
      effect: "close-modal",
      modalTarget: MODAL_ID,
      motion: "direct",
    }),
  ];

  return [
    backdrop,
    ...slots,
    ...stars,
    opener,
    card,
    dialog,
    close,
  ];
}
