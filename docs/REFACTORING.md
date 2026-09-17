# 에디터 코드 리팩토링 기록 (2026-09-17)

`editor-shell.tsx` 단일 파일(14,947줄)에 몰려 있던 에디터 전체를 분할한 작업 기록.
**동작 변경은 없다** — 모든 커밋이 move-only 원칙으로 진행됐고, 단계마다
lint / typecheck / 유닛 111개 / 빌드 / Playwright 전체 스위트로 검증했다.

## 결과 요약

- `editor-shell.tsx`: **14,947줄 → 약 4,600줄** (EditorShell 컴포넌트 본체만 남음)
- 신규 모듈 29개: lib 17 + 컴포넌트 20+ + 훅 2
- 커밋 4개 (main에 머지·배포 완료):

| 커밋 | 내용 |
|---|---|
| `e1f05c9` | 순수 함수·타입·상수 179개(~3,300줄)를 `lib/` 17개 모듈로 이동 |
| `4a9ac6b` | 말단 UI 컴포넌트를 `components/ui`, `components/canvas`로 분리 |
| `33510cd` | 패널·사운드·뷰어 컴포넌트를 `components/panels`, `sound`, `viewer`로 분리 |
| `8d89aed` | `useInterfaceScale`, `useInteractionSoundAssets` 훅 추출 |

## 새 구조

```
web/src/features/editor/
├── components/
│   ├── editor-shell.tsx        # EditorShell 본체 (제스처·펜·가이드·단축키·JSX)
│   ├── ui/                     # 재사용 필드 위젯
│   │   ├── design-fields.tsx   #   DesignNumberField·Dropdown·Range·ColorField 등
│   │   ├── scene-fields.tsx    #   SceneModeTabs·Checkbox·ColorField·PercentField
│   │   ├── scroll-area.tsx / layer-symbol.tsx / shape-picker.tsx
│   ├── canvas/                 # 캔버스 렌더링
│   │   ├── shape-graphic.tsx   #   요소 SVG 렌더 (패스파인더 포함)
│   │   ├── selection-outline-svg.tsx / pen-edit-controls.tsx
│   │   ├── draw-draft.tsx / artboard-background.tsx
│   ├── panels/                 # 우측 속성 패널
│   │   ├── scene-panel.tsx / design-panel.tsx
│   │   └── interaction-panel.tsx   # ← 2026-09-17 신규 (UI 프리뷰, INTERACTION-TAB.md 참고)
│   ├── sound/                  # 사운드 탭 일체
│   │   ├── sound-panel.tsx / all-sounds-panel.tsx
│   │   ├── interaction-sounds.tsx / sound-fields.tsx
│   └── viewer/                 # 관객 프리뷰(뷰어 런타임)
│       ├── viewer-preview.tsx / viewer-background-music.tsx / scene-preview.tsx
├── hooks/
│   ├── use-interface-scale.ts          # UI 스케일 모드·localStorage·디스플레이 추적
│   └── use-interaction-sound-assets.ts # 사운드 에셋 objectURL 소유·회수·요소별 갱신
├── lib/                        # 순수 함수 (React 무관)
│   ├── editor-types.ts         #   Point·Gesture·DrawDraft·EditorGuide·PropertyTab 등 공유 타입
│   ├── editor-constants.ts     #   tools·shapeOptions·fontFamilyStacks 등
│   ├── geometry.ts             #   clamp·rotatePoint·bounds*·elementWorldPoint·calculateCanvasFitZoom
│   ├── vector-path.ts          #   pathData·splitVectorSegment·sampledVectorPaths (펜/패스)
│   ├── pathfinder.ts           #   polygon-clipping 불리언 연산·clippingGeometryForElement
│   ├── polygon.ts / image-crop.ts / element-transform.ts / element-style.ts / artboard-style.ts
│   ├── dom-preview.ts          #   드래그 프리뷰 명령형 DOM 조작 (아래 '주의' 참고)
│   ├── smart-guides.ts / rulers.ts / selection.ts / element-id.ts
│   ├── sound-settings.ts / sound-playback.ts
│   └── (기존) interface-scale.ts / audio-output.ts / audio-artwork.ts
└── store/editor-store.ts       # zustand 스토어 (변경 없음)
```

## 반드시 알아야 할 컨벤션·주의사항

1. **드래그는 React를 우회한다.** 드래그 중에는 `lib/dom-preview.ts`가
   `#editor-artboard` 하위 노드의 `transform`을 직접 조작하고, pointerup에서
   스토어에 1회 커밋한 뒤 **다음 rAF(paint 전)** 에 transform을 지운다.
   화면에는 중간 상태가 절대 보이지 않지만, 커밋~rAF 사이에
   `getBoundingClientRect()`를 샘플링하면 2배 이동된 지오메트리가 잡힐 수 있다.
   → e2e `editor.spec.ts` "draws a shape on the canvas outside the artboard"
   위에 이 내용을 주석으로 남겨뒀다. **드래그 코드 변경 없이 이 테스트가
   실패하면 회귀가 아니라 이 측정 레이스다.**
2. **e2e는 "실패 집합 비교"로 판정한다.** 이 저장소의 Playwright 스위트는
   macOS에서 원본 코드 기준으로도 11개가 환경 의존으로 실패한다(4K 스케일
   에뮬레이션 등). 통과/실패 개수가 아니라 **변경 전후 실패 집합이 동일한지**
   (`--reporter=json` 비교)로 회귀를 판단할 것.
3. **신선한 클론에서 `npm run check`는 typecheck에서 실패한다.**
   Next 16이 생성하는 `LayoutProps` 전역 타입이 `.next`에 없기 때문.
   `npm run build`(또는 dev 1회) 후 통과한다. 원본부터 있던 구조.
4. **eslint `react-hooks/refs` disable**은 파일 단위로 최소화돼 있다
   (design-fields, interaction-sounds, sound-panel, viewer-*). 의도된
   latest-props-in-refs 패턴이므로 제거하지 말 것.
5. **알려진 정리 후보(미착수):** `sound-settings.soundOutputBitrate`와
   `audio-output.audioOutputBitrate`는 동일 로직 중복. `core/project/schema.ts`
   와 `lib/persistence/project-cache.ts`는 아직 어디서도 안 쓰는 데드 코드
   (저장 기능 기획 시 재설계 예정).

## 남은 후속 과제 (4단계 잔여분)

`EditorShell` 본체(~4,600줄)에는 펜 툴 / 캔버스 제스처 / 가이드·눈금자 /
키보드 단축키 로직과 JSX가 남아 있다. 이들은 `gestureRef`(제스처 유니언),
`renderDragPreviewRef`, 거리 측정 상태를 서로 공유해서 기계적 분리가 불가능하다.

권장 설계: **`useCanvasGestures`가 `gestureRef`를 소유**하고, 펜/가이드 훅이
자신의 포인터 핸들러를 주입(등록)하는 구조. 키보드 훅은 커맨드 맵을 주입받는다.
JSX 분리(TopBar/사이드바/CanvasStage)는 훅 추출이 끝난 뒤에 해야 props 폭발이 없다.
e2e가 전부 통과하는 환경(Windows)에서 진행할 것을 권장.
