# Interaction 탭 — 전체 기획 + 구현 현황 (2026-09-21)

관람객 인터랙션(클릭·호버·드래그·충돌·시간 등)에 반응하는 효과를 작가가
코드 없이 붙이는 탭. 확정 스펙 목업: `docs/interaction-panel-final.png`
(실서비스 UI 토큰으로 렌더링된 한 장짜리 스펙 문서 — 이 문서와 함께 볼 것).

## 현재 상태

- **패널과 런타임의 연결은 아직 없음.** 현재 `interaction-panel.tsx`의 설정은
  컴포넌트 로컬 샘플이며, 패널에서 바꾼 값은 에디터 스토어의 인터랙션 데이터나
  뷰어에 반영되지 않는다. 다만 `InteractionDefinition` 모델, 요소별 스토어
  조작과 일부 인터랙션을 재생하는 독립 뷰어 런타임은 이미 구현됐다. 즉
  "패널에서 설정 불가"와 "런타임 자체가 없음"을 혼동하지 않는다.
- **2026-09-19 UI 추가**: 근접한 두 도형의 `Liquid Merge`와 충돌 시
  `Bounce Off Target` 설정 필드를 추가했다. 상대 요소 목록은 현재 페이지의
  실제 레이어를 사용하지만, 설정 저장·뷰어 렌더링·충돌 물리는 여전히 미연결이다.
- **2026-09-19 UI 추가**: `Move → Gravity → Contact behavior: Stack & Settle`을
  추가했다. 쌓일 물체와 고정 장애물, Mass·Friction·Bounciness·Settle speed를
  설정하는 조건부 UI이며, 실제 쌓임·안정화 물리와 저장은 아직 미연결이다.
- **2026-09-20 3D·씬 로직 기획 UI 완성**: 3D 오브젝트의 물리 충돌,
  XYZ/좌표 공간, 카메라, 조명·그림자·후처리·Shader, GLB 애니메이션·재질·
  모프·Bone·Joint·Mesh·Face Group, 3D Reset scope와 Rigid body/Collider/
  Constraint/Blending 설정을 표시한다. 2D 요소도 3D 요소가 같은 Scene에 있으면
  Z·Depth를 가진 충돌 프록시로 실제 2D↔3D 물리 충돌을 기획할 수 있다.
  **이 확장도 현재는 패널 로컬 상태를 바꾸는 UI 프리뷰다. 아래의 제한된
  런타임 구현과 패널의 전체 기획 항목은 아직 연결되지 않았다.**
- **3D Scene 기반은 별도로 구현됨**: 페이지의 `objects3d`/`scene3d`, 3D
  프리미티브·벡터 변환·GLB 데이터 모델, WebGL 렌더링, 선택, 프로젝트 문서
  직렬화와 GLB IndexedDB 저장 기반은 존재한다. 3D 장면의 일부 호버·클릭
  변형 및 중력/바운스, 정적 2D 프록시와 3D 바디의 접촉도 뷰어에서 동작한다.
  하지만 패널의 모든 3D Trigger/Effect를 실행하는 것은 아니다.
- **제한된 런타임 기반**: `interaction-model.ts`가 패널·스토어·뷰어의 공통
  데이터 타입을 제공한다. 뷰어는 2D Click/Tap, Hover, Drag, After Delay,
  Pointer Move, Scroll/Swipe 트리거와 Move, Rotate, Scale, Opacity, Skew,
  Blur, Shadow, Show/Hide, Shake 효과의 일부 조합을 재생한다. Rapier 2D/3D
  중력·바운스 및 2D↔3D 정적 충돌 프록시는 별도 경로다. 전체 조건표,
  충돌 이벤트, 우선순위, 키프레임, Logic 연동은 아직 런타임과 연결되지 않았다.
- **배포 시 데모 자동 생성 없음**: `?threeDemo=1`과
  `?interactionDemo=1`은 더 이상 샘플 객체를 생성하지 않으며 Pages 빌드에도
  데모 활성화 플래그를 사용하지 않는다. 3D GLB/GLTF 업로드 버튼도 UI 확정
  전에는 제외한다. 모델 파일 처리와 장면 렌더링 기반 코드는 유지된다.
- **정밀 Keyframe 편집기 UI 추가**: 2D/3D Position·Rotation·Scale·Opacity,
  Material, Morph Target 트랙과 키프레임 추가·복제·삭제, 시간·값·Easing,
  재생 헤드와 확대/축소를 별도 전체 화면 편집기에서 조절한다.
- **LOGIC 탭 UI 추가**: Interaction의 `On Trigger`, `On Start`, `On Complete`,
  `On Reset`, `On Collision`, `Custom Event`를 입력으로 받아 조건·변수 처리 후
  `Go to Scene`, `Previous Scene`, `Restart Scene`, `End Artwork`로 Scene만
  분기한다. 애니메이션과 물리 설정은 계속 Interaction 탭이 소유한다.
- 구현 파일:
  - `web/src/features/editor/components/panels/interaction-panel.tsx` (신규)
  - `editor-shell.tsx` — INTERACTION 탭 버튼 활성화 + 렌더 분기.
    이때 DesignPanel이 삼항 체인의 else 폴백이던 것을
    `visiblePropertyTab === "design"`일 때만 렌더되게 스코프 축소
    (기존 3개 탭 기준 완전 동치).
  - `lib/editor-types.ts` — `PropertyTab`에 `"interaction"` 추가
  - `app/globals.css` — `.interaction-*` 클래스 (끝에 append, 기존 규칙 무수정)
- **기존 컴포넌트 재사용으로 시각 일관성 보장**: 드롭다운 `DesignDropdown`,
  초 단위 필드 `SoundStepperField`(▲▼ 스테퍼), px/% 필드 `DesignNumberField`,
  슬라이더 `DesignRange`, 토글 `.sound-toggle`, 행 그리드 `.sound-control-row`
  (라벨 79px 컬럼), 섹션 헤더 `.sound-section-heading`. 트리거 드롭다운만
  그룹 헤딩 지원을 위해 같은 DOM/클래스를 쓰는 로컬 `GroupedDropdown`.

## 설계 원칙 (전 섹션 공통)

1. **조건부 노출**: 선택한 트리거/효과/모션에 필요한 필드만 보여준다.
   회색 비활성화로 나열하지 않고 숨긴다.
2. **파이프라인 순서 = 런타임 데이터 흐름**: WHEN(트리거) → MAPPING(입력 해석)
   → DO(효과) → HOW(모션) → TIMING → RESET.
3. **런타임 전용 원칙**: 효과는 뷰어(감상 화면)에서만 적용된다.
   에디터의 원본 값(좌표·크기·투명도)은 절대 변경되지 않는다.
   → 언두/저장과 충돌하지 않음. 구현 시 스토어가 아니라 런타임 transform으로.
4. **어휘 통일**: 트리거 이름·그룹 체계는 SOUND 탭(Interaction Sounds)과
   동일하게 유지한다. 장기적으로 사운드는 이 시스템의 효과 하나로 흡수 예정.
5. **1 인터랙션 = 1 트리거 + 1 효과.** 같은 트리거에 여러 효과를 원하면
   목록에서 트리거 그룹의 "+ Add effect"로 추가한다(데이터는 1:1 유지).

## 패널 상단

| 컨트롤                            | 기능                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| Selected + 요소명                 | 현재 선택된 요소 표시. 효과는 항상 이 요소에 적용된다 (감지 영역과 별개 개념)                 |
| **+ Add interaction** (보라 버튼) | 새 인터랙션 생성. 기본값: Click/Tap 트리거, 효과 미정 상태로 목록에 추가되고 편집 폼이 열린다 |

## 인터랙션 목록 (트리거별 그룹)

같은 트리거끼리 그룹 박스로 묶인다. 그룹 헤더 = 트리거 이름 + **+ Add effect**
(같은 트리거로 효과 하나 추가 — 클릭 시 이동+크기+투명도 같은 동시 효과를
쉽게 구성하기 위한 단축 경로).

각 행의 컨트롤:

| 컨트롤            | 기능                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **▶** (원형 버튼) | 이 인터랙션 하나만 즉석 미리보기 재생 (전체 Preview 안 열고 확인)                                                        |
| **토글**          | 활성/비활성. 꺼진 행은 흐리게 표시되고 뷰어에서 실행되지 않음. 튜닝 중 켜고 끄며 비교하는 용도라 ⋯ 메뉴가 아닌 행에 노출 |
| 이름              | 효과 이름 (Move, Scale …). 행 클릭 = 이 인터랙션을 아래 편집 폼에 로드 (한 번에 하나만 편집)                             |
| 메타              | 핵심 값 요약 (예: "X +100 px", "→ 40 %")                                                                                 |
| **⋯**             | 메뉴: 복제 / 삭제                                                                                                        |

## 선택 상태별 패널 규칙 (0개 / 1개 / 다중)

| 선택 상태       | 헤더 표시                     | 목록·편집 폼                                                    |
| --------------- | ----------------------------- | --------------------------------------------------------------- |
| 선택 없음       | "No selection"                | 목록·폼 대신 빈 상태 문구 "Select a layer to add interactions." |
| 요소 1개        | 요소 이름 (예: Rectangle 1)   | 그 요소의 인터랙션 표시·편집 (이 문서의 기본 시나리오)          |
| 다중 선택 (N개) | "N objects" (예: "3 objects") | 아래 다중 선택 규칙 적용                                        |

