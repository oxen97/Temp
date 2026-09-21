# AMOUS Local AI Lab

AMOUS 본체와 분리된 브라우저 로컬 LLM 실험 앱이다. Qwen3 4B Q4 모델을
WebGPU에서 실행해 한국어 요청을 검증 가능한 AMOUS 명령 JSON으로 변환한다.

## 격리 원칙

- `web/`의 의존성, 빌드, Store, IndexedDB를 사용하거나 변경하지 않는다.
- 모델 파일은 Git에 저장하지 않는다. 사용자가 **Load model**을 누른 뒤
  WebLLM이 원격 저장소에서 받고 브라우저 캐시에 보관한다.
- 출력은 화면에서만 검증하며 실제 AMOUS 프로젝트에는 적용하지 않는다.
- GitHub Pages workflow에는 이 디렉터리를 포함하지 않는다.

## 실행

```powershell
cd experiments/local-ai-lab
npm ci
npm run dev
```

브라우저에서 `http://127.0.0.1:5173/`을 연다. Chromium 계열 최신 브라우저와
WebGPU가 필요하다.

`Load model`을 누르기 전에는 모델 다운로드가 시작되지 않는다. 첫 실행 시 약
2.3 GB를 내려받으며, 준비된 파일은 브라우저 Cache Storage에 남는다. 현재 선택한
Q4 모델은 약 3.4 GB의 GPU 메모리를 요구한다.

## 사용 순서

1. 환경 진단에서 WebGPU가 `사용 가능`인지 확인한다.
2. `모델 다운로드 및 로드`를 누르고 최초 다운로드를 완료한다.
3. Prompt와 테스트용 AMOUS context JSON을 확인한다.
4. `초안 생성`을 누른다.
5. Validated JSON, 원문, 검증 오류, 속도 지표를 비교한다.

결과는 항상 `mode: "draft-only"`이며 기존 `web/` 프로젝트, Store, IndexedDB를
변경하지 않는다. 현재 AMOUS Interaction은 UI/정책 기획 단계라 실제 실행 성공으로
표시하지 않는다.

Fracture·Shatter·Scatter처럼 카탈로그에 없는 요청은 모델이 기존 효과를 임의로
조합하지 못하도록 결정적 사전 검사를 거쳐 단일 `unsupported` 명령으로 반환한다.
`Draft valid`는 구조와 문맥 검증을 통과했다는 뜻이며, 기능 지원 여부는
`Unsupported request` 및 `Needs clarification` 상태로 따로 표시한다.

## 검증

```powershell
npm test
npm run build
```

## 모델과 라이선스

- Base model: `Qwen/Qwen3-4B` (Apache-2.0)
- Browser weights: `mlc-ai/Qwen3-4B-q4f16_1-MLC`
- Runtime: `@mlc-ai/web-llm`

정식 제품에 포함하기 전에는 base model과 변환 weights의 LICENSE/NOTICE를 다시
고정 revision 기준으로 감사하고, Third-party notices에 함께 기록한다.

관련 고지는 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)에 정리했다.
