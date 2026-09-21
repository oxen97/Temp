import { useEffect, useMemo, useState } from "react";

import {
  MODEL_ID,
  cancelGeneration,
  checkEnvironment,
  checkModelCache,
  clearLocalModelCache,
  generateDraft,
  loadLocalModel,
  unloadLocalModel,
  type EnvironmentInfo,
  type GenerationResult,
  type LoadResult,
} from "./ai/local-ai";

type ModelStatus = "idle" | "loading" | "ready" | "unloading" | "error";
type CacheStatus = "checking" | "cached" | "not-cached" | "error";
type OutputTab = "validated" | "raw" | "issues" | "metrics";

const INITIAL_PROMPT =
  "Rectangle A를 클릭하면 오른쪽으로 100px 움직이고 스프링처럼 반응한 뒤 마지막 위치를 유지해줘.";

const INITIAL_CONTEXT = JSON.stringify(
  {
    selectedObjectIds: ["rect-a"],
    objects: [
      {
        id: "rect-a",
        name: "Rectangle A",
        type: "shape",
      },
      {
        id: "circle-b",
        name: "Circle B",
        type: "shape",
      },
      {
        id: "model-c",
        name: "Model C",
        type: "3d-model",
      },
    ],
    interactions: [],
  },
  null,
  2,
);

const EXAMPLES = [
  {
    label: "클릭해서 이동",
    prompt:
      "Rectangle A를 클릭하면 오른쪽으로 100px 움직이고 스프링처럼 반응한 뒤 마지막 위치를 유지해줘.",
  },
  {
    label: "Hover 투명도",
    prompt:
      "Rectangle A에 마우스를 올리면 투명도가 낮아지고, 포인터가 떠나면 원래 상태로 돌아오게 해줘.",
  },
  {
    label: "충돌 후 튕기기",
    prompt:
      "Rectangle A가 circle-b와 충돌하면 대상에서 자연스럽게 튕겨 나가게 해줘.",
  },
  {
    label: "지원 여부 확인",
    prompt: "Rectangle A가 충돌하면 20개 조각으로 깨져서 흩어지게 해줘.",
  },
] as const;