**다중 선택 규칙:**

1. **목록에는 공통 인터랙션만 표시** — 선택된 모든 요소에 동일하게(같은
   트리거 + 같은 효과) 존재하는 인터랙션만 보여준다. 일부 요소에만 있는
   인터랙션은 표시하지 않는다 (관리하려면 해당 요소를 단일 선택).
2. **공통 인터랙션을 편집하면 선택된 모든 요소에 동시 적용**된다.
3. **+ Add interaction은 그룹 대상 인터랙션을 생성**한다 — 선택 요소 전체를
   대상으로 하는 인터랙션 하나 (데이터: `targetElementIds` = 선택 요소들).
   이때 Effect 드롭다운에 **Group Animation**이 노출되고, TIMING의
   **Stagger**(순차 지연)가 의미를 갖는다.
4. 행의 토글/삭제도 선택된 모든 요소의 해당 인터랙션에 일괄 적용된다.

## 1. WHEN — 트리거

**Trigger** 드롭다운 (6그룹 23종, 그룹 헤딩 표시):

| 그룹          | 트리거                    | 의미 · 규칙                                                                        |
| ------------- | ------------------------- | ---------------------------------------------------------------------------------- |
| Tap & pointer | Click / Tap               | 클릭·탭 1회 (이벤트형)                                                             |
|               | Double Click / Double Tap | 같은 요소에 Click도 있으면 Click은 더블클릭 판정 시간만큼 대기 후 실행             |
|               | Hover                     | 포인터 진입/이탈. 선택 시 Mobile fallback 행 노출                                  |
|               | Touch Start / Touch End   | 터치 시작/끝                                                                       |
|               | Long Press                | 길게 누르기. **Hold duration** 입력칸에서 판정 시간을 설정(기본 0.5초, 최소 0.1초) |
| Continuous    | Pointer Move / Touch Move | 포인터 위치를 실시간 입력으로 사용 (연속형)                                        |
|               | Drag                      | 드래그. **이 트리거가 걸리면 뷰어에서 해당 요소가 드래그 가능해진다**              |
|               | Wheel / Pinch             | 휠·핀치 양을 입력으로                                                              |
|               | Scroll / Swipe            | 페이지 스크롤 진행도. **scroll 타입 페이지에서만 목록에 노출**                     |
| Collision     | Overlap Start             | 대상 요소와 겹침 시작 순간 (이벤트형)                                              |
|               | While Overlapping         | 겹쳐 있는 동안 (연속형 — Overlap Time 매핑 사용 가능)                              |
|               | Overlap End               | 겹침이 끝나는 순간                                                                 |
|               | Drop On Target            | 대상 위에 겹친 상태로 드래그를 놓는 순간 (드롭 존)                                 |
|               | Near Target               | 상대 외곽선과 Join distance 이내로 가까워진 동안. Liquid Merge용 연속형            |
| Time          | After Delay               | 페이지 진입 N초 후 1회                                                             |
|               | Repeat Every…             | 페이지 진입 후 N초마다 반복 (상시 구동 연출)                                       |
|               | Idle Start / Idle End     | 관람객 입력이 N초 없을 때 / 다시 입력이 들어올 때                                  |
| Media         | Video Starts / Video Ends | 비디오 요소 재생 시작/끝 (비디오 요소 타입 신설 선행)                              |
| Page          | Page Enter / Page Exit    | 페이지 진입/이탈                                                                   |

**Trigger area** — 행동을 감지하는 범위 (효과 적용 대상과 별개).
Tap & pointer·Continuous·Collision 트리거에서만 표시한다. Page·Time·Media는
페이지 상태나 미디어 이벤트를 감지하므로 영역을 묻지 않는다:

| 옵션                   | 의미                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| Selected object (기본) | 선택한 요소 위에서 감지                                                                  |
| Entire artwork         | 작품 전체에서 감지                                                                       |
| Draw detail area…      | 캔버스에 감지 영역을 직접 그림. 그린 영역은 점선 오버레이로 남아 도형처럼 계속 편집 가능 |

**Source video** — Video Starts/Ends에서 Trigger area 대신 표시한다.
현재 페이지의 비디오 요소 중 재생 이벤트를 감지할 대상을 고른다.
비디오 요소 타입이 아직 없을 때는 선택 불가 상태와 안내 문구를 보여주며,
존재하지 않는 비디오를 임의로 지정하지 않는다.

**Hold duration** — Long Press 트리거 또는 Hover의 Mobile fallback에서
Long Press를 선택했을 때 표시한다. 기본 0.5초, 최소 0.1초, 0.1초 단위로
입력한다. Hover fallback의 경우 이 시간이 지나야 호버 진입으로 판정한다.

**Mobile fallback** — Hover 선택 시에만 노출. 각 옵션이 호버의 진입(enter)과
이탈(leave)을 함께 정의한다 (RESET의 "포인터 이탈 시 복귀"가 터치에서도 명확하도록):

| 옵션        | enter / leave 정의                |
| ----------- | --------------------------------- |
| Tap (기본)  | 탭 = 토글. 다시 탭하면 이탈       |
| Touch Start | 터치하고 있는 동안만 호버 상태    |
| Long Press  | 길게 누르고 있는 동안만 호버 상태 |

**Collision 전용 필드** — Collision 그룹 트리거 선택 시에만 노출:

| 필드                             | 기능                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Target element                   | 겹침 상대 요소 지정. **대상이 삭제되면 이 인터랙션은 자동 비활성 + 경고 표시**                               |
| Detection                        | Bounding box(기본, 빠름) / Precise outline(도형 외곽선 정밀 판정)                                            |
| Join distance / Release distance | Near Target 전용. 연결 시작 거리와 다시 분리할 거리(px). Release는 Join 이상으로 제한해 경계에서 깜빡임 방지 |

현재 프리뷰의 Target element는 같은 페이지의 실제 다른 요소만 나열한다.
Liquid Merge 선택 시에는 닫힌 도형(사각형·원·삼각형·별)만 대상에 표시하며,
두 쌍 효과에서는 Detection을 Precise outline으로 고정한다.

성능 규칙: 충돌 검사는 충돌 인터랙션에 참여하는 요소만 수행. 박스 판정 먼저,
박스가 겹칠 때만 외곽선 비교. (외곽선 교차는 기존 `lib/pathfinder.ts`의
polygon-clipping 재료 재사용 가능)

**Time 필드** — Time 그룹 트리거 선택 시에만 노출. 지연/간격/유휴 초.
기준 시점은 페이지 진입.

**대칭 규칙**: 효과는 항상 "선택한 요소"에 적용된다. 충돌 시 상대(B)도
반응시키려면 B를 선택해 인터랙션을 하나 더 만든다 (Trigger: Overlap Start,
Target: A).

## 2. MAPPING — 입력 해석 (연속형·While Overlapping에서만 노출)

**Input mapping** 드롭다운은 트리거에 맞는 항목만 보여준다:

| 매핑                 | 정의                                                                        | 파라미터                                                                                                         |
| -------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Drag Progress        | 드래그 길이를 0→100%로                                                      | **Track distance**(분모가 되는 기준 거리, px) + **Axis**(Free / X만 / Y만 — 슬라이더형 인터랙션용)               |
| Drag Angle           | 원형 드래그 각도 (핸들·다이얼)                                              | Full turn: 360° → 100%                                                                                           |
| Pointer Position     | Trigger area 안의 포인터 위치를 X/Y 각각 0→100%로 해석                      | **Axis**: X only / Y only / Both(기본). 영역 밖 위치는 0~100%로 clamp. Both는 X/Y 값을 각각 효과의 X/Y 축에 전달 |
| Scroll Progress      | 페이지 스크롤 0→100%                                                        | (scroll 페이지 전용)                                                                                             |
| Wheel / Pinch Amount | 휠 누적량·핀치 배율                                                         | Range (예: 500px · 0.5×→2×)                                                                                      |
| Pointer Velocity     | 포인터 속도                                                                 | Max velocity: 100%로 해석할 상한 (예: 2000 px/s) — 속도는 무한대라 상한 필수                                     |
| Overlap Time         | 겹쳐 있는 시간 (충돌 트리거)                                                | Max time: 100%로 해석할 시간 (예: 3s)                                                                            |
| Proximity to Target  | Near Target에서 두 외곽선 사이의 근접도. Join distance에서 0%, 접촉 시 100% | Join / Release distance는 WHEN에서 설정. Liquid Merge는 Follow input 고정                                        |

- **Input range** (min% ~ max%): min/max를 서로 바꾸면 방향 반전 (100→0).
- **Response mode**: **Follow input**(기본)은 매 프레임 입력값을 효과에 연결한다.
  **Fire at threshold**는 연속 입력을 단발 이벤트로 바꾼다. Threshold N%를
  **아래에서 위로 통과한 순간 1회** 실행하고, 다시 N% 아래로 내려가야
  재장전된다. 값이 위에 머무는 동안 중복 실행하지 않는다. Pointer Position의
  Both 축에서는 임계값 판정 축(X 또는 Y)을 선택한다.
- **Threshold** 입력칸은 Fire at threshold에서만 표시한다. 해당 모드의
  TIMING은 연속형 Smoothing이 아니라 이벤트형 Time·Delay·Easing을 사용한다.
  동일 트리거로 연속 반응과 임계값 이벤트를 함께 만들려면 인터랙션 두 개를
  등록한다.
