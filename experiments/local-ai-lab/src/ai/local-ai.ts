import {
  CreateWebWorkerMLCEngine,
  deleteModelAllInfoInCache,
  hasModelInCache,
  prebuiltAppConfig,
  type WebWorkerMLCEngine,
} from "@mlc-ai/web-llm";
import {
  AI_COMMAND_JSON_SCHEMA,
  LabContextSchema,
  createDeterministicUnsupportedDraft,
  validateModelOutput,
} from "../lib/command-schema";
import { SYSTEM_PROMPT } from "./system-prompt";

export const MODEL_ID = "Qwen3-4B-q4f16_1-MLC";
export const MODEL_DOWNLOAD_NOTE =
  "첫 로딩에는 약 2.3 GB 다운로드와 약 3.4 GB GPU 메모리가 필요합니다.";

export type EnvironmentInfo = {
  webGpu: boolean;
  browser: string;
  adapter: string;
  maxStorageBufferMB: number | null;
  quotaGB: number | null;
  usageGB: number | null;
};

export type ModelProgress = {
  progress: number;
  text: string;
};

export type LoadResult = {
  loadMs: number;
  gpuVendor?: string;
  runtimeStats?: string;
};

export type GenerationMetrics = {
  loadMs?: number;
  generationMs: number;
  promptTokens?: number;
  completionTokens?: number;
  tokensPerSecond?: number;
  runtimeStats?: string;
};

export type GenerationResult = {
  raw: string;
  validated: unknown | null;
  errors: string[];
  metrics: GenerationMetrics;
};

let engine: WebWorkerMLCEngine | null = null;
let modelWorker: Worker | null = null;
let activeLoad: Promise<LoadResult> | null = null;
let lastLoadMs: number | undefined;

function detectBrowser(): string {
  const agent = navigator.userAgent;
  const edge = agent.match(/Edg\/([\d.]+)/);
  if (edge) return `Microsoft Edge ${edge[1]}`;
  const chrome = agent.match(/Chrome\/([\d.]+)/);
  if (chrome) return `Google Chrome ${chrome[1]}`;
  const firefox = agent.match(/Firefox\/([\d.]+)/);
  if (firefox) return `Firefox ${firefox[1]}`;
  const safari = agent.match(/Version\/([\d.]+).*Safari/);
  if (safari) return `Safari ${safari[1]}`;
  const navigatorWithBrands = navigator as Navigator & {
    userAgentData?: { brands?: Array<{ brand: string }> };
  };
  return (
    navigatorWithBrands.userAgentData?.brands?.map((brand) => brand.brand).join(", ") ||
    "Unknown"
  );
}

function bytesToGB(value?: number): number | null {
  return typeof value === "number" ? value / 1024 ** 3 : null;
}

export async function checkEnvironment(): Promise<EnvironmentInfo> {
  const storage = await navigator.storage?.estimate().catch(() => undefined);
  if (!globalThis.isSecureContext) {
    return {
      webGpu: false,
      browser: detectBrowser(),
      adapter: "HTTPS 또는 localhost가 필요합니다.",
      maxStorageBufferMB: null,
      quotaGB: bytesToGB(storage?.quota),
      usageGB: bytesToGB(storage?.usage),
    };
  }
  if (!navigator.gpu) {
    return {
      webGpu: false,
      browser: detectBrowser(),
      adapter: "WebGPU unavailable",
      maxStorageBufferMB: null,
      quotaGB: bytesToGB(storage?.quota),
      usageGB: bytesToGB(storage?.usage),
    };
  }

  const adapter = await navigator.gpu
    .requestAdapter({ powerPreference: "high-performance" })
    .catch(() => null);
  const adapterInfo = adapter?.info;
  const adapterLabel =
    adapterInfo?.description ||
    adapterInfo?.device ||
    adapterInfo?.vendor ||
    (adapter ? "WebGPU adapter available" : "No compatible adapter");

  return {
    webGpu: Boolean(adapter),
    browser: detectBrowser(),
    adapter: adapterLabel,
    maxStorageBufferMB: adapter
      ? Number(adapter.limits.maxStorageBufferBindingSize) / 1024 ** 2
      : null,
    quotaGB: bytesToGB(storage?.quota),
    usageGB: bytesToGB(storage?.usage),
  };
}

export async function checkModelCache(): Promise<boolean> {
  try {
    return await hasModelInCache(MODEL_ID, prebuiltAppConfig);
  } catch {
    return false;
  }
}

