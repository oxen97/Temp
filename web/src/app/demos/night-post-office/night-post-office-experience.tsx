"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent } from "react";

import styles from "./night-post-office.module.css";

type Point = { x: number; y: number };
type LetterId = "memory" | "hello" | "dream";

type LetterStar = {
  id: LetterId;
  title: string;
  word: string;
  start: Point;
};

type DragSession = {
  id: LetterId;
  offset: Point;
};

const LETTER_STARS: LetterStar[] = [
  {
    id: "memory",
    title: "그리움",
    word: "오래 간직한 마음",
    start: { x: 166, y: 333 },
  },
  {
    id: "hello",
    title: "안부",
    word: "오늘의 작은 소식",
    start: { x: 818, y: 361 },
  },
  {
    id: "dream",
    title: "꿈",
    word: "아직 오지 않은 내일",
    start: { x: 276, y: 525 },
  },
];

const CONSTELLATION: Point[] = [
  { x: 424, y: 232 },
  { x: 500, y: 187 },
  { x: 576, y: 232 },
];

const INITIAL_POSITIONS: Record<LetterId, Point> = {
  memory: LETTER_STARS[0].start,
  hello: LETTER_STARS[1].start,
  dream: LETTER_STARS[2].start,
};

const TWINKLING_STARS = [
  [71, 94, 1.6, 0.1],
  [146, 155, 1.2, 1.3],
  [252, 91, 1.5, 0.8],
  [338, 152, 1.1, 2.2],
  [440, 84, 1.4, 0.5],
  [532, 126, 1.2, 1.7],
  [628, 77, 1.7, 0.2],
  [714, 119, 1.1, 2.4],
  [889, 87, 1.5, 0.9],
  [940, 189, 1.1, 1.8],
  [87, 250, 1.2, 2.1],
  [219, 237, 1.1, 0.6],
  [323, 282, 1.4, 1.1],
  [678, 272, 1.1, 2.5],
  [900, 300, 1.4, 0.4],
  [117, 395, 1.1, 1.6],
  [886, 425, 1.5, 0.7],
  [953, 505, 1.1, 2.3],
  [82, 552, 1.4, 1.4],
  [714, 566, 1.1, 0.3],
  [932, 592, 1.3, 2.6],
] as const;

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function positionFor(id: LetterId) {
  return (
    LETTER_STARS.find((letter) => letter.id === id)?.start ?? { x: 500, y: 500 }
  );
}