- Order·Play·Pause·Resume·Seek처럼 즉시 실행되는 Effect를 연속 입력에
  연결할 때는 Fire at threshold를 사용한다. Follow input으로 프레임마다
  명령이 반복 실행되지 않도록 선택 시 모드를 자동 전환한다.
- Click처럼 1회성 이벤트 트리거에서는 이 섹션 전체가 숨겨진다.
- 물리적 움직임은 여기가 아니라 4. HOW에서 설정한다.

## 3. DO — 효과

**Effect** 드롭다운 — 선택 요소 타입에 따라 자동 필터, 사용 불가 효과는 숨김:

공통(도형 포함) 12종과 효과별 파라미터:

| 효과           | 파라미터                                                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Move           | X/Y(px), **Path**(Straight / Circular — 기준점 중심 원형 궤도. FFF 원형 메뉴용), Reference point(중심/모서리)                          |
| Scale          | X/Y (%)                                                                                                                                |
| Rotate         | 각도 + **축 지정: Z(평면) / X 플립 / Y 플립** (카드 뒤집기, split-flap)                                                                |
| Skew / Distort | 기울임·왜곡 값                                                                                                                         |
| Opacity        | 목표 투명도 (%)                                                                                                                        |
| Color          | 채움(fill)·선(stroke) 목표 색                                                                                                          |
| Blur           | 블러 강도                                                                                                                              |
| Shadow         | 그림자 깊이(elevation)·부드러움                                                                                                        |
| Show / Hide    | 전환: Fade 또는 **마스크 리빌**(원형 확산 · 와이프 · 물결). 마스크 위치는 포인터 매핑에 연결 가능 (FFF Wiper처럼 커서를 따라 닦아내기) |
| Shake          | 흔들림 강도                                                                                                                            |
| Order          | 맨앞으로 / 맨뒤로 (드래그 중인 요소가 가려지는 문제 해결)                                                                              |

타입별 추가 효과:

| 요소 타입        | 추가 효과                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| Image            | 공통 + Particle · Pixelate · Dissolve · Trail (WebGL 이펙트 레이어)                                            |
| Video            | Blur · Color · Play · Pause · Resume · Seek (비디오 요소 타입 신설 선행 — 현재 CanvasElementType에 video 없음) |
| Text             | Reveal · **Stroke Draw**(획 그리기) · Character / Word Animation                                               |
| Multi(다중 선택) | Group Animation (TIMING의 Stagger 사용)                                                                        |

**두 요소 효과(UI 프리뷰)**:

| 효과              | 표시 조건                                       | 3.DO 설정                                                                                                          |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Liquid Merge      | 단일 닫힌 도형 + Near Target/While Overlapping  | Bridge width · Smoothness. 원본 두 요소는 분리 유지, 관람 화면에서만 부드러운 연결부로 합성                        |
| Bounce Off Target | 단일 도형/이미지 + Overlap Start/Drop On Target | Affected objects: Selected object only / Both objects. 접촉 법선과 상대 속도로 튕길 방향을 계산하는 별도 물리 반응 |

기존 HOW의 `Bounce`는 목표 위치의 끝점 반동이며, 위의 물체 간 충돌
반동과 다르다. 두 효과 모두 현재는 **선택·숫자 변경 UI만 가능**하다.
두 효과의 합성 렌더러·충돌 이벤트/반응 런타임과 패널 설정 저장은 후속 구현
대상이다. 이는 별도로 구현된 Rapier 중력·바운스 기반과 구분한다.
두 효과는 Effect 목록의 기존 항목 아래에 둔다. 해당 Collision 트리거에서
Effect 메뉴를 열면 아래쪽으로 자동 스크롤하여 항목이 바로 보이게 한다.

## 4. HOW — 모션

**Behavior** 드롭다운 (선택한 트리거·매핑과 Effect **양쪽에서 가능한
항목의 교집합**만 노출):

| 모션    | 정의                                                                                                      | 파라미터                                                                                                                                                                                                                                                                |
| ------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct  | 값 즉시 반영                                                                                              | —                                                                                                                                                                                                                                                                       |
| Spring  | 스프링. **이벤트형 = 목표값까지 스프링 애니메이션, 연속형 = 입력을 스프링으로 추종** (같은 이름, 두 동작) | Strength · Mass · Damping (세부는 Advanced 슬라이더)                                                                                                                                                                                                                    |
| Inertia | 손을 떼도 관성 유지                                                                                       | Initial velocity · Friction · Deceleration                                                                                                                                                                                                                              |
| Bounce  | 끝 지점 반동                                                                                              | Strength · Bounce count · Damping                                                                                                                                                                                                                                       |
| Gravity | 낙하 + 접촉 반응                                                                                          | **Contact behavior**: Bounce only(기본) / Stack & Settle. Bounce only에서는 기존 Bounce off(Artboard edges / Artboard + obstacles…)를 유지한다. Stack & Settle에서는 Collide with · Mass · Friction · Bounciness · Settle speed와 공통 Strength · Direction을 사용한다. |

스태킹 UI 경로: 도형을 선택하고 WHEN에서 이벤트형 Trigger(예: Page Enter)를
고른 뒤 `DO: Move → HOW: Gravity → Contact behavior: Stack & Settle`.
Collide with의 기본값은 `Artboard + physics objects`이고, 다른 Gravity
오브젝트끼리 쌓인다는 의미다. `Physics + obstacles…`로 바꾸면 현재 페이지의
다른 요소를 고정 장애물로 다중 선택할 수 있다. 이 모드에서 DO의 작성자 지정
Move X/Y/Path는 숨긴다. TIMING은 Delay만, RESET의 Contextual default는
페이지를 나갈 때까지 쌓인 상태 유지(다음 진입 시 초기화)로 안내한다.
Advanced에서는 반복·왕복·Hold·키프레임을 숨기고 물리 세부의 Settle speed를
표시한다. **이는 UI 프리뷰 기획이며 실제 정지 접촉 해석·동적 충돌 물리·저장
기능은 후속 구현 대상이다.**

Effect별 허용 Behavior (A-2의 트리거·매핑 제한과 다시 교집합을 취함):

| Effect                                                                                                                                              | 허용 Behavior                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Move                                                                                                                                                | Direct · Spring · Inertia · Bounce · Gravity                                                                  |
| Rotate                                                                                                                                              | Direct · Spring · Inertia · Bounce                                                                            |
| Scale                                                                                                                                               | Direct · Spring · Bounce                                                                                      |
| Skew · Distort                                                                                                                                      | Direct · Spring                                                                                               |
| Opacity · Color · Blur · Shadow · Show/Hide · Shake · Particle · Pixelate · Dissolve · Trail · Text Reveal · Stroke Draw · Character/Word Animation | Direct만. 이벤트형에서는 TIMING의 Time·Easing으로 시각 전환 가능                                              |
| Order · Video Play/Pause/Resume/Seek                                                                                                                | HOW 섹션 숨김(내부적으로 즉시 실행). TIMING은 Delay만 표시                                                    |
| Group Animation                                                                                                                                     | 그룹 안에서 고른 자식 Effect의 허용 Behavior를 따름                                                           |
| Liquid Merge                                                                                                                                        | Direct · Spring. 근접도를 따라 연결 정도를 연속 갱신                                                          |
| Bounce Off Target                                                                                                                                   | Collision bounce 단일 Behavior. Bounciness · 선택 요소 Mass · (Both일 때) Target mass · Friction을 HOW에 표시 |

Effect나 매핑 변경으로 현재 Behavior가 불가능해지면 첫 가용 항목으로
자동 조정한다. 비활성 옵션을 남겨 혼동시키지 않는다.

## 5. TIMING — 시간

트리거·Response mode·Effect에 따라 UI가 바뀐다 (서로 다른 방식을 동시에
보여주지 않음):

**이벤트형** (Click, Page Enter, Fire at threshold 등):

| 필드         | 기능                                                                               |
| ------------ | ---------------------------------------------------------------------------------- |
| Time / Delay | 재생 시간 / 시작 지연 (초, ▲▼ 스테퍼)                                              |
| Stagger      | 그룹·다중 요소일 때만 표시하는 순차 지연 (초). 순서: forward / reverse / random    |
| Easing       | Linear / Ease In / Ease Out / Ease In Out / **Custom Curve…**(별도 커브 편집 팝업) |

**연속형 Follow input** (Drag, Pointer Move 등):

| 필드      | 기능                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------- |
| Smoothing | 입력을 따라잡는 지연 시간 (초). 0 = 즉시 반응. (기획 초안의 "Response Speed %"를 단위 있는 값으로 교체) |
| Easing    | 위와 동일 목록                                                                                          |

**즉시 명령** (Order·Video Play/Pause/Resume/Seek)은 시작 지연인 Delay만
표시한다. Time·Easing·Smoothing·HOW는 숨긴다. 연속 트리거에서 즉시 명령을
쓰면 Fire at threshold로 단발 실행한다.

`Bounce Off Target`도 충돌 시점에서 계산하므로 TIMING에는 Delay만 표시한다.
Duration/Easing/Keyframes/Playback은 숨기고 HOW의 물리값은 유지한다.
`Liquid Merge`는 Follow input의 Smoothing/Easing을 사용한다.
`Gravity → Stack & Settle`은 지속 물리 시뮬레이션이므로 Delay만 표시한다.
고정 Time/Duration·Easing·Repeat·Yoyo·Hold·Keyframes는 숨긴다.

