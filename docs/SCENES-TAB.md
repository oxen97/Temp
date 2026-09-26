# SCENES 탭 — 씬 설정과 씬별 배경 (2026-09-27)

오른쪽 속성 패널의 SCENES 탭은 지금 선택한 씬을 설정한다. 이 문서는 무엇이
씬마다 따로이고 무엇이 모든 씬에 공통인지, 그리고 배경과 3D 씬용
"카메라와 함께 회전(Rotate with Camera)" 옵션이 어떻게 동작하는지 정리한다.

## 씬별 설정과 공통 설정

| 항목 | 범위 | 비고 |
| --- | --- | --- |
| Page Name | 씬마다 | |
| Page Size(W·H, 비율), Page Type, Viewport | 모든 씬 공통 | 작품 하나는 캔버스 크기가 하나다. |
| Background(Solid · Gradation · Image · Video와 세부값) | 씬마다 | 아래 「씬별 배경」 |

## 씬별 배경

- **편집**: SCENES 탭의 Background는 지금 씬의 배경만 바꾼다. 다른 씬의
  썸네일·캔버스는 그대로다.
- **공통 배경**: 작품에는 공통 배경이 하나 있다. 자기 배경이 없는 씬은 공통
  배경을 보여 준다. 공통 배경을 보여 주던 씬은 처음 편집할 때 공통 배경을
  복사해 자기 배경을 만든다.
- **Apply to All Scenes**(Background 줄 오른쪽 버튼): 지금 씬의 배경을 공통
  배경으로 만들고 모든 씬이 그 배경을 쓴다. 새로 추가하는 씬도 공통 배경으로
  시작한다. 모든 씬이 이미 공통 배경을 쓰면 버튼이 꺼진다.
- **되돌리기**: 배경 편집과 Apply to All Scenes 모두 한 단계로 되돌린다.
  Apply to All Scenes를 되돌리면 각 씬의 자기 배경이 돌아온다.
- **표시**: 에디터 캔버스, SCENES 목록 썸네일, 내비게이터, 관람 Preview가
  모두 그 씬의 배경을 쓴다.
- **영상·GIF 포스터**: 업로드 뒤 늦게 만들어지는 포스터는 그 파일을 쓰는 모든
  배경(되돌리기 기록 포함)에 붙는다. 포스터 때문에 되돌리기 단계가 늘지 않는다.
  그사이 다른 씬을 골라도 포스터는 파일을 올린 배경에 붙는다.

### 저장 형식

- 공통 배경: 지금처럼 문서의 `artboard` 배경 필드.
- 씬 배경: `scenes[].background`에 배경 필드 전체의 사본(`SceneBackgroundSettings`,
  `web/src/features/editor/lib/scene-background.ts`). 씬이 비워 둔 필드는 공통
  값이 아니라 기본값으로 읽는다. 그래서 저장했다 다시 열어도 같은 모습이다.
- `.amous` 파일은 씬 배경의 이미지·영상·포스터도 파일 안에 함께 담는다.
- 이전 파일에는 `scenes[].background`가 없으므로 모든 씬이 공통 배경을
  보여 준다. 즉 전과 똑같이 열린다. 형식이 잘못된 씬 배경은 버리고 공통
  배경을 보여 준다.

## 카메라와 함께 회전 (Rotate with Camera)

3D 씬에서 배경 이미지 한 장을 카메라를 둘러싼 하늘로 쓰는 옵션이다. 이
옵션은 SCENES 탭의 배경 설정이다. Interaction 탭의 효과가 아니다. 카메라를
돌리는 것은 그 씬의 Camera Rotate 인터랙션이다
(`docs/INTERACTION-TAB.md` 「Camera Rotate 실행 규칙」).

- **보이는 조건**: Background에 Image를 켜고, 그 씬에 사용 중인 Camera Rotate가
  있을 때 이미지 설정 아래에 체크박스가 나온다. Camera Rotate가 없는 씬은
  카메라가 돌지 않으므로 옵션이 없다.
- **이미지 읽는 법**: 이미지를 가로 360° × 세로 180°의 파노라마
  (equirectangular)로 읽는다. 이미지 가운데가 처음 카메라의 정면이다.
  2:1 파노라마가 가장 자연스럽다. 다른 비율의 이미지는 360°로 늘어난다.
- **관람 Preview**: 3D 레이어가 실제 카메라로 하늘을 그린다. 그래서 Camera
  Rotate로 돌면 같은 프레임에 하늘도 함께 돈다. 하늘은 모든 3D 오브젝트와 2D
  요소 뒤에 있다. 평면 배경 이미지는 그리지 않고, 그 아래 Solid·Gradation은
  그대로 둔다. 3D 오브젝트가 없는 씬도 하늘만으로 3D 레이어를 켠다(파노라마
  뷰어처럼 쓸 수 있다).
- **에디터·썸네일·내비게이터**: 처음 카메라가 보는 하늘을 정지 이미지로 보여 준다.
  구 모델처럼 에디터에서 큰 공으로 보이지 않는다. 에디터 화면과 Preview 첫
  화면은 같은 모습이다(측정한 색 차이는 채널당 1 이내).
- **시야각**: 카메라 효과의 Field of view(Perspective)로 하늘을 본다.
  Orthographic 카메라에는 시야각이 없으므로 씬의 Perspective 값(기본 35°)을 쓴다.
- **Fit / Opacity**: 하늘은 이미지 전체를 두르므로 Fit을 쓰지 않는다(흐리게
  꺼짐). Opacity는 적용되어 아래 Solid·Gradation 위에 겹친다.
- **하지 않는 것**: 영상 배경은 하늘로 쓰지 않는다(체크박스 없음). 애니메이션
  GIF는 첫 프레임만 하늘이 된다.
- **Apply to All Scenes와 함께**: 옵션을 켠 배경을 모든 씬에 적용해도
  Camera Rotate가 없는 씬에서는 평면 배경으로 보인다.
- **저장 필드**: `backgroundRotateWithCamera: boolean`(씬 배경 또는 공통 배경).

## 데모

AMOUS Playground의 08 SPACE 씬이 두 기능을 쓴다. 이 씬만 자기 배경(밤하늘
색 + 코드로 만든 4096×2048 밤하늘 파노라마 + 카메라와 함께 회전)을 갖는다.
다른 씬은 공통 배경을 쓴다. 이전에 쓰던 하늘 구 GLB는 뺐다. 드래그할 때 나는
swoosh 소리는 카메라 인터랙션을 가진 캡션의 Drag 사운드로 옮겼다.

## 구현 위치

| 파일 | 역할 |
| --- | --- |
| `web/src/features/editor/lib/scene-background.ts` | 배경 필드 목록, 씬이 보여 주는 아트보드 계산, 저장값 정규화 |
| `web/src/features/editor/store/editor-store.ts` | `updateSceneBackground`, `applySceneBackgroundToAll`, `setBackgroundMediaPreview` |
| `web/src/features/editor/components/panels/scene-panel.tsx` | SCENES 탭 UI(현재 씬 편집, Apply to All Scenes, Rotate with Camera) |
| `web/src/features/editor/three/camera-sky.ts` | 하늘 적용 조건, 셰이더, 에디터용 정지 이미지 렌더 |
| `web/src/features/editor/three/camera-sky-mesh.tsx` | Preview 3D 레이어의 하늘 |
| `web/src/features/editor/hooks/use-camera-sky-background.ts` | 캔버스·썸네일·내비게이터에 정지 이미지 연결 |
| `web/src/core/project/editor-document.ts` | 열 때 씬 배경 정규화 |
