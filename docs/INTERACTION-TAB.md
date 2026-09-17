# Interaction 탭 — 전체 기획 + 구현 현황 (2026-09-17)

관람객 인터랙션(클릭·호버·드래그·충돌·시간 등)에 반응하는 효과를 작가가
코드 없이 붙이는 탭. 확정 스펙 목업: `docs/interaction-panel-final.png`
(실서비스 UI 토큰으로 렌더링된 한 장짜리 스펙 문서 — 이 문서와 함께 볼 것).

## 현재 상태

- **UI 프리뷰만 구현됨** (커밋 `85e5eee`). 모든 상태는 `interaction-panel.tsx`
  컴포넌트 로컬이며 **스토어에 아무것도 저장하지 않고, 뷰어 런타임도 없다.**
  목록의 인터랙션 4개(Move/Scale/Opacity/Show·Hide)는 하드코딩 샘플이다.
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

| 컨트롤 | 기능 |
|---|---|
| Selected + 요소명 | 현재 선택된 요소 표시. 효과는 항상 이 요소에 적용된다 (감지 영역과 별개 개념) |
| **+ Add interaction** (보라 버튼) | 새 인터랙션 생성. 기본값: Click/Tap 트리거, 효과 미정 상태로 목록에 추가되고 편집 폼이 열린다 |

## 인터랙션 목록 (트리거별 그룹)

같은 트리거끼리 그룹 박스로 묶인다. 그룹 헤더 = 트리거 이름 + **+ Add effect**
(같은 트리거로 효과 하나 추가 — 클릭 시 이동+크기+투명도 같은 동시 효과를
쉽게 구성하기 위한 단축 경로).

각 행의 컨트롤:

| 컨트롤 | 기능 |
|---|---|
| **▶** (원형 버튼) | 이 인터랙션 하나만 즉석 미리보기 재생 (전체 Preview 안 열고 확인) |
| **토글** | 활성/비활성. 꺼진 행은 흐리게 표시되고 뷰어에서 실행되지 않음. 튜닝 중 켜고 끄며 비교하는 용도라 ⋯ 메뉴가 아닌 행에 노출 |
| 이름 | 효과 이름 (Move, Scale …). 행 클릭 = 이 인터랙션을 아래 편집 폼에 로드 (한 번에 하나만 편집) |
| 메타 | 핵심 값 요약 (예: "X +100 px", "→ 40 %") |
| **⋯** | 메뉴: 복제 / 삭제 |

## 1. WHEN — 트리거

**Trigger** 드롭다운 (6그룹 21종, 그룹 헤딩 표시):

| 그룹 | 트리거 | 의미 · 규칙 |
|---|---|---|
| Tap & pointer | Click / Tap | 클릭·탭 1회 (이벤트형) |
| | Double Click / Double Tap | 같은 요소에 Click도 있으면 Click은 더블클릭 판정 시간만큼 대기 후 실행 |
| | Hover | 포인터 진입/이탈. 선택 시 Mobile fallback 행 노출 |
| | Touch Start / Touch End | 터치 시작/끝 |
| | Long Press | 길게 누르기. 기본 0.5초(조절 가능) |
| Continuous | Pointer Move / Touch Move | 포인터 위치를 실시간 입력으로 사용 (연속형) |
| | Drag | 드래그. **이 트리거가 걸리면 뷰어에서 해당 요소가 드래그 가능해진다** |
| | Wheel / Pinch | 휠·핀치 양을 입력으로 |
| | Scroll / Swipe | 페이지 스크롤 진행도. **scroll 타입 페이지에서만 목록에 노출** |
| Collision | Overlap Start | 대상 요소와 겹침 시작 순간 (이벤트형) |
| | While Overlapping | 겹쳐 있는 동안 (연속형 — Overlap Time 매핑 사용 가능) |
| | Overlap End | 겹침이 끝나는 순간 |
| | Drop On Target | 대상 위에 겹친 상태로 드래그를 놓는 순간 (드롭 존) |
| Time | After Delay | 페이지 진입 N초 후 1회 |
| | Repeat Every… | 페이지 진입 후 N초마다 반복 (상시 구동 연출) |
| | Idle Start / Idle End | 관람객 입력이 N초 없을 때 / 다시 입력이 들어올 때 |
| Media | Video Starts / Video Ends | 비디오 요소 재생 시작/끝 (비디오 요소 타입 신설 선행) |
| Page | Page Enter / Page Exit | 페이지 진입/이탈 |