## 6. RESET — 종료 후

**After** 드롭다운. 기본값 "Contextual default"는 다음처럼 트리거별로
결정하고, 드롭다운에는 해당 트리거에서 의미 있는 대안만 표시한다:

| 트리거                                                                   | Contextual default의 실제 동작                                                                                       | 대표 대안                    |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Click/Tap · Double Click · Touch Start/End · Long Press                  | Keep final state(마지막 상태 유지)                                                                                   | Restart when triggered again |
| Hover                                                                    | Return when pointer leaves. 모바일 Touch Start/Long Press 대체는 손가락을 뗄 때 복귀하고 Tap 대체는 다음 탭에서 복귀 | Keep final state             |
| Pointer Move                                                             | 포인터가 Trigger area/뷰포트를 벗어나면 복귀. 터치 이동은 손가락 해제·취소 시 복귀                                   | Keep final state             |
| Drag                                                                     | Return when trigger ends(놓으면 복귀)                                                                                | Keep final state             |
| While Overlapping                                                        | 겹침이 끝나면 복귀                                                                                                   | Keep final state             |
| Near Target                                                              | Release distance 밖으로 떨어지면 분리                                                                                | Keep final state             |
| Overlap Start/End · Drop On Target                                       | Keep final state                                                                                                     | Restart when triggered again |
| Scroll/Swipe                                                             | 스크롤 진행도·역방향을 따라 효과도 되돌아감                                                                          | Keep final state             |
| Wheel/Pinch                                                              | 마지막 매핑값 유지, 페이지 이탈 시 런타임 상태 폐기                                                                  | Return when trigger ends     |
| Time(After Delay·Repeat Every·Idle Start/End) · Media(Video Starts/Ends) | Keep final state                                                                                                     | Restart when triggered again |
| Page Enter                                                               | 페이지 이탈까지 유지. Page Exit 시 런타임 상태 초기화                                                                | —                            |
| Page Exit                                                                | 이탈 효과를 실행한 뒤 해당 페이지의 런타임 상태를 폐기. 다음 페이지에 결과를 넘기지 않음                             | —                            |

`Bounce Off Target`의 Contextual default는 충돌 후 도달한 위치를 유지한다.
`Gravity → Stack & Settle`의 Contextual default는 페이지 이탈까지 쌓인
상태를 유지하고, 다음 페이지 진입 시 초기화한다. 대안은 재발동 시 처음부터
다시 쌓는 Restart when triggered again이다.

Fire at threshold는 발생 순간부터 단발 이벤트로 취급하되, 선택한 원래
트리거의 복귀 의미를 유지한다(예: Drag는 놓으면 복귀, Scroll은 역방향으로
임계값 아래로 내려갈 때 재장전). 복귀 애니메이션은 이벤트형이면 해당
Time·Easing, Follow input이면 Smoothing·Easing을 따른다.
어떤 선택이든 **뷰어 런타임 상태만** 바뀐다 (원본 불변 — 연보라 안내 문구로
패널에 상시 표기).

## ADVANCED (기본 접힘)

| 컨트롤          | 기능                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Same property   | 같은 속성에 여러 효과 충돌 시: **Replace existing**(기본, 새 것으로 대체) / Additive(값 누적) / Interrupt(기존 즉시 중단)         |
| Other property  | 다른 속성끼리: **Run in parallel**(기본, 동시) / Run in order(아래 목록 순서대로 순차)                                            |
| 실행 목록       | 전체 인터랙션이 순서대로 나열. **드래그로 재정렬 — 이 순서가 곧 우선순위** (별도 Priority 숫자 없음, 이것이 유일한 우선순위 소스) |
| Repeat          | 반복 횟수. **∞ 허용** — 상시 구동 앰비언트 루프는 페이지 이탈까지 재생                                                            |
| Yoyo            | 완료 후 반대 방향 재생 (체크)                                                                                                     |
| Hold            | 종료 상태 유지 시간 (초)                                                                                                          |
| Cursor on hover | Default / Pointer — 호버 가능함을 커서로 알림                                                                                     |
| Physics details | 현재 모션의 물리값 세부 슬라이더 (Spring이면 Strength/Mass/Damping)                                                               |
| Keyframes       | 시작·끝 시점만 바 표시 + **Edit keyframes…** 버튼 → 별도 타임라인 편집 화면 (패널 안에 키프레임 편집을 넣지 않음)                 |

## 3D 오브젝트 선택 시 조건부 확장

3D UI는 별도 파이프라인을 하나 더 만들지 않고 기존
`WHEN → MAPPING → DO → HOW → TIMING → RESET → ADVANCED` 흐름을 그대로
확장한다. 2D와 3D를 함께 선택한 경우에는 공통으로 안전한 항목만 보여주고,
오브젝트 전용 항목은 **선택 항목이 모두 3D 오브젝트일 때만** 표시한다. 예외로
Camera·Visual Pipeline Effect는 모든 요소 타입에 제공하고, 2D↔3D 물리
Trigger는 같은 Scene에 두 종류가 있을 때 2D 또는 3D 단일 선택에도 제공한다.
에디터 탐색 카메라는 계속 정면 고정이며, Camera Effect는 관람 Preview의 작품
카메라를 애니메이션한다. 좌표 공간·회전·물리는 해당 오브젝트에 적용된다.

> 패널 구현 범위: 아래 필드를 조건부로 표시하고 값을 바꿀 수 있으며, GLB
> 메타데이터를 읽어 선택지를 채운다. 값은 `interaction-panel.tsx`의 로컬
> 상태이므로 선택을 벗어나거나 새로고침하면 유지되지 않는다. 별도로 구현된
> Rapier 기반 중력·바운스 및 2D↔3D 정적 프록시 충돌은 이 패널 값과 아직
> 연결되지 않았다. 기획된 충돌 이벤트, 애니메이션 믹싱, 셰이더 변경,
> 패널 설정 저장도 후속 범위다.

### 3D WHEN — 물리 충돌과 모델 애니메이션

| 항목                                                           | 표시 조건                       | 설정                                                 |
| -------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------- |
| Collision Enter                                                | 3D 선택                         | 실제 Collider 접촉이 시작된 순간                     |
| While Colliding                                                | 3D 선택                         | 물리 접촉이 유지되는 동안                            |
| Collision Exit                                                 | 3D 선택                         | 물리 접촉이 끝난 순간                                |
| Target mode                                                    | 위 3개 Trigger                  | Selected spatial object / Any compatible object / Object group |
| Target element                                                 | Selected spatial object         | 2D가 주체면 다른 3D, 3D가 주체면 다른 2D·3D 오브젝트 |
| Collider shape                                                 | 위 3개 Trigger                  | Auto / Box / Sphere / Capsule / Convex Hull / Mesh   |
| Is Trigger (Sensor)                                            | 위 3개 Trigger                  | 켜면 이벤트만 감지하고 물리적으로 밀거나 튕기지 않음 |
| Minimum impulse                                                | Collision Enter                 | 약한 접촉을 무시할 최소 충격량                       |
| Model Animation Starts / While Playing / Ends / Loops / Marker | 애니메이션 clip이 있는 GLB 선택 | Clip과 Marker를 고른 모델 재생 상태를 감지           |

기존 `Overlap Start / While Overlapping / Overlap End`는 화면 외곽선·바운딩
영역을 이용하는 **센서형 겹침**이고, 위 `Collision`은 Collider와 Rigid body를
이용하는 **3D 물리 접촉**이다. 둘을 같은 Trigger로 합치지 않는다.

### 3D MAPPING — 좌표·축·평면

기존 매핑에 선택 Trigger에 맞춰 아래 입력값을 추가한다.

| 입력 상황             | 추가 Mapping                                             |
| --------------------- | -------------------------------------------------------- |
| Drag / Pointer Move   | 3D Position · Depth Progress · Surface Position          |
| While Colliding       | Contact Duration · Collision Impulse · Penetration Depth |
| Near Target           | 3D Distance                                              |
| While Model Animation | Animation Progress · Animation Time                      |

3D 위치·방향 값을 쓰는 Mapping에서는 다음 컨트롤을 표시한다.

- **Coordinate space**: World / Local / Screen / Target Local
- **Axis**: Free / X / Y / Z / Custom. Custom은 방향 벡터 X·Y·Z를 표시한다.
- **Plane**: Screen / XY / XZ / YZ / Camera-facing / Custom
- **Input range**: 최소·최대 값을 정규화한 뒤 Follow input 또는
  Fire at threshold에 전달한다.

### 3D DO — 공간 Transform과 GLB 전용 효과