function Icon({ name }: { name: "spark" | "cpu" | "prompt" | "result" | "shield" }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "spark") {
    return (
      <svg {...common}>
        <path d="M12 3l1.25 4.1L17 8.5l-3.75 1.4L12 14l-1.25-4.1L7 8.5l3.75-1.4L12 3z" />
        <path d="M18.5 14.5l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3z" />
      </svg>
    );
  }

  if (name === "cpu") {
    return (
      <svg {...common}>
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
        <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
      </svg>
    );
  }

  if (name === "prompt") {
    return (
      <svg {...common}>
        <path d="M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v8a2.5 2.5 0 01-2.5 2.5H10l-5.5 4v-4A2.5 2.5 0 012 13.5v-8A2.5 2.5 0 014.5 3" />
        <path d="M7 8h10M7 12h6" />
      </svg>
    );
  }

  if (name === "result") {
    return (
      <svg {...common}>
        <path d="M7 3h7l4 4v14H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
        <path d="M14 3v5h5M9 13l2 2 4-4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 3l7 3v5c0 4.55-2.93 8.2-7 10-4.07-1.8-7-5.45-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function formatJson(value: unknown) {
  if (value == null) return "아직 생성된 결과가 없습니다.";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatNumber(value: number | null | undefined, digits = 1) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "—";
}

function getValidatedOutcome(value: unknown): "valid" | "unsupported" | "clarification" {
  if (!value || typeof value !== "object" || !("commands" in value)) return "valid";
  const commands = (value as { commands?: unknown }).commands;
  if (!Array.isArray(commands) || commands.length !== 1) return "valid";
  const action =
    commands[0] && typeof commands[0] === "object" && "action" in commands[0]
      ? (commands[0] as { action?: unknown }).action
      : null;
  if (action === "unsupported") return "unsupported";
  if (action === "needsClarification") return "clarification";
  return "valid";
}

function statusLabel(status: ModelStatus) {
  switch (status) {
    case "loading":
      return "모델 준비 중";
    case "ready":
      return "모델 준비 완료";
    case "unloading":
      return "메모리 해제 중";
    case "error":
      return "확인 필요";
    default:
      return "모델 대기 중";
  }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function App() {
  const [environment, setEnvironment] = useState<EnvironmentInfo | null>(null);
  const [environmentLoading, setEnvironmentLoading] = useState(true);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>("checking");
  const [modelStatus, setModelStatus] = useState<ModelStatus>("idle");
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadText, setLoadText] = useState("모델은 버튼을 눌렀을 때만 다운로드됩니다.");
  const [loadResult, setLoadResult] = useState<LoadResult | null>(null);
  const [prompt, setPrompt] = useState(INITIAL_PROMPT);
  const [contextJson, setContextJson] = useState(INITIAL_CONTEXT);
  const [contextError, setContextError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generation, setGeneration] = useState<GenerationResult | null>(null);
  const [activeTab, setActiveTab] = useState<OutputTab>("validated");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.allSettled([checkEnvironment(), checkModelCache()]).then(([environmentResult, cacheResult]) => {
      if (!active) return;

      if (environmentResult.status === "fulfilled") {
        setEnvironment(environmentResult.value);
      } else {
        setNotice("브라우저 환경 정보를 확인하지 못했습니다.");
      }
      setEnvironmentLoading(false);

      if (cacheResult.status === "fulfilled") {
        setCacheStatus(cacheResult.value ? "cached" : "not-cached");
      } else {
        setCacheStatus("error");
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const isBusy = modelStatus === "loading" || modelStatus === "unloading" || generating;
  const canGenerate = modelStatus === "ready" && !generating && prompt.trim().length > 0;
  const progressPercent = Math.max(0, Math.min(100, Math.round(loadProgress * 100)));
  const validatedOutcome = getValidatedOutcome(generation?.validated);

  const issueText = useMemo(() => {
    if (!generation) return "생성 후 스키마 및 문맥 검증 결과가 여기에 표시됩니다.";
    if (generation.errors.length === 0) {
      return "검증을 통과했습니다. 결과는 초안이며 AMOUS 프로젝트에는 적용되지 않았습니다.";
    }
    return generation.errors.map((issue, index) => `${index + 1}. ${issue}`).join("\n");
  }, [generation]);

  async function handleLoad() {
    setNotice(null);
    setModelStatus("loading");
    setLoadProgress(0);
    setLoadText("Web Worker를 준비하고 있습니다…");

    try {
      const result = await loadLocalModel((progress) => {
        setLoadProgress(progress.progress);
        setLoadText(progress.text || "모델을 준비하고 있습니다…");
      });
      setLoadResult(result);
      setLoadProgress(1);
      setLoadText("로컬 모델이 준비되었습니다.");
      setModelStatus("ready");
      setCacheStatus("cached");
    } catch (error) {
      setModelStatus("error");
      setLoadText("모델을 준비하지 못했습니다.");
      setNotice(error instanceof Error ? error.message : "모델 로드 중 알 수 없는 오류가 발생했습니다.");
    }
  }

  async function handleUnload() {
    setNotice(null);
    setModelStatus("unloading");
    try {
      await unloadLocalModel();
      setModelStatus("idle");
      setLoadProgress(0);
      setLoadText("GPU 메모리를 해제했습니다. 모델 파일은 브라우저 캐시에 유지됩니다.");
    } catch (error) {
      setModelStatus("error");
      setNotice(error instanceof Error ? error.message : "모델 메모리를 해제하지 못했습니다.");
    }
  }

  async function handleClearCache() {
    const confirmed = window.confirm(
      "다운로드한 로컬 모델 파일을 브라우저 캐시에서 삭제할까요? 다음 로드 때 다시 다운로드해야 합니다.",
    );
    if (!confirmed) return;

    setNotice(null);
    try {
      if (modelStatus === "ready") await unloadLocalModel();
      await clearLocalModelCache();
      setModelStatus("idle");
      setCacheStatus("not-cached");
      setLoadProgress(0);
      setLoadResult(null);
      setLoadText("브라우저 캐시에서 모델을 삭제했습니다.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "모델 캐시를 삭제하지 못했습니다.");
    }
  }

  async function handleGenerate() {
    if (!canGenerate) return;

    try {
      JSON.parse(contextJson);
      setContextError(null);
    } catch {
      setContextError("유효한 JSON을 입력해 주세요.");
      return;
    }

    setNotice(null);
    setGeneration(null);
    setGenerating(true);
    setActiveTab("validated");

    try {
      const result = await generateDraft({ prompt: prompt.trim(), contextJson });
      setGeneration(result);
      if (result.errors.length > 0) setActiveTab("issues");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "초안 생성 중 알 수 없는 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCancel() {
    try {
      await cancelGeneration();
      setNotice("생성을 중단했습니다.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "생성을 중단하지 못했습니다.");
    } finally {
      setGenerating(false);
    }
  }

  function outputContent() {
    if (activeTab === "raw") return generation?.raw || "아직 생성된 원문이 없습니다.";
    if (activeTab === "issues") return issueText;
    if (activeTab === "metrics") {
      if (!generation) return "생성 후 성능 측정값이 여기에 표시됩니다.";
      return [
        `Model load: ${formatNumber(loadResult?.loadMs, 0)} ms`,
        `Generation: ${formatNumber(generation.metrics.generationMs, 0)} ms`,
        `Prompt tokens: ${formatNumber(generation.metrics.promptTokens, 0)}`,
        `Completion tokens: ${formatNumber(generation.metrics.completionTokens, 0)}`,
        `Speed: ${formatNumber(generation.metrics.tokensPerSecond, 2)} tokens/s`,
        "",
        generation.metrics.runtimeStats || loadResult?.runtimeStats || "Runtime stats unavailable",
      ].join("\n");
    }
    return formatJson(generation?.validated);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="brand-copy">
          <div className="eyebrow">AMOUS · EXPERIMENT</div>
          <h1>Local AI Lab</h1>
        </div>
        <div className="topbar-badges">
          <span className="privacy-badge"><Icon name="shield" />100% browser-local</span>
          <span className="draft-badge">DRAFT ONLY</span>
        </div>
      </header>

      <div className="page-intro">
        <div>
          <p className="intro-kicker">Private interaction prototyping</p>
          <h2>말로 설명한 인터랙션을<br />안전한 JSON 초안으로.</h2>
        </div>
        <p className="intro-description">
          프롬프트와 선택 객체 컨텍스트는 서버로 전송되지 않습니다. 생성 결과는 검증용 초안이며
          실제 AMOUS 프로젝트를 변경하지 않습니다.
        </p>
      </div>

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="알림 닫기">×</button>
        </div>
      )}

      <div className="lab-grid">
        <aside className="side-column">
          <section className="panel model-panel">
            <div className="panel-heading">
              <span className="heading-icon"><Icon name="cpu" /></span>
              <div>
                <p className="section-index">01 · RUNTIME</p>
                <h3>모델과 환경</h3>
              </div>
              <span className={`status-dot ${modelStatus}`} aria-hidden="true" />
            </div>

            <div className="model-card">
              <div className="model-name-row">
                <div className="model-avatar"><Icon name="spark" /></div>
                <div>
                  <strong>Qwen3 4B</strong>
                  <span>{MODEL_ID}</span>
                </div>
              </div>
              <div className="model-meta">
                <span>Q4 WebGPU</span>
                <span>Apache 2.0</span>
              </div>
            </div>

            <div className="runtime-status">
              <div className="status-row">
                <span>상태</span>
                <strong>{statusLabel(modelStatus)}</strong>
              </div>
              <div className="status-row">
                <span>모델 가중치 캐시</span>
                <strong className={cacheStatus === "cached" ? "positive" : undefined}>
                  {cacheStatus === "checking" && "확인 중"}
                  {cacheStatus === "cached" && "가중치 저장됨"}
                  {cacheStatus === "not-cached" && "없음"}
                  {cacheStatus === "error" && "확인 실패"}
                </strong>
              </div>
              <div className="status-row">
                <span>WebGPU</span>
                <strong className={environment?.webGpu ? "positive" : "negative"}>
                  {environmentLoading ? "확인 중" : environment?.webGpu ? "사용 가능" : "사용 불가"}
                </strong>
              </div>
            </div>

            {(modelStatus === "loading" || loadProgress > 0) && (
              <div className="load-progress" aria-live="polite">
                <div className="progress-label"><span>{loadText}</span><strong>{progressPercent}%</strong></div>
                <div className="progress-track"><span style={{ width: `${progressPercent}%` }} /></div>
              </div>
            )}

            <div className="button-stack">
              {modelStatus !== "ready" ? (
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleLoad}
                  disabled={isBusy || environment?.webGpu === false}
                >
                  <Icon name="spark" />
                  {modelStatus === "loading" ? "모델 준비 중…" : cacheStatus === "cached" ? "캐시에서 모델 로드" : "모델 다운로드 및 로드"}
                </button>
              ) : (
                <button type="button" className="secondary-button" onClick={handleUnload} disabled={isBusy}>
                  GPU 메모리 해제
                </button>
              )}
              <button
                type="button"
                className="text-button danger"
                onClick={handleClearCache}
                disabled={isBusy || cacheStatus !== "cached"}
              >
                다운로드 캐시 삭제
              </button>
            </div>

            <p className="download-note">
              최초 실행 시 약 2.3GB를 내려받고 약 3.4GB의 GPU 메모리를 사용합니다. 다운로드는 Load 버튼을
              눌렀을 때만 시작됩니다.
            </p>
          </section>

          <section className="panel diagnostics-panel">
            <div className="subheading"><span>환경 진단</span><small>LOCAL DEVICE</small></div>
            <dl className="diagnostics-list">
              <div><dt>Browser</dt><dd>{environment?.browser || "—"}</dd></div>
              <div><dt>GPU adapter</dt><dd title={environment?.adapter}>{environment?.adapter || "—"}</dd></div>
              <div><dt>Max buffer</dt><dd>{environment?.maxStorageBufferMB ? `${formatNumber(environment.maxStorageBufferMB, 0)} MB` : "—"}</dd></div>
              <div><dt>Storage</dt><dd>{environment?.usageGB != null && environment?.quotaGB != null ? `${formatNumber(environment.usageGB)} / ${formatNumber(environment.quotaGB)} GB` : "—"}</dd></div>
            </dl>
          </section>
        </aside>

        <div className="workspace-column">
          <section className="panel composer-panel">
            <div className="panel-heading compact">
              <span className="heading-icon"><Icon name="prompt" /></span>
              <div>
                <p className="section-index">02 · INPUT</p>
                <h3>인터랙션 요청</h3>
              </div>
              <span className="mode-label">KOREAN / ENGLISH</span>
            </div>

            <div className="examples" aria-label="예시 프롬프트">
              {EXAMPLES.map((example) => (
                <button type="button" key={example.label} onClick={() => setPrompt(example.prompt)}>
                  {example.label}
                </button>
              ))}
            </div>

            <label className="field-label" htmlFor="prompt-input">
              Prompt <span>자연어로 원하는 동작을 설명하세요.</span>
            </label>
            <div className="textarea-shell prompt-shell">
              <textarea
                id="prompt-input"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    void handleGenerate();
                  }
                }}
                placeholder="예: 도형을 클릭하면 오른쪽으로 이동하고 마지막 위치를 유지해줘."
                rows={6}
              />
              <span className="character-count">{prompt.length} · ⌘/Ctrl + Enter</span>
            </div>

            <details className="context-details" open>
              <summary>
                <span>Selected object context</span>
                <small>테스트용 JSON · 프로젝트와 연결되지 않음</small>
              </summary>
              <div className={`textarea-shell code-shell ${contextError ? "has-error" : ""}`}>
                <textarea
                  aria-label="선택 객체 컨텍스트 JSON"
                  value={contextJson}
                  onChange={(event) => {
                    setContextJson(event.target.value);
                    setContextError(null);
                  }}
                  spellCheck={false}
                  rows={10}
                />
              </div>
              {contextError && <p className="field-error">{contextError}</p>}
            </details>

            <div className="composer-footer">
              <div className="safety-copy">
                <Icon name="shield" />
                <span><strong>Draft-only guard</strong>가 실제 편집 명령 실행을 차단합니다.</span>
              </div>
              {generating ? (
                <button type="button" className="cancel-button" onClick={handleCancel}>생성 중단</button>
              ) : (
                <button type="button" className="generate-button" onClick={handleGenerate} disabled={!canGenerate}>
                  <Icon name="spark" />초안 생성
                </button>
              )}
            </div>
          </section>

          <section className="panel output-panel">
            <div className="panel-heading compact output-heading">
              <span className="heading-icon"><Icon name="result" /></span>
              <div>
                <p className="section-index">03 · OUTPUT</p>
                <h3>검증 결과</h3>
              </div>
              {generation && (
                <span
                  className={`validation-pill ${
                    generation.errors.length ? "invalid" : validatedOutcome
                  }`}
                >
                  {generation.errors.length
                    ? `${generation.errors.length} issues`
                    : validatedOutcome === "unsupported"
                      ? "Unsupported request"
                      : validatedOutcome === "clarification"
                        ? "Needs clarification"
                        : "Draft valid"}
                </span>
              )}
            </div>

            <div className="output-tabs" role="tablist" aria-label="결과 보기">
              {([
                ["validated", "Validated JSON"],
                ["raw", "Raw output"],
                ["issues", `Issues${generation?.errors.length ? ` · ${generation.errors.length}` : ""}`],
                ["metrics", "Metrics"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  className={activeTab === id ? "active" : ""}
                  onClick={() => setActiveTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {generating ? (
              <div className="generating-state">
                <div className="orb" aria-hidden="true"><span /><span /><span /></div>
                <strong>로컬 모델이 초안을 만들고 있습니다</strong>
                <p>브라우저 안에서 생성하고 AMOUS 스키마로 검증합니다.</p>
              </div>
            ) : (
              <pre className={`output-code ${activeTab === "issues" && generation?.errors.length ? "error-output" : ""}`}>
                <code>{outputContent()}</code>
              </pre>
            )}

            <div className="metrics-strip">
              <Metric label="LOAD" value={`${formatNumber(loadResult?.loadMs, 0)} ms`} />
              <Metric label="GENERATE" value={`${formatNumber(generation?.metrics.generationMs, 0)} ms`} />
              <Metric label="TOKENS" value={generation ? `${generation.metrics.promptTokens ?? "—"} / ${generation.metrics.completionTokens ?? "—"}` : "— / —"} />
              <Metric label="SPEED" value={`${formatNumber(generation?.metrics.tokensPerSecond, 2)} t/s`} />
            </div>
          </section>
        </div>
      </div>

      <footer className="page-footer">
        <span>AMOUS Local AI Lab · isolated experiment</span>
        <span>모델 파일과 프롬프트는 이 브라우저에만 머뭅니다.</span>
      </footer>
    </main>
  );
}