**Trigger area** — 행동을 감지하는 범위 (효과 적용 대상과 별개):

| 옵션 | 의미 |
|---|---|
| Selected object (기본) | 선택한 요소 위에서 감지 |
| Entire artwork | 작품 전체에서 감지 |
| Draw detail area… | 캔버스에 감지 영역을 직접 그림. 그린 영역은 점선 오버레이로 남아 도형처럼 계속 편집 가능 |

**Mobile fallback** — Hover 선택 시에만 노출. 각 옵션이 호버의 진입(enter)과
이탈(leave)을 함께 정의한다 (RESET의 "포인터 이탈 시 복귀"가 터치에서도 명확하도록):

| 옵션 | enter / leave 정의 |
|---|---|
| Tap (기본) | 탭 = 토글. 다시 탭하면 이탈 |
| Touch Start | 터치하고 있는 동안만 호버 상태 |
| Long Press | 길게 누르고 있는 동안만 호버 상태 |

**Collision 전용 필드** — Collision 그룹 트리거 선택 시에만 노출:

| 필드 | 기능 |
|---|---|
| Target element | 겹침 상대 요소 지정. **대상이 삭제되면 이 인터랙션은 자동 비활성 + 경고 표시** |
| Detection | Bounding box(기본, 빠름) / Precise outline(도형 외곽선 정밀 판정) |

성능 규칙: 충돌 검사는 충돌 인터랙션에 참여하는 요소만 수행. 박스 판정 먼저,
박스가 겹칠 때만 외곽선 비교. (외곽선 교차는 기존 `lib/pathfinder.ts`의
polygon-clipping 재료 재사용 가능)

**Time 필드** — Time 그룹 트리거 선택 시에만 노출. 지연/간격/유휴 초.
기준 시점은 페이지 진입.

**대칭 규칙**: 효과는 항상 "선택한 요소"에 적용된다. 충돌 시 상대(B)도
반응시키려면 B를 선택해 인터랙션을 하나 더 만든다 (Trigger: Overlap Start,
Target: A).

## 2. MAPPING — 입력 해석 (연속형·충돌 트리거에서만 노출)

**Input mapping** 드롭다운:

| 매핑 | 정의 | 파라미터 |
|---|---|---|
| Drag Progress | 드래그 길이를 0→100%로 | **Track distance**(분모가 되는 기준 거리, px) + **Axis**(Free / X만 / Y만 — 슬라이더형 인터랙션용) |
| Drag Angle | 원형 드래그 각도 (핸들·다이얼) | Full turn: 360° → 100% |
| Scroll Progress | 페이지 스크롤 0→100% | (scroll 페이지 전용) |
| Wheel / Pinch Amount | 휠 누적량·핀치 배율 | Range (예: 500px · 0.5×→2×) |
| Pointer Velocity | 포인터 속도 | Max velocity: 100%로 해석할 상한 (예: 2000 px/s) — 속도는 무한대라 상한 필수 |
| Overlap Time | 겹쳐 있는 시간 (충돌 트리거) | Max time: 100%로 해석할 시간 (예: 3s) |

- **Input range** (min% ~ max%): min/max를 서로 바꾸면 방향 반전 (100→0).
- **Threshold**: 값이 N%를 상향 돌파하는 순간 이벤트 1회 발동.
  아래로 내려가면 재장전(다시 돌파하면 재발동). 예: 5 Gum 게이지 완충 연출.
- Click처럼 1회성 이벤트 트리거에서는 이 섹션 전체가 숨겨진다.
- 물리적 움직임은 여기가 아니라 4. HOW에서 설정한다.

## 3. DO — 효과

**Effect** 드롭다운 — 선택 요소 타입에 따라 자동 필터, 사용 불가 효과는 숨김:

공통(도형 포함) 12종과 효과별 파라미터:

| 효과 | 파라미터 |
|---|---|
| Move | X/Y(px), **Path**(Straight / Circular — 기준점 중심 원형 궤도. FFF 원형 메뉴용), Reference point(중심/모서리) |
| Scale | X/Y (%) |
| Rotate | 각도 + **축 지정: Z(평면) / X 플립 / Y 플립** (카드 뒤집기, split-flap) |
| Skew / Distort | 기울임·왜곡 값 |
| Opacity | 목표 투명도 (%) |
| Color | 채움(fill)·선(stroke) 목표 색 |
| Blur | 블러 강도 |
| Shadow | 그림자 깊이(elevation)·부드러움 |
| Show / Hide | 전환: Fade 또는 **마스크 리빌**(원형 확산 · 와이프 · 물결). 마스크 위치는 포인터 매핑에 연결 가능 (FFF Wiper처럼 커서를 따라 닦아내기) |
| Shake | 흔들림 강도 |
| Order | 맨앞으로 / 맨뒤로 (드래그 중인 요소가 가려지는 문제 해결) |