| Effect                                       | 표시 필드                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| Move                                         | X · Y · **Z**, Coordinate space                                           |
| Scale                                        | X · Y · **Z**, Lock ratio, Pivot                                          |
| Rotate                                       | X · Y · Z 각도, World/Local, Rotation order, Pivot                        |
| Look At Target                               | Target, Forward axis, 고정할 회전축                                       |
| Orbit Around Target                          | Target, Orbit axis, Angle, Radius, Face target                            |
| Attach To Target                             | Target, Preserve world transform, Position/Rotation offset XYZ            |
| Stack On Target                              | Target/Surface, 정렬 축, 간격                                             |
| Bounce Off Target                            | Target, Affected objects, Bounciness · Mass · Friction                    |
| Liquid Merge                                 | Target, Bridge width · Smoothness. 실제 3D 메타볼/셰이더 런타임은 후속    |
| Play / Pause / Resume / Stop Model Animation | GLB Clip, Playback speed, 재생 범위                                       |
| Seek / Crossfade / Change Model Animation    | From/To clip, Time 또는 Progress, Transition duration                     |
| Change Material / Material Parameter         | Mesh/Material slot, Property(Color·Opacity·Metalness·Roughness 등), Value |
| Material Slot                                | GLB의 실제 material slot 선택과 교체                              |
| Morph Target                                 | GLB morph target 이름, Weight                                             |

모델 전용 선택지는 가져온 GLB에 실제 데이터가 있을 때만 표시한다.
`animationNames`, `materialNames`, `morphTargetNames`가 비어 있으면 해당 선택지는
숨기고, 사용 불가한 회색 항목을 길게 나열하지 않는다.

### 3D HOW와 TIMING

- Move·Rotate·Scale은 기존 Direct / Spring / Inertia / Bounce와 같은 교집합
  규칙을 사용한다. 실제 물리 접촉을 유지할 동작은 **Dynamic body**, 작성자가
  좌표를 직접 움직이는 동작은 **Kinematic body**, 움직이지 않는 충돌 대상은
  **Static body**가 기본이다.
- Look At / Orbit / Attach는 Direct 또는 Spring만 표시한다. Attach는 부모-자식
  관계 변경이므로 Inertia·Bounce·Gravity를 표시하지 않는다.
- 물리 Collision Trigger와 Bounce/Stack 계열은 충돌 순간의 물리 응답이므로
  HOW의 Rigid body 설정을 사용하고, TIMING은 Delay 중심으로 표시한다.
- 모델 애니메이션 Effect는 일반 Time/Easing 대신 **Clip · Playback speed ·
  Start/End · Transition(Cut/Crossfade/Blend) · Crossfade duration · Loop(Once/
  Repeat/Ping Pong) · Repeat count · Root motion**을 표시한다.
- Material/Morph Effect는 일반 이벤트형 Time·Delay·Easing을 사용하며,
  Animation Progress와 연결하면 연속형 Smoothing·Easing을 사용한다.

### 3D RESET — 복귀 범위

`After`의 Trigger별 의미는 기존 RESET 규칙을 따르되, 3D에서는 무엇을 복구할지
**Reset scope**를 함께 고른다.

- Transform: Position / Rotation / Scale
- Physics: Linear velocity / Angular velocity
- Model: Animation pose / Material / Morph weights
- Relationship: Attachment

`Keep final state`는 체크한 범위도 유지하고, Return/Restart/Page Exit 계열은
체크한 범위만 편집 시점 원본으로 되돌린다. Dynamic body를 복귀할 때는 위치만
순간 이동시키지 않고 Linear/Angular velocity도 기본적으로 함께 초기화한다.

### 3D ADVANCED — Rigid body, Collider, 제약과 Blending

| 묶음                | 컨트롤                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Rigid body          | Static / Kinematic / Dynamic · Mass · Gravity scale · Linear damping · Angular damping · Continuous collision detection |
| Collider            | Auto / Box / Sphere / Capsule / Convex Hull / Mesh · Offset XYZ · Size XYZ · Radius · Height · Is Trigger               |
| Surface             | Friction · Bounciness                                                                                                   |
| Collision filtering | Collision layer · Collision mask                                                                                        |
| Constraints         | Freeze Position X/Y/Z · Freeze Rotation X/Y/Z                                                                           |
| Gravity             | ±X / ±Y / ±Z / Custom vector                                                                                            |
| Animation blending  | Cut / Crossfade / Blend · Duration · Blend weight · Root motion(Ignore/Apply)                                           |
| Material target     | Mesh/Material slot · Material property                                                                                  |
| Morph target        | Target name · Weight                                                                                                    |

동적 오브젝트에서 삼각형 단위 `Mesh` Collider는 성능·안정성 문제가 크므로
Static/Kinematic에서만 허용하고, Dynamic에서는 Convex Hull을 기본으로 한다.
`Is Trigger`를 켜면 Collider 크기·Offset·Layer/Mask는 유지하지만 Mass,
Friction, Bounciness 같은 물리 반응값은 감지 결과에 영향을 주지 않는다.

`Liquid Merge`는 2D 사각형·원·삼각형·별 또는 3D primitive/vector에만 제공한다.
가져온 GLB asset에는 제공하지 않는다. 또한 현재 Effect 목록에 `Scatter`,
`Fracture`, `Shatter`는 없다. `Particle`은 이미지용 시각 효과이지 Mesh 파쇄가
아니므로, "충돌하면 조각으로 흩어짐"은 별도의 Effect·파편 생성 런타임을 먼저
기획·구현해야 한다.

## 스코프에서 제외한 것 (의도적)

- 입력: 카메라 · 마이크(음성) · 키보드 · ML 인식 — 장기 로드맵 후보(전시 센서 입력)
- 인터랙션 런타임의 나머지: 기획된 2D/3D 충돌 이벤트·스태킹 안정화·마찰·밀기,
  전체 Mapping/Effect 조합과 Reset 복귀 (일부 2D 효과와 중력·바운스 기반만 동작)
- 3D 인터랙션용 메타볼/Liquid Merge 셰이더, 런타임 애니메이션 믹싱·Root motion,
  재질·모프 애니메이션, 입력 기록·역재생

## 다음 구현 단계 가이드 (기능 구현 시)

1. **패널 연결**: 로컬 샘플 상태를 기존 `InteractionDefinition`과 요소별
   스토어 조작에 연결한다. Collision/Multi 선택을 위한 감지 주체·적용 대상
   참조 구조를 확정하고 SOUND 탭 Trigger 어휘와 통일한다.
2. **뷰어 런타임 확장**: `viewer-preview.tsx`의 기존 2D 트리거·효과 평가기에
   조건표, Reset, 우선순위, 키프레임을 단계적으로 추가한다. 관람 효과는
   런타임 상태에서만 계산하고 원본 요소 속성은 변경하지 않는다.
3. **2D 충돌 이벤트**: AABB 우선 → 겹칠 때만 `lib/pathfinder.ts` 외곽선 교차.
   참여 요소만 검사.
4. **3D 충돌·애니메이션 확장**: 기존 Rapier 3D World와 2D 정적 프록시에
   기획된 충돌 이벤트·물체 간 반응을 연결한다. GLB AnimationMixer와 물리
   body의 생명주기는 페이지 진입/이탈에 맞춰 생성·해제한다.
5. **저장 정책**: 공통 `InteractionDefinition`을 패널과 연결하되 프로젝트
   저장·로드/IndexedDB 정책은 별도 결정 후 통합한다. 구버전 문서 migration을
   검증하고 3D 전용 설정은 판별 가능한 하위 객체로 저장한다.
6. **알려진 이슈**: e2e `editor.spec.ts` "draws a shape on the canvas outside
   the artboard"는 드래그 커밋 직후 boundingBox 샘플링 타이밍에 민감한
   기존 측정 레이스로, 번들 크기가 바뀌면 실패할 수 있음(테스트 위 주석 참고).
   런타임 회귀 아님.

---

## 부록 A — 컨트롤별 드롭다운 항목·표시 조건 전수표

UI 동작을 구현할 때 이 표가 단일 기준이다. "표시 조건"이 없는 행은 항상 표시.

### A-1. 드롭다운을 눌렀을 때 뜨는 항목 (전수)

