/** Storybook artwork for the Pinocchio nose-spring demo.
 *
 * The nose is intentionally absent. Render it as a separate, interactive
 * element from PINOCCHIO_NOSE_BASE to the desired resting tip.
 */
export const PINOCCHIO_ART_VIEWBOX = { width: 1920, height: 1080 } as const;
export const PINOCCHIO_NOSE_BASE = { x: 870, y: 545 } as const;
export const PINOCCHIO_NOSE_REST_TIP = { x: 1080, y: 545 } as const;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2=".8" y2="1">
      <stop stop-color="#17384a"/><stop offset=".43" stop-color="#486079"/>
      <stop offset=".78" stop-color="#c88185"/><stop offset="1" stop-color="#edb783"/>
    </linearGradient>
    <radialGradient id="moonGlow"><stop stop-color="#fff6ca" stop-opacity=".58"/><stop offset="1" stop-color="#fff6ca" stop-opacity="0"/></radialGradient>
    <linearGradient id="hills" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#637d77"/><stop offset="1" stop-color="#334d55"/></linearGradient>
    <linearGradient id="stage" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#a9635c"/><stop offset="1" stop-color="#4a384a"/></linearGradient>
    <linearGradient id="face" x1="0" y1="0" x2="1" y2=".2"><stop stop-color="#ffe7ae"/><stop offset=".65" stop-color="#f4bc83"/><stop offset="1" stop-color="#de855e"/></linearGradient>
    <radialGradient id="noseRootShade"><stop stop-color="#a9604e" stop-opacity=".26"/><stop offset=".58" stop-color="#bd7658" stop-opacity=".13"/><stop offset="1" stop-color="#bd7658" stop-opacity="0"/></radialGradient>
    <linearGradient id="hat" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe78b"/><stop offset=".72" stop-color="#efad49"/><stop offset="1" stop-color="#c26d43"/></linearGradient>
    <linearGradient id="shirt" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff2cf"/><stop offset="1" stop-color="#d6c6a5"/></linearGradient>
    <linearGradient id="vest" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7ba9a0"/><stop offset="1" stop-color="#335f66"/></linearGradient>
    <linearGradient id="shoe" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#5d4050"/><stop offset="1" stop-color="#2a3040"/></linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="23"/></filter>
    <filter id="drop" x="-35%" y="-35%" width="170%" height="170%"><feDropShadow dx="8" dy="18" stdDeviation="17" flood-color="#202d3f" flood-opacity=".35"/></filter>
    <filter id="smallGlow"><feGaussianBlur stdDeviation="6"/></filter>
    <pattern id="grain" width="92" height="88" patternUnits="userSpaceOnUse"><circle cx="9" cy="17" r="1" fill="#fff" opacity=".14"/><circle cx="70" cy="61" r="1.4" fill="#fff" opacity=".1"/></pattern>
  </defs>

  <!-- A warm, layered twilight forest. The clear right-hand space gives the nose room to stretch. -->
  <rect width="1920" height="1080" fill="url(#sky)"/>
  <circle cx="1460" cy="263" r="315" fill="url(#moonGlow)"/>
  <circle cx="1460" cy="263" r="78" fill="#fff3cd" opacity=".9"/>
  <circle cx="1438" cy="244" r="67" fill="#fff9df" opacity=".55"/>
  <g fill="#fff7d8" opacity=".8">
    <circle cx="159" cy="150" r="3"/><circle cx="325" cy="86" r="2"/><circle cx="507" cy="187" r="2.5"/>
    <circle cx="1108" cy="110" r="2"/><circle cx="1222" cy="214" r="2.5"/><circle cx="1724" cy="137" r="3"/>
    <circle cx="1804" cy="311" r="2"/><circle cx="1015" cy="290" r="2"/><circle cx="1645" cy="384" r="2.5"/>
  </g>
  <path d="M0 654 Q262 491 537 647 Q726 492 956 633 Q1231 429 1474 617 Q1732 479 1920 608 L1920 1080 H0Z" fill="#697a7e" opacity=".5"/>
  <path d="M0 725 Q282 552 536 680 Q790 507 1065 671 Q1328 546 1569 695 Q1757 566 1920 682 V1080 H0Z" fill="url(#hills)"/>
  <path d="M0 833 Q305 712 597 821 Q950 675 1228 821 Q1584 676 1920 817 V1080 H0Z" fill="#294b53"/>
  <g opacity=".37" fill="#193f48">
    <path d="M60 760 l65-164 64 164h-36l52 91H39l50-91z"/><path d="M248 783 l53-145 53 145h-31l43 84H236l39-84z"/>
    <path d="M1257 760 l60-173 62 173h-33l52 91h-161l49-91z"/><path d="M1708 746 l73-186 73 186h-41l61 115h-184l58-115z"/>
    <path d="M1844 790 l42-115 42 115h-25l35 70h-106l33-70z"/>
  </g>
  <path d="M0 932 Q352 861 712 938 Q1134 861 1518 938 Q1769 893 1920 917 V1080 H0Z" fill="#243f47"/>
  <ellipse cx="960" cy="1096" rx="1210" ry="222" fill="#d18470" opacity=".35" filter="url(#blur)"/>

  <!-- A tiny lantern-lit cottage, and drifting fireflies. -->
  <g opacity=".75" transform="translate(1503 688)">
    <path d="M0 64 75 5l78 59v115H0Z" fill="#274750"/><path d="M-13 70 75-3l91 73" fill="none" stroke="#1a3945" stroke-width="20" stroke-linecap="round"/>
    <path d="M55 117h40v62H55z" fill="#fbc27f"/><path d="M54 116h42v63H54z" fill="none" stroke="#1c3943" stroke-width="8"/>
    <path d="M109 70h24v27h-24z" fill="#f6d48e"/><path d="M110 71h22v25h-22z" fill="none" stroke="#1c3943" stroke-width="5"/>
    <ellipse cx="74" cy="178" rx="110" ry="20" fill="#f1ae77" opacity=".32" filter="url(#blur)"/>
  </g>
  <g fill="#fbe7a4">
    <circle cx="1257" cy="563" r="18" opacity=".33" filter="url(#smallGlow)"/><circle cx="1257" cy="563" r="4"/>
    <circle cx="1344" cy="750" r="14" opacity=".28" filter="url(#smallGlow)"/><circle cx="1344" cy="750" r="3"/>
    <circle cx="1144" cy="820" r="17" opacity=".25" filter="url(#smallGlow)"/><circle cx="1144" cy="820" r="3"/>
    <circle cx="416" cy="691" r="14" opacity=".28" filter="url(#smallGlow)"/><circle cx="416" cy="691" r="3"/>
    <circle cx="151" cy="599" r="13" opacity=".28" filter="url(#smallGlow)"/><circle cx="151" cy="599" r="3"/>
  </g>

  <!-- Curved boards suggest a little puppet-theatre stage without a hard horizon. -->
  <path d="M0 1015 Q931 908 1920 1002 V1080 H0Z" fill="url(#stage)"/>
  <path d="M0 1025 Q964 925 1920 1012" fill="none" stroke="#ecae7f" stroke-width="9" opacity=".35"/>
  <path d="M0 1067 Q952 976 1920 1057" fill="none" stroke="#462e40" stroke-width="12" opacity=".25"/>
  <ellipse cx="823" cy="1020" rx="304" ry="58" fill="#243746" opacity=".34" filter="url(#blur)"/>

  <!-- Pinocchio: only the long, interactive part of his nose is omitted. -->
  <g transform="translate(55 -30)" filter="url(#drop)">
    <!-- Shoes and small wooden legs. -->
    <path d="M706 907q-7 39-5 78l61 8 24-80z" fill="#edbd82" stroke="#9f6754" stroke-width="9"/>
    <path d="M856 913q0 44 4 80l59 5 20-83z" fill="#eab37d" stroke="#9f6754" stroke-width="9"/>
    <path d="M698 972q-17 23-68 35-46 11-42 32 2 24 40 26h158q28-3 27-26l-9-54z" fill="url(#shoe)" stroke="#2b3341" stroke-width="9"/>
    <path d="M846 979q-2 26 3 58 2 26 30 27h149q26-3 27-24-2-18-47-29l-92-37z" fill="url(#shoe)" stroke="#2b3341" stroke-width="9"/>
    <path d="M613 1040q84 9 188-1M855 1040q80 11 183-2" fill="none" stroke="#e6a278" stroke-width="7" opacity=".5"/>

    <!-- Sleeves, arms and rounded hands. -->
    <path d="M678 690q-88-31-116 37l-44 143 78 20 68-112 51-33z" fill="url(#shirt)" stroke="#845d5a" stroke-width="10"/>
    <path d="M913 693q81-26 120 54l53 107-66 35-75-101-40-16z" fill="url(#shirt)" stroke="#845d5a" stroke-width="10"/>
    <path d="M520 853q-5 43 25 65 20 14 43-2 28-18 13-59z" fill="url(#face)" stroke="#a36652" stroke-width="9"/>
    <path d="M1015 858q-16 33 0 55 17 22 43 17 27-5 35-42l-19-34z" fill="url(#face)" stroke="#a36652" stroke-width="9"/>
    <path d="M548 870q25 16 42 3M1028 882q27 13 48-2" fill="none" stroke="#fff0c4" stroke-width="8" opacity=".55" stroke-linecap="round"/>

    <!-- Shirt and blue-green overalls. -->
    <path d="M713 648q-94 36-90 124l26 170q17 50 160 54 149 1 178-55l-5-164q-9-93-106-127z" fill="url(#shirt)" stroke="#805b59" stroke-width="11"/>
    <path d="M677 737q-8 62 6 191 12 49 123 52 117 2 142-50l8-197-88 29-23 88h-72l-17-88z" fill="url(#vest)" stroke="#31525b" stroke-width="11"/>
    <path d="M680 700q-17 23-18 56l114 65 18-42zM941 700q16 25 17 59l-113 62-16-41z" fill="#6c9a93" stroke="#31525b" stroke-width="10"/>
    <path d="M679 749q34 29 88 50M953 749q-42 34-101 52" fill="none" stroke="#b9d4bd" stroke-width="7" opacity=".65"/>
    <circle cx="779" cy="803" r="17" fill="#ffd27c" stroke="#995d4c" stroke-width="5"/><circle cx="848" cy="803" r="17" fill="#ffd27c" stroke="#995d4c" stroke-width="5"/>
    <path d="M771 867q41 20 87 0v54q-43 30-87 0z" fill="#3e7478" stroke="#294f59" stroke-width="7"/>
    <path d="M788 877q24 12 52 0" fill="none" stroke="#9ac2ae" stroke-width="5" opacity=".7"/>
    <path d="M806 942v37" fill="none" stroke="#31535b" stroke-width="8"/>

    <!-- Red neckerchief, distinct against the cream collar. -->
    <path d="M737 643q77 45 144-3l-18 85q-42 35-90-2z" fill="#b7424e" stroke="#854553" stroke-width="9"/>
    <path d="M810 695q-36 38-47 89 47-8 65-39l15 81q30-29 25-75l-18-53z" fill="#c94a50" stroke="#8b4050" stroke-width="8"/>
    <path d="M790 714q25 15 53 0" fill="none" stroke="#f9b188" stroke-width="7" opacity=".58"/>

    <!-- Neck, round wooden ears, and soft face silhouette. -->
    <path d="M759 604v67q38 41 100 0v-68z" fill="#d99468" stroke="#a56655" stroke-width="9"/>
    <ellipse cx="661" cy="521" rx="43" ry="55" fill="url(#face)" stroke="#9f6758" stroke-width="10"/>
    <path d="M655 500q-26 23-6 53" fill="none" stroke="#bd785e" stroke-width="9" stroke-linecap="round"/>
    <path d="M702 390q91-72 177 5 65 51 67 143-1 107-77 153-72 44-148-1-67-44-75-144-8-103 56-156z" fill="url(#face)" stroke="#a36455" stroke-width="11"/>
    <path d="M681 550q7 83 70 118" fill="none" stroke="#fff0bb" stroke-width="17" opacity=".37" stroke-linecap="round"/>
    <ellipse cx="880" cy="571" rx="45" ry="30" fill="#e78c76" opacity=".45"/>
    <ellipse cx="711" cy="579" rx="37" ry="28" fill="#ef9a7c" opacity=".36"/>
    <path d="M775 612q43 37 86-7" fill="none" stroke="#9c514f" stroke-width="9" stroke-linecap="round"/>
    <path d="M789 616q34 15 59-3" fill="none" stroke="#fff6cd" stroke-width="5" opacity=".7" stroke-linecap="round"/>
    <circle cx="738" cy="531" r="4" fill="#a55d53" opacity=".65"/><circle cx="752" cy="539" r="3" fill="#a55d53" opacity=".55"/>

    <!-- Dark storybook curls, eyebrows, and bright watchful eyes. -->
    <path d="M655 475q-23-57 31-100 15-58 86-60 63-27 117 21 57 8 65 78 11 32-17 64-5-68-38-79-38 18-70-5-43 20-72-4-49 42-102 85z" fill="#383b4b" stroke="#313744" stroke-width="10"/>
    <path d="M680 404q-25 3-26 32 12 25 37 10M735 355q-22 18-5 42 18 16 39-5M824 341q-21 21-2 43 20 12 39-8M905 369q-15 19-1 39 21 14 39-6" fill="none" stroke="#5b4b56" stroke-width="22" stroke-linecap="round"/>
    <path d="M715 484q27-18 49-4M829 471q33-17 59 5" fill="none" stroke="#55424b" stroke-width="11" stroke-linecap="round"/>
    <ellipse cx="748" cy="520" rx="19" ry="27" fill="#fff3d4"/><ellipse cx="860" cy="516" rx="21" ry="28" fill="#fff3d4"/>
    <ellipse cx="755" cy="521" rx="10" ry="17" fill="#51474b"/><ellipse cx="869" cy="516" rx="11" ry="18" fill="#51474b"/>
    <circle cx="758" cy="514" r="4" fill="#fff"/><circle cx="873" cy="508" r="4" fill="#fff"/>
    <path d="M725 557q20 13 43 0M842 554q27 13 48-3" fill="none" stroke="#b87462" stroke-width="5" opacity=".5"/>
    <!-- The fixed bridge is only soft skin shading; the moving nose supplies its own volume. -->
    <path d="M804 537q-10 17-8 34" fill="none" stroke="#fff0c1" stroke-width="10" stroke-linecap="round" opacity=".3" filter="url(#smallGlow)"/>
    <path d="M819 536q10 16 11 34" fill="none" stroke="#aa664f" stroke-width="9" stroke-linecap="round" opacity=".24" filter="url(#smallGlow)"/>
    <ellipse cx="815" cy="575" rx="27" ry="24" fill="url(#noseRootShade)"/>
    <path d="M806 581q8 5 17 0" fill="none" stroke="#9f594b" stroke-width="3" stroke-linecap="round" opacity=".25"/>

    <!-- A jaunty feathered hat. -->
    <path d="M690 378q1-112 84-146 89-26 148 41l20 108q-116 50-252-3z" fill="url(#hat)" stroke="#a66b47" stroke-width="11"/>
    <path d="M697 338q120 44 231-3l11 46q-118 52-250-2z" fill="#518b8a" stroke="#376e75" stroke-width="8"/>
    <path d="M649 375q128 69 325 0 27-5 30 17-147 82-347 10-23-11-8-27z" fill="#e9a747" stroke="#9e6245" stroke-width="11"/>
    <path d="M715 285q67-99 22-174 85 26 70 106-7 37-48 81z" fill="#d35b5d" stroke="#914a57" stroke-width="9"/>
    <path d="M740 125q27 97 0 143" fill="none" stroke="#f8aa83" stroke-width="6" opacity=".7"/>
    <path d="M739 271q16-39 24-89" fill="none" stroke="#fff0b3" stroke-width="5" opacity=".65"/>
    <path d="M745 253q13-14 30-18" fill="none" stroke="#9a4a55" stroke-width="5"/>
    <circle cx="775" cy="354" r="14" fill="#f6cf76" stroke="#9f6349" stroke-width="5"/>
  </g>
  <g opacity=".82" font-family="Trebuchet MS,Arial,sans-serif" letter-spacing="5" fill="#fff3d3">
    <text x="1382" y="953" font-size="23" font-weight="bold">PULL THE NOSE</text>
    <path d="M1380 969h275" stroke="#fff3d3" stroke-width="2" opacity=".57"/>
  </g>
  <rect width="1920" height="1080" fill="url(#grain)" pointer-events="none"/>
</svg>`;

// ShapeGraphic embeds image URLs in an unquoted CSS url(), so escape the
// punctuation left unchanged by encodeURIComponent as the MON demo does.
export const pinocchioBackdropSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  svg,
).replace(
  /[!'()*]/g,
  (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
)}`;

export const pinocchioDemoArtSrc = pinocchioBackdropSvg;

/** Ordinary transparent SVG asset: the bend renderer never knows its ID. */
export const pinocchioNoseSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  // Higher intrinsic resolution keeps the rasterized texture clean when the
  // shaft stretches; the authored viewBox and on-board dimensions stay intact.
  `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="208" viewBox="0 0 210 52">
    <defs>
      <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffe0aa"/><stop offset=".3" stop-color="#f4b57e"/>
        <stop offset=".72" stop-color="#dc9164"/><stop offset="1" stop-color="#aa5e49"/>
      </linearGradient>
    </defs>
    <path d="M0 6H185A20 20 0 0 1 185 46H0Z" fill="url(#wood)" stroke="#9b604b" stroke-width="3.5"/>
    <path d="M0 6V46" stroke="#eeb07d" stroke-width="5"/>
  </svg>`,
).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)}`;