타입별 추가 효과:

| 요소 타입 | 추가 효과 |
|---|---|
| Image | 공통 + Particle · Pixelate · Dissolve · Trail (WebGL 이펙트 레이어) |
| Video | Blur · Color · Play · Pause · Resume · Seek (비디오 요소 타입 신설 선행 — 현재 CanvasElementType에 video 없음) |
| Text | Reveal · **Stroke Draw**(획 그리기) · Character / Word Animation |
| Multi(다중 선택) | Group Animation (TIMING의 Stagger 사용) |

## 4. HOW — 모션

**Behavior** 드롭다운 (선택한 매핑에서 가능한 것만 노출):

| 모션 | 정의 | 파라미터 |
|---|---|---|
| Direct | 값 즉시 반영 | — |
| Spring | 스프링. **이벤트형 = 목표값까지 스프링 애니메이션, 연속형 = 입력을 스프링으로 추종** (같은 이름, 두 동작) | Strength · Mass · Damping (세부는 Advanced 슬라이더) |
| Inertia | 손을 떼도 관성 유지 | Initial velocity · Friction · Deceleration |
| Bounce | 끝 지점 반동 | Strength · Bounce count · Damping |
| Gravity | 낙하 + 충돌 튕김 | **Bounce off**: Artboard edges(기본) + 작가가 지정한 장애물 요소. Strength · Bounciness · Direction |

Gravity 스코프: 낙하·튕김·드롭 존까지. **쌓임(스태킹)은 제외** — 정지 접촉
해석에 물리 솔버가 필요해서 이번 스코프가 아님. 지정된 장애물만 충돌
검사하므로 성능 규칙과 정합.

## 5. TIMING — 시간

트리거 방식에 따라 UI가 바뀐다 (동시에 둘 다 보여주지 않음):

**이벤트형** (Click, Page Enter 등):

| 필드 | 기능 |
|---|---|
| Time / Delay | 재생 시간 / 시작 지연 (초, ▲▼ 스테퍼) |
| Stagger | 그룹·다중 요소의 순차 지연 (초). 순서: forward / reverse / random |
| Easing | Linear / Ease In / Ease Out / Ease In Out / **Custom Curve…**(별도 커브 편집 팝업) |

**연속형** (Drag, Pointer Move 등):

| 필드 | 기능 |
|---|---|
| Smoothing | 입력을 따라잡는 지연 시간 (초). 0 = 즉시 반응. (기획 초안의 "Response Speed %"를 단위 있는 값으로 교체) |
| Easing | 위와 동일 목록 |

## 6. RESET — 종료 후

**After** 드롭다운. 기본값 "Contextual default"는 트리거별로 자동 결정:

| 트리거 | 기본값 | 대안 |
|---|---|---|
| Click / Tap | Keep final state (마지막 상태 유지) | Restart when triggered again (재실행 시 처음부터) |
| Hover | Return when pointer leaves (이탈 시 복귀) | Keep final state |
| Drag | Return when trigger ends (놓으면 복귀) | Keep final state |
| Drop On Target | Keep final state | — |
| Time / Idle | Keep final state | — |
| Page Enter | 페이지 이탈 시 초기화 | — |

규칙: 복귀 애니메이션은 해당 인터랙션의 Duration·Easing을 재사용.
어떤 선택이든 **뷰어 런타임 상태만** 바뀐다 (원본 불변 — 연보라 안내 문구로
패널에 상시 표기).

## ADVANCED (기본 접힘)

| 컨트롤 | 기능 |
|---|---|
| Same property | 같은 속성에 여러 효과 충돌 시: **Replace existing**(기본, 새 것으로 대체) / Additive(값 누적) / Interrupt(기존 즉시 중단) |
| Other property | 다른 속성끼리: **Run in parallel**(기본, 동시) / Run in order(아래 목록 순서대로 순차) |
| 실행 목록 | 전체 인터랙션이 순서대로 나열. **드래그로 재정렬 — 이 순서가 곧 우선순위** (별도 Priority 숫자 없음, 이것이 유일한 우선순위 소스) |
| Repeat | 반복 횟수. **∞ 허용** — 상시 구동 앰비언트 루프는 페이지 이탈까지 재생 |
| Yoyo | 완료 후 반대 방향 재생 (체크) |
| Hold | 종료 상태 유지 시간 (초) |
| Cursor on hover | Default / Pointer — 호버 가능함을 커서로 알림 |
| Physics details | 현재 모션의 물리값 세부 슬라이더 (Spring이면 Strength/Mass/Damping) |
| Keyframes | 시작·끝 시점만 바 표시 + **Edit keyframes…** 버튼 → 별도 타임라인 편집 화면 (패널 안에 키프레임 편집을 넣지 않음) |