export function NightPostOfficeExperience() {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const targetRefs = useRef<Array<SVGGElement | null>>([]);
  const letterCloseRef = useRef<HTMLButtonElement>(null);
  const readLetterRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [positions, setPositions] = useState(INITIAL_POSITIONS);
  const [landings, setLandings] = useState<Record<LetterId, number | null>>({
    memory: null,
    hello: null,
    dream: null,
  });
  const [draggingId, setDraggingId] = useState<LetterId | null>(null);
  const [selectedStar, setSelectedStar] = useState<LetterId | null>(null);
  const [letterOpen, setLetterOpen] = useState(false);
  const [announcement, setAnnouncement] = useState(
    "별 하나를 하늘의 빈자리에 놓아 주세요.",
  );

  const scenePoint = (clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  };

  const placeStar = (id: LetterId, targetIndex: number) => {
    if (landings[id] !== null) return;
    const targetOccupied = Object.entries(landings).some(
      ([otherId, landing]) => otherId !== id && landing === targetIndex,
    );
    if (targetOccupied) return;

    const nextLandings = { ...landings, [id]: targetIndex };
    setLandings(nextLandings);
    setPositions((current) => ({
      ...current,
      [id]: CONSTELLATION[targetIndex],
    }));
    setSelectedStar(null);
    const letter = LETTER_STARS.find((item) => item.id === id);
    const count = Object.values(nextLandings).filter(
      (landing) => landing !== null,
    ).length;
    if (count === LETTER_STARS.length) {
      setAnnouncement("세 개의 별이 편지를 찾아냈어요.");
      setLetterOpen(true);
    } else {
      setAnnouncement(
        `${letter?.title ?? "별"}의 편지가 자리를 찾았어요. ${count}/3`,
      );
    }
  };

  const handlePointerDown = (
    event: PointerEvent<SVGGElement>,
    id: LetterId,
  ) => {
    if (landings[id] !== null) return;
    const point = scenePoint(event.clientX, event.clientY);
    if (!point) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id,
      offset: { x: positions[id].x - point.x, y: positions[id].y - point.y },
    };
    setDraggingId(id);
    setSelectedStar(id);
    setAnnouncement("별을 빈 금빛 자리에 데려가 주세요.");
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = scenePoint(event.clientX, event.clientY);
    if (!point) return;
    setPositions((current) => ({
      ...current,
      [drag.id]: {
        x: Math.max(34, Math.min(966, point.x + drag.offset.x)),
        y: Math.max(62, Math.min(608, point.y + drag.offset.y)),
      },
    }));
  };

  const finishDrag = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point =
      scenePoint(event.clientX, event.clientY) ?? positions[drag.id];
    const occupiedTargets = new Set(
      Object.values(landings).filter(
        (landing): landing is number => landing !== null,
      ),
    );
    const nearest = CONSTELLATION.map((target, index) => ({
      index,
      distance: distance(point, target),
    }))
      .filter(({ index }) => !occupiedTargets.has(index))
      .sort((a, b) => a.distance - b.distance)[0];

    dragRef.current = null;
    setDraggingId(null);
    if (nearest && nearest.distance < 66) {
      placeStar(drag.id, nearest.index);
    } else {
      setPositions((current) => ({
        ...current,
        [drag.id]: positionFor(drag.id),
      }));
      setSelectedStar(null);
      setAnnouncement(
        "별이 제자리로 돌아왔어요. 금빛 자리를 향해 다시 보내 보세요.",
      );
    }
  };

  const cancelDrag = () => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    setDraggingId(null);
    setPositions((current) => ({
      ...current,
      [drag.id]: positionFor(drag.id),
    }));
  };

  const resetScene = () => {
    dragRef.current = null;
    setPositions(INITIAL_POSITIONS);
    setLandings({ memory: null, hello: null, dream: null });
    setSelectedStar(null);
    setDraggingId(null);
    setLetterOpen(false);
    setAnnouncement("별 하나를 하늘의 빈자리에 놓아 주세요.");
  };

  const selectStarWithKeyboard = (id: LetterId) => {
    if (landings[id] !== null) return;
    if (selectedStar === id) {
      setSelectedStar(null);
      setAnnouncement(
        `${LETTER_STARS.find((item) => item.id === id)?.title} 별 선택을 해제했어요.`,
      );
      return;
    }

    setSelectedStar(id);
    const letter = LETTER_STARS.find((item) => item.id === id);
    setAnnouncement(
      `${letter?.title ?? "별"} 별을 선택했어요. 포커스가 이동한 빈 자리에서 Enter를 누르세요.`,
    );
    const firstEmptyTarget = CONSTELLATION.findIndex(
      (_, index) => !Object.values(landings).includes(index),
    );
    if (firstEmptyTarget >= 0) {
      window.requestAnimationFrame(() =>
        targetRefs.current[firstEmptyTarget]?.focus(),
      );
    }
  };

  useEffect(() => {
    if (!letterOpen) return;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusFrame = window.requestAnimationFrame(() =>
      letterCloseRef.current?.focus(),
    );
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setLetterOpen(false);
      window.requestAnimationFrame(() => {
        (readLetterRef.current ?? restoreFocusRef.current)?.focus();
      });
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [letterOpen]);

  const closeLetter = () => {
    setLetterOpen(false);
    window.requestAnimationFrame(() => {
      (readLetterRef.current ?? restoreFocusRef.current)?.focus();
    });
  };

  const targetStarIds = CONSTELLATION.map(
    (_, targetIndex) =>
      LETTER_STARS.find((letter) => landings[letter.id] === targetIndex)?.id ??
      null,
  );
  const deliveredCount = Object.values(landings).filter(
    (landing) => landing !== null,
  ).length;

  return (
    <main className={styles.root}>
      <p
        className={styles.visuallyHidden}
        aria-atomic="true"
        aria-live="polite"
      >
        {announcement}
      </p>
      <header className={styles.topbar}>
        <Link
          className={styles.brand}
          href="/"
          aria-label="AMOUS 메인으로 이동"
        >
          <span className={styles.brandMark} aria-hidden="true">
            <svg viewBox="0 0 40 40" role="presentation">
              <path d="M20 2.8 23.8 15l12.5 1.3-9.6 8.1 3 12.1L20 29.8l-9.7 6.7 3-12.1-9.6-8.1L16.2 15z" />
              <circle cx="20" cy="20" r="4.1" />
            </svg>
          </span>
          <span>
            <span className={styles.brandName}>AMOUS</span>
            <span className={styles.brandCaption}>
              A SMALL INTERACTIVE STORY
            </span>
          </span>
        </Link>
        <div className={styles.topbarRight}>
          <span className={styles.issue}>NIGHT POST · NO. 01</span>
          <span className={styles.openStatus}>
            <i aria-hidden="true" /> 오늘 밤, 배달 중
          </span>
        </div>
      </header>

      <section className={styles.intro} aria-labelledby="story-title">
        <p className={styles.eyebrow}>별을 배달하는 우체국</p>
        <h1 id="story-title">
          밤은 주소가 되고,
          <br />
          <em>별은 편지가 됩니다.</em>
        </h1>
        <p className={styles.introText}>
          아직 건네지 못한 마음을 작은 별에 실어 보내 보세요.
        </p>
      </section>

      <section
        className={styles.experience}
        aria-label="별 편지 인터랙티브 장면"
      >
        <div className={styles.stageFrame}>
          <svg
            ref={svgRef}
            className={`${styles.stage} ${draggingId ? styles.stageDragging : ""}`}
            viewBox="0 0 1000 640"
            role="group"
            aria-label="별을 드래그해 우체국 위의 별자리를 완성하세요"
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={cancelDrag}
          >
            <defs>
              <radialGradient id="night-sky" cx="54%" cy="36%" r="78%">
                <stop offset="0" stopColor="#2a3157" />
                <stop offset="0.54" stopColor="#171e3a" />
                <stop offset="1" stopColor="#0c1328" />
              </radialGradient>
              <radialGradient id="moon-face" cx="35%" cy="29%" r="75%">
                <stop offset="0" stopColor="#fff3ce" />
                <stop offset="0.72" stopColor="#eacb91" />
                <stop offset="1" stopColor="#c18b69" />
              </radialGradient>
              <linearGradient id="hill-back" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#202b43" />
                <stop offset="1" stopColor="#182239" />
              </linearGradient>
              <linearGradient id="hill-front" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#172035" />
                <stop offset="1" stopColor="#10182c" />
              </linearGradient>
              <linearGradient id="post-office" x1="0" y1="0" x2="0.9" y2="1">
                <stop offset="0" stopColor="#f0d4a2" />
                <stop offset="1" stopColor="#bf9275" />
              </linearGradient>
              <filter
                id="moon-glow"
                x="-100%"
                y="-100%"
                width="300%"
                height="300%"
              >
                <feGaussianBlur stdDeviation="20" />
              </filter>
              <filter
                id="star-glow"
                x="-150%"
                y="-150%"
                width="400%"
                height="400%"
              >
                <feGaussianBlur stdDeviation="8" />
              </filter>
              <filter
                id="window-glow"
                x="-200%"
                y="-200%"
                width="500%"
                height="500%"
              >
                <feGaussianBlur stdDeviation="9" />
              </filter>
            </defs>

            <rect width="1000" height="640" fill="url(#night-sky)" />
            <circle
              cx="782"
              cy="143"
              r="109"
              fill="#e3bb87"
              opacity="0.11"
              filter="url(#moon-glow)"
            />
            <circle cx="782" cy="143" r="69" fill="url(#moon-face)" />
            <circle cx="805" cy="120" r="64" fill="#202746" opacity="0.92" />
            <circle cx="741" cy="158" r="3" fill="#fff1cb" opacity="0.7" />

            {TWINKLING_STARS.map(([x, y, radius, delay], index) => (
              <circle
                key={`sky-star-${index}`}
                className={styles.skyStar}
                cx={x}
                cy={y}
                r={radius}
                style={{ animationDelay: `${delay}s` }}
              />
            ))}

            <path
              d="M0 430 Q142 341 293 404T584 391 1000 376V640H0Z"
              fill="url(#hill-back)"
            />
            <path
              d="M0 500 Q170 412 337 485T673 452 1000 472V640H0Z"
              fill="url(#hill-front)"
            />
            <path
              d="M0 558 Q165 507 330 556T681 527 1000 548"
              fill="none"
              stroke="#38415d"
              strokeWidth="1"
              opacity="0.45"
            />

            <g className={styles.postOffice} aria-hidden="true">
              <ellipse
                cx="500"
                cy="578"
                rx="198"
                ry="29"
                fill="#090f20"
                opacity="0.45"
              />
              <path d="M354 431 500 336 646 431Z" fill="#5a3948" />
              <path
                d="M373 430 500 350 627 430"
                fill="none"
                stroke="#d7ac87"
                strokeWidth="2"
                opacity="0.6"
              />
              <rect
                x="383"
                y="429"
                width="234"
                height="144"
                rx="3"
                fill="url(#post-office)"
              />
              <path
                d="M383 451H617"
                stroke="#986c69"
                strokeWidth="2"
                opacity="0.55"
              />
              <path
                d="M500 429V573"
                stroke="#ad7d70"
                strokeWidth="1"
                opacity="0.5"
              />
              <rect
                x="414"
                y="466"
                width="34"
                height="48"
                rx="17"
                fill="#372d42"
              />
              <rect
                x="552"
                y="466"
                width="34"
                height="48"
                rx="17"
                fill="#372d42"
              />
              <rect
                x="421"
                y="472"
                width="20"
                height="32"
                rx="10"
                fill="#f8d88c"
                opacity="0.9"
                filter="url(#window-glow)"
              />
              <rect
                x="559"
                y="472"
                width="20"
                height="32"
                rx="10"
                fill="#f8d88c"
                opacity="0.9"
                filter="url(#window-glow)"
              />
              <rect
                x="421"
                y="472"
                width="20"
                height="32"
                rx="10"
                fill="#f8d88c"
              />
              <rect
                x="559"
                y="472"
                width="20"
                height="32"
                rx="10"
                fill="#f8d88c"
              />
              <rect
                x="475"
                y="465"
                width="50"
                height="108"
                rx="25"
                fill="#644656"
              />
              <path
                d="M483 495H517"
                stroke="#eac99a"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="512" cy="523" r="2.2" fill="#edca91" />
              <path
                d="M444 421V408Q444 397 455 397H545Q556 397 556 408V421"
                fill="#b57e70"
              />
              <rect
                x="452"
                y="403"
                width="96"
                height="27"
                rx="2"
                fill="#7e5058"
              />
              <text
                x="500"
                y="421"
                textAnchor="middle"
                className={styles.signText}
              >
                NIGHT POST
              </text>
              <path d="M500 336V310" stroke="#ddb987" strokeWidth="2" />
              <path d="M500 309 508 316 500 323 492 316Z" fill="#f5d489" />
            </g>

            <g className={styles.constellation}>
              <path
                d={`M${CONSTELLATION[0].x} ${CONSTELLATION[0].y} L${CONSTELLATION[1].x} ${CONSTELLATION[1].y} L${CONSTELLATION[2].x} ${CONSTELLATION[2].y}`}
                className={styles.guideLine}
              />
              {CONSTELLATION.map((point, index) => {
                const occupied = targetStarIds[index] !== null;
                return (
                  <g
                    key={`target-${index}`}
                    ref={(node) => {
                      targetRefs.current[index] = node;
                    }}
                    className={`${styles.target} ${occupied ? styles.targetFilled : ""} ${selectedStar && !occupied ? styles.targetReady : ""}`}
                    role="button"
                    tabIndex={occupied ? -1 : 0}
                    aria-disabled={occupied}
                    aria-label={`별자리 자리 ${index + 1}${occupied ? " 채워짐" : " 비어 있음"}${selectedStar && !occupied ? ", 선택한 별 배치" : ""}`}
                    onClick={() => {
                      if (!occupied && selectedStar) {
                        placeStar(selectedStar, index);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (
                        (event.key === "Enter" || event.key === " ") &&
                        selectedStar &&
                        !occupied
                      ) {
                        event.preventDefault();
                        placeStar(selectedStar, index);
                      }
                    }}
                  >
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="24"
                      className={styles.targetHalo}
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="12"
                      className={styles.targetRing}
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="2.3"
                      className={styles.targetCore}
                    />
                    <text
                      x={point.x}
                      y={point.y + 39}
                      textAnchor="middle"
                      className={styles.targetNumber}
                    >
                      0{index + 1}
                    </text>
                  </g>
                );
              })}
            </g>

            {targetStarIds.map((id, index) => {
              const nextId = targetStarIds[index + 1];
              if (!id || !nextId) return null;
              const from = CONSTELLATION[index];
              const to = CONSTELLATION[index + 1];
              const middleX = (from.x + to.x) / 2;
              const middleY = Math.min(from.y, to.y) - 9;
              return (
                <path
                  key={`constellation-line-${index}`}
                  d={`M${from.x} ${from.y} Q${middleX} ${middleY} ${to.x} ${to.y}`}
                  className={styles.landedLine}
                />
              );
            })}

            <path
              d="M179 292c13-17 28-18 37-7 9 11 4 22-8 28-11 5-20 2-26-7"
              className={styles.postmark}
            />
            <path
              d="M790 454c16-16 35-13 39 0 4 13-9 22-22 21-12-1-20-8-17-18"
              className={styles.postmark}
            />

            {LETTER_STARS.map((letter) => {
              const point = positions[letter.id];
              const isDelivered = landings[letter.id] !== null;
              const isDragging = draggingId === letter.id;
              const isSelected = selectedStar === letter.id;
              return (
                <g
                  key={letter.id}
                  transform={`translate(${point.x} ${point.y})`}
                  className={`${styles.letterStar} ${styles[`letterStar_${letter.id}`]} ${isDragging ? styles.letterStarDragging : ""} ${isSelected ? styles.letterStarSelected : ""} ${isDelivered ? styles.letterStarDelivered : ""}`}
                  role="button"
                  tabIndex={isDelivered ? -1 : 0}
                  aria-label={`${letter.title} 별 편지, ${isDelivered ? "배달 완료" : "드래그하거나 선택해 배달"}`}
                  aria-pressed={isSelected}
                  onPointerDown={(event) => handlePointerDown(event, letter.id)}
                  onKeyDown={(event) => {
                    if (
                      (event.key === "Enter" || event.key === " ") &&
                      !isDelivered
                    ) {
                      event.preventDefault();
                      selectStarWithKeyboard(letter.id);
                    }
                  }}
                >
                  <circle r="64" className={styles.starHitArea} />
                  <g className={styles.letterStarArtwork}>
                    <circle r="38" className={styles.starAura} />
                    <circle
                      r="27"
                      className={styles.starGlow}
                      filter="url(#star-glow)"
                    />
                    <path
                      d="M0-21 5.6-6.7 21-6.3 9 3.5 13.2 18 0 9.5-13.2 18-9 3.5-21-6.3-5.6-6.7Z"
                      className={styles.starShape}
                    />
                    <path
                      d="M-8 5.5h16v10H-8zM-8 6l8 6 8-6"
                      className={styles.starEnvelope}
                    />
                    <circle
                      cx="14"
                      cy="-15"
                      r="2.4"
                      className={styles.starAccent}
                    />
                    <text
                      x="0"
                      y="44"
                      textAnchor="middle"
                      className={styles.starLabel}
                    >
                      {letter.title}
                    </text>
                    <text
                      x="0"
                      y="60"
                      textAnchor="middle"
                      className={styles.starWhisper}
                    >
                      {letter.word}
                    </text>
                  </g>
                </g>
              );
            })}

            <g className={styles.horizonMark} aria-hidden="true">
              <path d="M426 596H574" />
              <circle cx="500" cy="596" r="2" />
              <text x="500" y="617" textAnchor="middle">
                LETTERS FIND THEIR OWN WAY
              </text>
            </g>
          </svg>
        </div>

        <aside className={styles.guide} aria-label="장면 안내">
          <div className={styles.guideTopline}>
            <span>HOW TO SEND</span>
            <span>01 — 03</span>
          </div>
          <h2>
            별을 모아
            <br />
            편지를 보내요.
          </h2>
          <p className={styles.guideCopy}>
            세 개의 별 편지를 금빛 자리에 하나씩 놓아 주세요. 별자리가 완성되면
            우체국 문이 열립니다.
          </p>
          <ol className={styles.starList}>
            {LETTER_STARS.map((letter, index) => (
              <li
                key={letter.id}
                className={
                  landings[letter.id] !== null ? styles.starListDelivered : ""
                }
              >
                <span className={styles.listIndex}>0{index + 1}</span>
                <span className={styles.listName}>{letter.title}</span>
                <span className={styles.listCheck} aria-hidden="true">
                  {landings[letter.id] !== null ? "✓" : "·"}
                </span>
              </li>
            ))}
          </ol>
          <div
            className={styles.progressTrack}
            aria-label={`별 편지 ${deliveredCount}/3개 배달 완료`}
          >
            <span
              style={{
                width: `${(deliveredCount / LETTER_STARS.length) * 100}%`,
              }}
            />
          </div>
          <p className={styles.progressLabel}>
            {String(deliveredCount).padStart(2, "0")} / 03 · 별 편지 배달
          </p>

          <div className={styles.guideActions}>
            {deliveredCount === LETTER_STARS.length ? (
              <button
                ref={readLetterRef}
                className={styles.readLetter}
                type="button"
                onClick={() => setLetterOpen(true)}
              >
                도착한 편지 읽기 <span aria-hidden="true">↗</span>
              </button>
            ) : (
              <p className={styles.liveHint}>{announcement}</p>
            )}
            <button
              className={styles.resetButton}
              type="button"
              onClick={resetScene}
            >
              처음으로 <span aria-hidden="true">↺</span>
            </button>
          </div>
          <p className={styles.keyboardHint}>
            키보드: 별을 선택한 뒤 빈 자리를 선택하세요.
          </p>
          <Link
            className={styles.editorLink}
            href="/?interactionDemo=night-post-office"
          >
            AMOUS에서 인터랙션 설정 보기 <span aria-hidden="true">↗</span>
          </Link>
        </aside>
      </section>

      {letterOpen && (
        <div
          className={styles.letterBackdrop}
          role="presentation"
          onClick={closeLetter}
        >
          <section
            className={styles.openLetter}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delivered-letter-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Tab") {
                event.preventDefault();
                letterCloseRef.current?.focus();
              }
            }}
          >
            <button
              ref={letterCloseRef}
              className={styles.letterClose}
              type="button"
              aria-label="편지 닫기"
              onClick={closeLetter}
            >
              ×
            </button>
            <span className={styles.letterStamp}>DELIVERED BY MOONLIGHT</span>
            <p className={styles.letterTo}>오늘의 수신인에게</p>
            <h2 id="delivered-letter-title">잘 지내고 있나요?</h2>
            <p className={styles.letterBody}>
              가장 어두운 밤에도
              <br />
              당신을 생각하는 작은 빛이 있어요.
              <br />
              그 빛이 길을 잃지 않도록
              <br />
              오늘의 안부를 별에 묶어 보냅니다.
            </p>
            <p className={styles.letterSignoff}>
              밤의 우체국에서, 당신을 기억하는 이가
            </p>
          </section>
        </div>
      )}

      <footer className={styles.footer}>
        <span>AN INTERACTIVE POSTCARD</span>
        <span>MADE OF THREE SMALL THINGS: MEMORY, HELLO, DREAM</span>
        <span>© AMOUS · SEOUL, 23:17</span>
      </footer>
    </main>
  );
}