| 컨트롤                    | 표시 조건                                                      | 눌렀을 때 표시되는 항목 (순서대로)                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trigger                   | 항상                                                           | 그룹 헤딩 6개 아래로: **TAP & POINTER** Click/Tap · Double Click/Double Tap · Hover · Touch Start · Touch End · Long Press / **CONTINUOUS** Pointer Move/Touch Move · Drag · Wheel/Pinch · Scroll/Swipe / **COLLISION** Overlap Start · While Overlapping · Overlap End · Drop On Target · Near Target / **TIME** After Delay · Repeat Every… · Idle Start · Idle End / **MEDIA** Video Starts · Video Ends / **PAGE** Page Enter · Page Exit |
| Trigger area              | Trigger ∈ TAP & POINTER · CONTINUOUS · COLLISION               | Selected object(기본) · Entire artwork · Draw detail area… (Page·Time·Media에서는 행 숨김)                                                                                                                                                                                                                                                                                                                                                    |
| Source video              | Trigger = Video Starts/Ends                                    | 현재 페이지의 비디오 요소 목록. 비디오가 아직 없으면 선택 불가 안내                                                                                                                                                                                                                                                                                                                                                                           |
| Mobile fallback           | Trigger = Hover                                                | Tap(기본) · Touch Start · Long Press                                                                                                                                                                                                                                                                                                                                                                                                          |
| Hold duration             | Trigger = Long Press 또는 Hover의 Mobile fallback = Long Press | 길게 누르기 판정 시간. 기본 0.5초, 최소 0.1초, 0.1초 단위 입력                                                                                                                                                                                                                                                                                                                                                                                |
| Target element            | Trigger ∈ COLLISION                                            | 현재 페이지의 다른 요소 전체 목록 (요소명 + 타입, 자기 자신 제외)                                                                                                                                                                                                                                                                                                                                                                             |
| Detection                 | Trigger ∈ COLLISION                                            | Bounding box(기본) · Precise outline                                                                                                                                                                                                                                                                                                                                                                                                          |
| Join/Release distance     | Trigger = Near Target                                          | 각각 px 입력. Release는 Join보다 작아질 수 없음                                                                                                                                                                                                                                                                                                                                                                                               |
| Input mapping             | MAPPING 섹션 표시 시                                           | Drag → Drag Progress · Drag Angle · Pointer Velocity / Pointer Move → Pointer Position · Pointer Velocity / Scroll·Swipe → Scroll Progress / Wheel·Pinch → Wheel/Pinch Amount / While Overlapping → Overlap Time / Near Target → Proximity to Target                                                                                                                                                                                          |
| Axis                      | Input mapping = Drag Progress                                  | Free(기본) · X only · Y only                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Position axis             | Input mapping = Pointer Position                               | Both(기본) · X only · Y only; Both는 X/Y 각각 0~100% 정규화, 영역 밖은 clamp                                                                                                                                                                                                                                                                                                                                                                  |
| Response mode             | MAPPING 섹션 표시 시                                           | Follow input(기본, 연속 반응) · Fire at threshold(상향 통과 시 단발, 하향 이탈 시 재장전)                                                                                                                                                                                                                                                                                                                                                     |
| Threshold + crossing axis | Response mode = Fire at threshold                              | Threshold 0~100% 입력; Pointer Position + Both일 때 판정 축 X/Y 선택                                                                                                                                                                                                                                                                                                                                                                          |
| Effect                    | 항상                                                           | 요소 타입별 가용 목록만 (3. DO 표 참고). 사용 불가 항목은 숨김(회색 아님)                                                                                                                                                                                                                                                                                                                                                                     |
| Path                      | Effect = Move                                                  | Straight(기본) · Circular                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Reference point           | Effect = Move·Scale·Rotate 등 기하 효과                        | Center(기본) · Top Left · Top Right · Bottom Left · Bottom Right                                                                                                                                                                                                                                                                                                                                                                              |
| Behavior (Motion)         | 즉시 명령 Effect가 아닐 때                                     | A-2 트리거·매핑 매트릭스와 A-2b Effect 매트릭스의 교집합만                                                                                                                                                                                                                                                                                                                                                                                    |
| Collision bounce physics  | Effect = Bounce Off Target                                     | Bounciness · Mass · Both 선택 시 Target mass · Friction                                                                                                                                                                                                                                                                                                                                                                                       |
| Contact behavior          | Behavior = Gravity                                             | Bounce only(기본) · Stack & Settle                                                                                                                                                                                                                                                                                                                                                                                                            |
| Bounce off                | Gravity + Bounce only                                          | Artboard edges(기본) · Artboard + obstacles…                                                                                                                                                                                                                                                                                                                                                                                                  |
| Collide with              | Gravity + Stack & Settle                                       | Artboard + physics objects(기본) · Physics + obstacles…(현재 페이지의 다른 요소 다중 선택). Mass · Friction · Bounciness 표시                                                                                                                                                                                                                                                                                                                 |
| Easing                    | 이벤트형 또는 Follow input, 즉시 명령 제외                     | Linear · Ease In · Ease Out · Ease In Out · Custom Curve…(선택 시 커브 편집 팝업 열림)                                                                                                                                                                                                                                                                                                                                                        |
| After (Reset)             | 항상                                                           | Contextual default(기본)와 6.RESET 표의 해당 트리거에 의미 있는 대안만. Page Exit는 런타임 상태 폐기 안내                                                                                                                                                                                                                                                                                                                                     |
| Same property             | Advanced                                                       | Replace existing(기본) · Additive · Interrupt                                                                                                                                                                                                                                                                                                                                                                                                 |
| Other property            | Advanced                                                       | Run in parallel(기본) · Run in order                                                                                                                                                                                                                                                                                                                                                                                                          |
| Cursor on hover           | Advanced                                                       | Default · Pointer(기본)                                                                                                                                                                                                                                                                                                                                                                                                                       |

### A-2. Motion × 트리거/매핑 가용 매트릭스

"매핑별 자동 필터"의 확정 기준. (기존 문서에서 암묵적이던 것을 여기서 확정)

| 입력 상황                                                            | Direct | Spring                    | Inertia                       | Bounce        | Gravity                   |
| -------------------------------------------------------------------- | ------ | ------------------------- | ----------------------------- | ------------- | ------------------------- |
| 이벤트형 트리거 (Click·Page Enter·Time·Overlap Start 등)             | ✓      | ✓ (목표값까지 애니메이션) | ✓ (Initial velocity로 던지기) | ✓             | ✓ (트리거 순간 낙하 시작) |
| Drag/Scroll/Angle/Wheel Progress (위치성 연속값 — 놓기/끝점 있음)    | ✓      | ✓ (입력 추종)             | ✓ (놓은 뒤 관성)              | ✓ (끝점 반동) | —                         |
| Pointer Position · Pointer Velocity (포인터 추종값 — 놓기 개념 없음) | ✓      | ✓                         | —                             | —             | —                         |
| Overlap Time                                                         | ✓      | ✓                         | —                             | —             | —                         |
| Proximity to Target                                                  | ✓      | ✓                         | —                             | —             | —                         |

Fire at threshold에서는 선택한 입력을 단발 이벤트로 바꾸므로 **이벤트형
트리거 행**을 적용한다. 그다음 아래 Effect 제한과 교집합을 취한다.

### A-2b. Motion × Effect 가용 매트릭스

| Effect                                                                                                                                              | Direct                                 | Spring                  | Inertia                 | Bounce                  | Gravity                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------- | ----------------------- | ----------------------- | ----------------------- |
| Move                                                                                                                                                | ✓                                      | ✓                       | ✓                       | ✓                       | ✓                       |
| Rotate                                                                                                                                              | ✓                                      | ✓                       | ✓                       | ✓                       | —                       |
| Scale                                                                                                                                               | ✓                                      | ✓                       | —                       | ✓                       | —                       |
| Skew · Distort                                                                                                                                      | ✓                                      | ✓                       | —                       | —                       | —                       |
| Liquid Merge                                                                                                                                        | ✓                                      | ✓                       | —                       | —                       | —                       |
| Bounce Off Target                                                                                                                                   | 별도 Collision bounce 물리 모드만 허용 | —                       | —                       | —                       | —                       |
| Opacity · Color · Blur · Shadow · Show/Hide · Shake · Particle · Pixelate · Dissolve · Trail · Text Reveal · Stroke Draw · Character/Word Animation | ✓                                      | —                       | —                       | —                       | —                       |
| Order · Video Play/Pause/Resume/Seek                                                                                                                | HOW 숨김                               | —                       | —                       | —                       | —                       |
| Group Animation                                                                                                                                     | 자식 Effect의 행을 따름                | 자식 Effect의 행을 따름 | 자식 Effect의 행을 따름 | 자식 Effect의 행을 따름 | 자식 Effect의 행을 따름 |

### A-3. 트리거 선택 시 섹션·필드 노출 변화 (요약 매트릭스)

| 선택한 트리거                                    | WHEN 추가 필드                                     | 2.MAPPING                                                                    | 5.TIMING 모드                |
| ------------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------- |
| Click/Tap · Double · Touch Start/End             | —                                                  | 숨김                                                                         | 이벤트형 (Time·Delay·Easing) |
| Long Press                                       | Hold duration (기본 0.5초, 최소 0.1초)             | 숨김                                                                         | 이벤트형 (Time·Delay·Easing) |
| Hover                                            | Mobile fallback (Long Press 선택 시 Hold duration) | 숨김                                                                         | 이벤트형                     |
| Pointer Move · Drag · Wheel/Pinch · Scroll/Swipe | 트리거에 따라 Trigger area                         | 표시: Follow input → Smoothing·Easing, Fire at threshold → Time·Delay·Easing |
| Overlap Start · Overlap End · Drop On Target     | Target element · Detection                         | 숨김                                                                         | 이벤트형                     |
| While Overlapping                                | Target element · Detection                         | 표시: Follow input → Smoothing·Easing, Fire at threshold → Time·Delay·Easing |
| Near Target                                      | Target element · Detection · Join/Release distance | 표시: Liquid Merge는 Follow input 고정 → Smoothing·Easing                    |
| After Delay · Repeat Every · Idle Start/End      | Time (초), Trigger area 숨김                       | 숨김                                                                         | 이벤트형                     |
| Video Starts/Ends                                | Source video, Trigger area 숨김                    | 숨김                                                                         | 이벤트형                     |
| Page Enter/Exit                                  | Trigger area 숨김                                  | 숨김                                                                         | 이벤트형                     |

Stagger는 그룹·다중 선택에서만 추가한다. Order·Video Play/Pause/Resume/Seek
즉시 명령을 선택하면 위 표의 이벤트형/연속형 구분보다 우선하여 TIMING은
Delay만 보여주고 HOW를 숨긴다.

### A-4. 효과 선택 시 3.DO 내부 필드 교체