## 스코프에서 제외한 것 (의도적)

- 입력: 카메라 · 마이크(음성) · 키보드 · ML 인식 — 장기 로드맵 후보(전시 센서 입력)
- 물리: 스태킹(쌓임), 겹침 깊이 매핑, 요소 간 마찰·밀기
- 3D 씬/셰이더 풀 렌더링, 드로잉→오브젝트 생성, 입력 기록·역재생

## 다음 구현 단계 가이드 (기능 구현 시)

1. **데이터 모델**: 페이지 레벨 목록 + `targetElementIds` 참조 구조 권장
   (감지 주체 ≠ 적용 대상인 Collision, Multi 선택의 Group Animation 때문).
   UI는 지금처럼 선택 요소 기준으로 필터해 보여주면 된다.
   트리거 enum은 SOUND 탭 `InteractionSoundTrigger`와 통일할 것.
2. **뷰어 런타임**: `viewer-preview.tsx`에 인터랙션 그래프 추가.
   연속 매핑은 rAF 프레임마다 대상 노드 transform 직접 조작
   (드래그 프리뷰 `lib/dom-preview.ts`와 같은 패턴). 원본 스토어는 절대 쓰지 않는다.
3. **충돌 판정**: AABB 우선 → 겹칠 때만 `lib/pathfinder.ts` 외곽선 교차.
   참여 요소만 검사.
4. **알려진 이슈**: e2e `editor.spec.ts` "draws a shape on the canvas outside
   the artboard"는 드래그 커밋 직후 boundingBox 샘플링 타이밍에 민감한
   기존 측정 레이스로, 번들 크기가 바뀌면 실패할 수 있음(테스트 위 주석 참고).
   런타임 회귀 아님.

---

## 부록 A — 컨트롤별 드롭다운 항목·표시 조건 전수표

UI 동작을 구현할 때 이 표가 단일 기준이다. "표시 조건"이 없는 행은 항상 표시.

### A-1. 드롭다운을 눌렀을 때 뜨는 항목 (전수)

| 컨트롤 | 표시 조건 | 눌렀을 때 표시되는 항목 (순서대로) |
|---|---|---|
| Trigger | 항상 | 그룹 헤딩 6개(보라 소문자 캡션) 아래로: **TAP & POINTER** Click/Tap · Double Click/Double Tap · Hover · Touch Start · Touch End · Long Press / **CONTINUOUS** Pointer Move/Touch Move · Drag · Wheel/Pinch · Scroll/Swipe(scroll 페이지에서만 항목 노출) / **COLLISION** Overlap Start · While Overlapping · Overlap End · Drop On Target / **TIME** After Delay · Repeat Every… · Idle Start · Idle End / **MEDIA** Video Starts · Video Ends(비디오 요소 있을 때만) / **PAGE** Page Enter · Page Exit |
| Trigger area | 항상 | Selected object(기본) · Entire artwork · Draw detail area… |
| Mobile fallback | Trigger = Hover | Tap(기본) · Touch Start · Long Press |
| Target element | Trigger ∈ COLLISION | 현재 페이지의 다른 요소 전체 목록 (요소명 + 타입, 자기 자신 제외) |
| Detection | Trigger ∈ COLLISION | Bounding box(기본) · Precise outline |
| Input mapping | MAPPING 섹션 표시 시 | 트리거별 가용 항목만: Drag → Drag Progress(기본) · Drag Angle · Pointer Velocity / Pointer Move → Pointer Velocity · (위치 매핑) / Scroll·Swipe → Scroll Progress / Wheel·Pinch → Wheel/Pinch Amount / COLLISION(While Overlapping) → Overlap Time |
| Axis | Input mapping = Drag Progress | Free(기본) · X only · Y only |
| Effect | 항상 | 요소 타입별 가용 목록만 (3. DO 표 참고). 사용 불가 항목은 숨김(회색 아님) |
| Path | Effect = Move | Straight(기본) · Circular |
| Reference point | Effect = Move·Scale·Rotate 등 기하 효과 | Center(기본) · Top Left · Top Right · Bottom Left · Bottom Right |
| Behavior (Motion) | 항상 | A-2 매트릭스의 가용 항목만 |
| Bounce off | Behavior = Gravity | Artboard edges(기본) · Artboard + obstacles…(요소 다중 선택 UI) |
| Easing | TIMING 표시 시 | Linear · Ease In · Ease Out · Ease In Out · Custom Curve…(선택 시 커브 편집 팝업 열림) |
| After (Reset) | 항상 | Contextual default(기본) · Keep final state · Restart when triggered again · Return when trigger ends — 현재 트리거에 무의미한 항목은 숨김 (예: Page Enter에는 Return 없음) |
| Same property | Advanced | Replace existing(기본) · Additive · Interrupt |
| Other property | Advanced | Run in parallel(기본) · Run in order |
| Cursor on hover | Advanced | Default · Pointer(기본) |