export async function loadLocalModel(
  onProgress: (progress: ModelProgress) => void,
): Promise<LoadResult> {
  if (engine) {
    return {
      loadMs: lastLoadMs ?? 0,
      gpuVendor: await engine.getGPUVendor().catch(() => undefined),
      runtimeStats: await engine.runtimeStatsText().catch(() => undefined),
    };
  }
  if (activeLoad) return activeLoad;

  activeLoad = (async () => {
    const startedAt = performance.now();
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    modelWorker = worker;

    try {
      const loadedEngine = await CreateWebWorkerMLCEngine(worker, MODEL_ID, {
        appConfig: prebuiltAppConfig,
        initProgressCallback: (report) => {
          onProgress({
            progress: Math.max(0, Math.min(1, report.progress)),
            text: report.text,
          });
        },
      });
      engine = loadedEngine;
      lastLoadMs = performance.now() - startedAt;
      return {
        loadMs: lastLoadMs,
        gpuVendor: await loadedEngine.getGPUVendor().catch(() => undefined),
        runtimeStats: await loadedEngine.runtimeStatsText().catch(() => undefined),
      };
    } catch (error) {
      worker.terminate();
      modelWorker = null;
      throw error;
    } finally {
      activeLoad = null;
    }
  })();

  return activeLoad;
}

export async function unloadLocalModel(): Promise<void> {
  const loadedEngine = engine;
  engine = null;
  if (loadedEngine) await loadedEngine.unload().catch(() => undefined);
  modelWorker?.terminate();
  modelWorker = null;
  activeLoad = null;
}

export async function clearLocalModelCache(): Promise<void> {
  await unloadLocalModel();
  await deleteModelAllInfoInCache(MODEL_ID, prebuiltAppConfig);
}

export async function cancelGeneration(): Promise<void> {
  engine?.interruptGenerate();
}

export async function generateDraft(input: {
  prompt: string;
  contextJson: string;
}): Promise<GenerationResult> {
  if (!engine) throw new Error("먼저 Load model을 눌러 모델을 준비해 주세요.");
  if (!input.prompt.trim()) throw new Error("자연어 요청을 입력해 주세요.");

  let contextData: unknown;
  try {
    contextData = JSON.parse(input.contextJson);
  } catch {
    throw new Error("AMOUS context가 올바른 JSON이 아닙니다.");
  }
  const contextResult = LabContextSchema.safeParse(contextData);
  if (!contextResult.success) {
    const message = contextResult.error.issues
      .map((issue) => `${issue.path.join(".") || "context"}: ${issue.message}`)
      .join("\n");
    throw new Error(`AMOUS context 검증 실패:\n${message}`);
  }

  const deterministicUnsupported = createDeterministicUnsupportedDraft(input.prompt);
  if (deterministicUnsupported) {
    const raw = JSON.stringify(deterministicUnsupported, null, 2);
    const validation = validateModelOutput(raw, contextResult.data, input.prompt);
    return {
      raw,
      validated: validation.value,
      errors: validation.errors,
      metrics: {
        loadMs: lastLoadMs,
        generationMs: 0,
        promptTokens: 0,
        completionTokens: 0,
        tokensPerSecond: 0,
        runtimeStats:
          "Deterministic capability guard: the request was rejected before model inference.",
      },
    };
  }

  await engine.resetChat(true);
  const startedAt = performance.now();
  const response = await engine.chat.completions.create({
    model: MODEL_ID,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          "AMOUS context:",
          JSON.stringify(contextResult.data, null, 2),
          "",
          "User request:",
          input.prompt.trim(),
        ].join("\n"),
      },
    ],
    temperature: 0.1,
    top_p: 0.9,
    max_tokens: 1400,
    response_format: {
      type: "json_object",
      schema: JSON.stringify(AI_COMMAND_JSON_SCHEMA),
    },
    extra_body: {
      enable_thinking: false,
      enable_latency_breakdown: true,
    },
  });
  const generationMs = performance.now() - startedAt;
  if (response.choices[0]?.finish_reason === "length") {
    throw new Error("AI 응답이 토큰 제한에서 잘렸습니다. 요청을 더 짧게 나눠 주세요.");
  }
  const raw = response.choices[0]?.message.content ?? "";
  if (!raw.trim()) throw new Error("AI가 빈 응답을 반환했습니다.");
  const validation = validateModelOutput(raw, contextResult.data, input.prompt);
  const runtimeStats = await engine.runtimeStatsText().catch(() => undefined);

  return {
    raw,
    validated: validation.value,
    errors: validation.errors,
    metrics: {
      loadMs: lastLoadMs,
      generationMs,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
      tokensPerSecond: response.usage?.extra.decode_tokens_per_s,
      runtimeStats,
    },
  };
}