| Effect                                   | 표시 필드                                                                                                         |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Move                                     | X(px) · Y(px) · Path · Reference point                                                                            |
| Scale                                    | X(%) · Y(%) · (Lock ratio 토글) · Reference point                                                                 |
| Rotate                                   | 각도(°) · Axis(Z/X flip/Y flip) · Reference point                                                                 |
| Skew / Distort                           | 값 필드                                                                                                           |
| Opacity                                  | 목표 % (슬라이더 + 값)                                                                                            |
| Liquid Merge                             | Bridge width · Smoothness 슬라이더. 닫힌 도형 1개 선택 + Near Target/While Overlapping에서만                      |
| Bounce Off Target                        | Affected objects(선택 요소만/두 요소). 도형·이미지 1개 선택 + Overlap Start/Drop On Target에서만                  |
| Color                                    | Fill 색 · Stroke 색 (컬러 필드)                                                                                   |
| Blur                                     | 강도(px)                                                                                                          |
| Shadow                                   | Elevation · Softness                                                                                              |
| Show / Hide                              | 전환: Fade / Mask reveal → Mask reveal 선택 시 형태(Circle expand·Wipe·Wave) + "마스크 위치를 포인터에 연결" 옵션 |
| Shake                                    | 강도                                                                                                              |
| Order                                    | Bring to front / Send to back 선택                                                                                |
| (Image) Particle·Pixelate·Dissolve·Trail | 각 강도/밀도 파라미터 (WebGL 레이어)                                                                              |
| (Text) Reveal·Stroke Draw·Char/Word      | 방향·순서 파라미터                                                                                                |

### A-5. Behavior 선택 시 4.HOW 내부 필드 교체

| Behavior         | 표시 필드                                                                                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct           | (물리 필드 없음)                                                                                                                                                                             |
| Spring           | Strength · Mass · Damping (3칸)                                                                                                                                                              |
| Inertia          | Initial velocity · Friction · Deceleration                                                                                                                                                   |
| Bounce           | Strength · Bounce count · Damping                                                                                                                                                            |
| Gravity          | Contact behavior: Bounce only → Bounce off · Strength · Bounciness · Direction. Stack & Settle → Collide with · Mass · Friction · Bounciness · Strength · Direction · Settle speed(Advanced) |
| Collision bounce | Bounciness · 선택 요소 Mass · Both일 때 Target mass · Friction                                                                                                                               |

### A-6. 3D 선택 시 기존 전수표에 합쳐지는 항목

이 표는 A-1~A-5를 대체하지 않고, `object3d`만 선택했을 때 각 목록에
조건부로 더한다.

| 위치                | 추가 항목                                                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trigger / Collision | Collision Enter · While Colliding · Collision Exit                                                                                                                                  |
| Trigger / Model     | Model Animation Starts · While Playing · Ends · Loops · Marker (선택 GLB에 clip이 있을 때)                                                                                          |
| Input mapping       | 3D Position · Depth Progress · Surface Position · Contact Duration · Collision Impulse · Penetration Depth · 3D Distance · Animation Progress · Animation Time 중 Trigger에 맞는 것 |
| Effect / Spatial    | Look At Target · Orbit Around Target · Attach To Target · Stack On Target                                                                                                           |
| Effect / Transform  | Move·Scale·Rotate에 Z와 World/Local 좌표 공간 추가                                                                                                                                  |
| Effect / Model      | Play · Pause · Resume · Stop · Seek · Crossfade · Change Model Animation (clip 보유 GLB)                                                                                            |
| Effect / Appearance | Change Material (3D 재질 보유) · Morph Target (morph 보유 GLB)                                                                                                                      |
| Reset scope         | Position · Rotation · Scale · Linear/Angular velocity · Animation pose · Material · Morph weights · Attachment                                                                      |
| Advanced            | Rigid body · Collider · Surface · Collision filtering · Constraints · Gravity vector · Animation blending · Material/Morph target                                                   |

## 2026-09-20 확장 UI 확정 사항

### 2D ↔ 3D 물리 충돌

- 같은 Scene에 2D와 3D 요소가 모두 있을 때 2D 선택에도 `Collision Enter`,
  `While Colliding`, `Collision Exit`를 표시한다.
- 2D 요소는 `Extruded 2D outline`, `Bounding box`, `Convex hull` 중 하나로
  충돌 프록시를 만들고 `Z`와 `Depth`를 지정한다.
- 충돌 대상은 같은 Scene의 3D 요소로 제한한다. `Bounce Off Target`과
  `Stack On Target`, Rigid body, Collider, Mass, Friction, Bounciness,
  Collision layer/mask, XYZ constraint를 함께 설정한다.
- 이는 DOM 2D와 WebGL 3D가 같은 물리 World의 collider로 등록된다는 런타임
  계약이다. 현재 구현 범위는 이 데이터를 입력하는 UI까지다.

### 카메라·시각 파이프라인

모든 요소의 Effect 목록에 아래 항목을 제공한다. Camera는 에디터 탐색 카메라가
아니라 관람객이 보는 작품 카메라를 애니메이션한다.

| Effect              | 주요 필드                                                             |
| ------------------- | --------------------------------------------------------------------- |
| Camera Move         | Camera position X/Y/Z · Projection · Perspective FOV                  |
| Camera Zoom / Dolly | Zoom/Dolly 값 · Projection · Perspective FOV                          |
| Camera Rotate       | Rotation X/Y/Z · Projection · Perspective FOV                         |
| Camera Look At      | 선택 요소·아트보드 중심·다른 요소                                     |
| Camera Shake        | Shake strength                                                        |
| Animate Lighting    | Ambient/Directional/Point/Spot · Intensity/Color/Position/Rotation    |
| Shadow              | Offset X/Y(/Z) · Blur · Spread · Opacity                              |
| Post Processing     | Bloom · DOF · Vignette · Chromatic Aberration · Film Grain · Tone Map |
| Shader Parameter    | Uniform 이름 · Float/Color/Vec2/Vec3/Vec4 · 목표값                    |

Advanced의 Visual Pipeline에는 Performance/Balanced/High 품질, HDR,
Tone mapping, Shadow map 품질을 둔다.

### GLB 내부 구조 제어

GLB 업로드 시 Animation, Material, Morph뿐 아니라 Bone, Joint, Mesh와 Mesh의
material group을 읽어 메타데이터로 저장한다. 실제 데이터가 있는 경우에만 아래
Effect를 노출한다.

- `Bone Transform`: Bone 선택 → Position/Rotation/Scale → XYZ
- `Joint Rotation`: Joint 선택 → XYZ 회전
- `Mesh Transform`: Mesh 선택 → Position/Rotation/Scale → XYZ
- `Mesh Visibility`: Mesh 선택 → Visible
- `Mesh Face Material`: Mesh 선택 → Material Group / 단일 Face index /
  Face range / 캔버스에서 직접 선택 → Material 선택

기본 단위는 exporter가 보존한 Mesh material group이다. 개별 Face/Range도
지원하지만 GLB의 topology가 바뀌어 재업로드되면 index가 달라질 수 있으므로
다시 선택해야 한다는 경고를 함께 표시한다.

### Interaction 이벤트 → Scene Logic 경계

각 Interaction은 Advanced에서 다음 수명주기 이벤트를 노출한다.

- `On Trigger`
- `On Start`
- `On Complete`
- `On Reset`
- `On Collision`
- `Custom Event` + event name

LOGIC 탭은 이 이벤트를 구독한 뒤 `Variable`, `Scene visited`, `Trigger count`
조건을 조합하고 변수 Set/Increase/Decrease/Toggle을 실행한 다음 Scene을
이동·이전·재시작·종료한다. LOGIC이 transform/effect/timing을 직접 편집하지
않는 것이 두 탭의 명확한 경계다.

### 정밀 Keyframe 편집기

Advanced의 `Edit keyframes…`는 패널 안의 작은 폼이 아니라 별도 modal
timeline을 연다. 선택한 모든 요소를 객체 그룹으로 표시하며 다음 트랙을
지원한다.

- 2D: Position X/Y, Rotation Z, Scale X/Y, Opacity
- 3D: Position/Rotation/Scale X/Y/Z, Opacity
- GLB: Material, 각 Morph Target weight
- 선택 Effect: Camera position/rotation/zoom/FOV, Blur/Color/Shadow,
  Light/Post Processing/Shader 값, Bone/Joint/Mesh XYZ를 해당 Effect 전용
  트랙으로 표시
- 공통: Play/Pause, playhead, 50–250% zoom, 키프레임 추가·복제·삭제,
  Time/Value, Linear/Ease In/Ease Out/Ease In Out/Hold/Custom Curve

이 UI 역시 현재 로컬 프리뷰다. 다음 구현 단계에서 interaction schema,
undo/redo, IndexedDB 저장, viewer runtime 평가기와 연결해야 한다.

---

## 부록 B — 3D 구현 인수인계 (다른 PC·AI 에이전트용)

이 절은 저장소를 처음 읽는 개발자나 AI가 3D 기반과 Interaction 3D UI의
경계를 추측하지 않도록 만든 코드 인수인계다. 아래 계약을 바꾸려면 2D 편집기,
프로젝트 문서, Preview, Interaction 조건부 UI를 함께 검토한다.

### B-1. 제품·좌표계 계약

- 에디터 UX와 아트보드는 계속 2D다. 3D 오브젝트만 같은 페이지 안의 WebGL
  Scene에서 렌더링하며, 사용자가 에디터 카메라를 자유 탐색하는 구조가 아니다.