### A-2. Motion × 트리거/매핑 가용 매트릭스

"매핑별 자동 필터"의 확정 기준. (기존 문서에서 암묵적이던 것을 여기서 확정)

| 입력 상황 | Direct | Spring | Inertia | Bounce | Gravity |
|---|---|---|---|---|---|
| 이벤트형 트리거 (Click·Page Enter·Time·Overlap Start 등) | ✓ | ✓ (목표값까지 애니메이션) | ✓ (Initial velocity로 던지기) | ✓ | ✓ (트리거 순간 낙하 시작) |
| Drag/Scroll/Angle/Wheel Progress (위치성 연속값) | ✓ | ✓ (입력 추종) | ✓ (놓은 뒤 관성) | ✓ (끝점 반동) | — |
| Pointer Velocity (속도값) | ✓ | ✓ | — | — | — |
| Overlap Time | ✓ | ✓ | — | — | — |

### A-3. 트리거 선택 시 섹션·필드 노출 변화 (요약 매트릭스)

| 선택한 트리거 | WHEN 추가 필드 | 2.MAPPING | 5.TIMING 모드 |
|---|---|---|---|
| Click/Tap · Double · Touch Start/End · Long Press | — | 숨김 | 이벤트형 (Time·Delay·Stagger·Easing) |
| Hover | Mobile fallback | 숨김 | 이벤트형 |
| Pointer Move · Drag · Wheel/Pinch · Scroll/Swipe | — | 표시 | 연속형 (Smoothing·Easing) |
| Overlap Start · Overlap End · Drop On Target | Target element · Detection | 표시 (Overlap Time 등) | 이벤트형 |
| While Overlapping | Target element · Detection | 표시 | 연속형 |
| After Delay · Repeat Every · Idle Start/End | Time (초) | 숨김 | 이벤트형 |
| Video Starts/Ends | — | 숨김 | 이벤트형 |
| Page Enter/Exit | — | 숨김 | 이벤트형 |

### A-4. 효과 선택 시 3.DO 내부 필드 교체

| Effect | 표시 필드 |
|---|---|
| Move | X(px) · Y(px) · Path · Reference point |
| Scale | X(%) · Y(%) · (Lock ratio 토글) · Reference point |
| Rotate | 각도(°) · Axis(Z/X flip/Y flip) · Reference point |
| Skew / Distort | 값 필드 |
| Opacity | 목표 % (슬라이더 + 값) |
| Color | Fill 색 · Stroke 색 (컬러 필드) |
| Blur | 강도(px) |
| Shadow | Elevation · Softness |
| Show / Hide | 전환: Fade / Mask reveal → Mask reveal 선택 시 형태(Circle expand·Wipe·Wave) + "마스크 위치를 포인터에 연결" 옵션 |
| Shake | 강도 |
| Order | Bring to front / Send to back 선택 |
| (Image) Particle·Pixelate·Dissolve·Trail | 각 강도/밀도 파라미터 (WebGL 레이어) |
| (Text) Reveal·Stroke Draw·Char/Word | 방향·순서 파라미터 |

### A-5. Behavior 선택 시 4.HOW 내부 필드 교체

| Behavior | 표시 필드 |
|---|---|
| Direct | (물리 필드 없음) |
| Spring | Strength · Mass · Damping (3칸) |
| Inertia | Initial velocity · Friction · Deceleration |
| Bounce | Strength · Bounce count · Damping |
| Gravity | Bounce off · Strength · Bounciness · Direction |