- 기본 카메라는 아트보드를 정면으로 보고, Scene은 Orthographic/Perspective
  projection과 camera position/target을 가진다.
- 저작 좌표는 아트보드 픽셀 기준으로 `X=오른쪽`, `Y=아래`, `Z=깊이`다.
  Three.js World로 넘길 때 Y축 방향을 어댑터에서 변환한다.
- 2D와 3D는 같은 Page/Scene에 존재하지만 데이터 컬렉션과 선택 ID는 분리한다.
  2D는 `elements`/`selectedElementIds`, 3D는
  `objects3d`/`selectedObject3DIds`를 사용한다. 한쪽을 선택하면 다른 쪽 선택을
  해제한다.
- 3D 오브젝트 데이터에는 `behind-2d` 또는 `front-of-2d` 합성 레이어가 있다.
  다만 현재 `Artboard3DScene`은 이 값으로 렌더 패스를 분기하지 않으므로 실제
  앞/뒤 합성은 후속 구현이다. 2D를 억지로 Three.js Mesh로 바꿔 기존 DOM 편집
  동작을 깨뜨리지 않는다.

### B-2. 구현 파일 지도

| 책임 | 기준 파일 |
| --- | --- |
| 3D 데이터 타입·기본값 | `web/src/features/editor/three/types.ts` |
| 프리미티브·벡터 Geometry 생성 | `three/geometry-factory.ts`, `three/vector-shape-adapter.ts` |
| 2D 벡터/GLB를 Object3D 데이터로 생성 | `three/object-factory.ts` |
| 좌표 변환·화면 투영 Bounds | `three/coordinate-system.ts` |
| GLB 검증·메타데이터·IndexedDB·복제 | `three/model-assets.ts` |
| GPU Geometry/Material/Texture 해제 | `three/resource-disposal.ts` |
| 아트보드 WebGL 렌더·선택 | `components/canvas/artboard-3d-scene.tsx` |
| 페이지별 3D 상태·선택·Undo/Redo | `store/editor-store.ts` |
| 프로젝트 저장 스키마·복원 | `core/project/schema.ts`, `core/project/editor-document.ts` |
| 인터랙션 공통 데이터 모델·기본값 | `lib/interaction-model.ts` |
| 2D 뷰어 트리거·효과 평가 | `lib/interaction-runtime.ts`, `components/viewer/viewer-preview.tsx` |
| Rapier 2D·3D 물리 기반 | `lib/interaction-physics.ts`, `lib/interaction-physics-3d.ts` |
| 3D Trigger/Mapping/Effect 허용 정책 | `components/panels/interaction-panel-policy.ts` |
| Interaction 조건부 폼 | `components/panels/interaction-panel.tsx` |
| 정밀 타임라인 UI | `components/panels/keyframe-timeline-editor.tsx` |
| Scene 분기 이벤트 UI | `components/panels/logic-panel.tsx` |
| 에디터 2D/3D 선택 연결 | `components/editor-shell.tsx` |

`Object3DElement`의 `source`는 세 종류다.

1. `primitive`: Box/Sphere/Cylinder/Cone/Torus
2. `vector`: 2D 경로 snapshot을 Plane/Extrude/Revolve/Inflate로 변환
3. `asset`: IndexedDB에 저장된 GLB의 `assetId` 참조

Transform은 Position/Rotation/Scale XYZ와 Pivot을, Dimensions는 Width/Height/
Depth를 가진다. Material은 Color/Opacity/Metalness/Roughness/Double sided와
GLB 원본 재질 사용 여부를 가진다. GLB는 현재 **binary glTF 2.0 `.glb`만**
받는 기반 API로 파일당 100MB 제한이다. Animation, Bone/Joint, Mesh, Material
group, Morph Target 이름을 import 시 메타데이터로 추출한다. 단, 현재 이 API를
호출하는 업로드 툴바/버튼은 아직 연결되지 않았다.

### B-3. Interaction 패널에 3D 항목이 나타나는 조건

- 선택 대상이 전부 `object3d`면 `is3DSelection=true`가 되어 3D Collision,
  Mapping, Transform XYZ, Spatial Effect, Reset scope, Rigid body/Collider/
  Constraint 설정을 추가한다.
- 같은 Scene에 2D와 3D가 함께 있고 둘 중 한 종류를 선택하면
  `isHybridCollisionAvailable=true`가 되어 2D↔3D Collision 설정을 추가한다.
- GLB 전용 Trigger/Effect는 단순히 3D라는 이유만으로 표시하지 않는다.
  선택한 asset의 메타데이터에 실제 Animation/Bone/Joint/Mesh/Material/Morph가
  있을 때만 해당 항목을 표시한다.
- `primitive`를 선택하면 Collision·XYZ·공간 Transform·3D Physics 기획 UI는
  볼 수 있지만, GLB clip/Bone/Joint/Mesh 전용 목록은 보이지 않는 것이 정상이다.
- GLB blob과 메타데이터는 브라우저 IndexedDB의 로컬 프로젝트에 저장된다. 한
  PC에서 import한 GLB는 GitHub Pages나 다른 PC로 자동 공유되지 않는다.
  GLB hierarchy 전용 UI를 검증하려면 추후 업로드 UI를 연결하거나, 별도의
  테스트 fixture asset/metadata를 제공해야 한다.
- 2D와 3D 혼합 다중 선택에서는 두 종류에 안전한 공통 항목만 보여준다. 3D
  전용 Bone/Material/Collider 값을 혼합 선택에 일괄 적용하지 않는다.

### B-4. GitHub Pages와 로컬 확인 범위

Pages와 로컬 개발 서버 모두 빈 Scene에 샘플 2D/3D 객체를 자동 생성하지
않는다. `?threeDemo=1`·`?interactionDemo=1` URL도 더 이상 데모를 켜지
않는다. GLB 업로드 UI와 Interaction 패널→런타임 연결 역시 후속 작업이므로,
새 빈 프로젝트의 UI만으로 3D 인터랙션 런타임 전체를 시연할 수는 없다.

기반을 검증할 때는 `interaction-model`, `interaction-runtime`,
`interaction-physics`, `interaction-physics-3d`, `editor-store.interactions`
테스트를 실행한다. 실제 요소/오브젝트에 유효한 `interactions`가 들어 있는
테스트 fixture가 있으면 관람 Preview에서 지원되는 부분집합을 확인할 수
있다. 기획 패널의 3D 조건부 필드와 런타임 동작은 별개로 검증한다.

### B-5. 현재 구현됨 / 아직 미구현

**구현됨**

- Page별 3D Scene 설정과 Object3D 데이터, 선택·추가·수정·삭제·Undo/Redo
- Box/Sphere/Cylinder/Cone/Torus 및 벡터 기반 3D Geometry 생성 기반
- `.glb` 검증, IndexedDB 저장, 로딩·복제, 메타데이터 추출 기반 API
- 아트보드와 Preview의 Three.js 렌더링, 조명, 그림자, 선택 Box
- 프로젝트 문서의 `objects3d`/`scene3d` 직렬화·복원
- 3D/하이브리드 선택에 따른 Interaction 조건부 UI와 타임라인·Logic UI
- 요소별 `InteractionDefinition` 데이터 모델·스토어 조작·문서 정규화 기반
- 뷰어의 2D Click/Tap·Hover·Drag·After Delay·Pointer Move·Scroll/Swipe와
  Move·Rotate·Scale·Opacity·Skew·Blur·Shadow·Show/Hide·Shake 일부 조합
- Rapier 2D/3D 중력·바운스 기반과 3D World의 정적 2D 충돌 프록시

**아직 UI 기획·프리뷰 상태**

- Interaction 패널의 로컬 샘플 설정을 스토어·뷰어·Undo/Redo에 연결하고
  프로젝트 저장·로드/IndexedDB 정책 확정
- GLB import API를 호출하는 사용자용 업로드·재연결·삭제 UI
- 나머지 Trigger·Effect 조합, Reset, Conflict/Priority 평가기
- 기획된 충돌 Trigger 감지·물체 간 Bounce Off Target·Stack·Liquid Merge
- Camera/Light/Shadow/Post Processing/Shader Effect의 관람 Preview 실행
- GLB AnimationMixer, Crossfade/Root motion, Bone/Joint/Mesh/Face 런타임 제어
- Liquid Merge 메타볼/셰이더, 정밀 Keyframe 재생기
- Interaction 수명주기 이벤트를 Logic Scene 분기로 전달하는 런타임 Event Bus

현재 `editor-shell.tsx`가 Logic 패널에 전달하는 Interaction 목록은 요소별
`Configured interaction` placeholder이고 실제 Interaction 데이터가 아니다.
Logic rule도 컴포넌트 로컬 상태다. Keyframe modal 역시 변경 콜백이 연결되지
않은 로컬 프리뷰이므로 닫기·선택 변경·새로고침 후 프로젝트 데이터로 유지된다고
가정하면 안 된다. `Pick face in 3D object`도 현재 캔버스 picking을 시작하지 않는
UI placeholder다.

기존 뷰어 런타임은 에디터의 원본 `elements`/`objects3d`를 매 프레임
변경하지 않고 관람 Preview의 별도 상태·Object3D 인스턴스를 사용한다. 범위를
확장할 때도 이 원칙을 유지하고, 페이지 이탈 시 AnimationMixer·Physics body·
GPU resource·event listener를 모두 해제해야 한다.
