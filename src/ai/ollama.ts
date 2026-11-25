// Ollama client used by the AI investigation and the eval baseline.
// All Ollama-specific request details live here, so another provider can be
// added later behind the same function shape.

export interface OllamaSettings {
  baseUrl: string;
  model: string;
  /** Context window in tokens: prompt and answer together. */
  numCtx: number;
  /** Maximum answer length in tokens. */
  numPredict: number;
  timeoutMs: number;
  /** CPU threads. Unset lets Ollama decide, which is right on a GPU. */
  numThread?: number;
}

function positiveInt(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got "${raw}"`);
  }
  return value;
}

export function ollamaSettings(
  env: NodeJS.ProcessEnv = process.env,
): OllamaSettings {
  const numThread = positiveInt(env, "OLLAMA_NUM_THREAD", 0);
  return {
    baseUrl: (env.OLLAMA_BASE_URL ?? "http://localhost:11434").replace(
      /\/$/,
      "",
    ),
    model: env.OLLAMA_MODEL ?? "qwen3:4b-instruct",
    numCtx: positiveInt(env, "OLLAMA_NUM_CTX", 4096),
    numPredict: positiveInt(env, "OLLAMA_NUM_PREDICT", 1200),
    timeoutMs: positiveInt(env, "OLLAMA_TIMEOUT_MS", 300_000),
    ...(numThread > 0 ? { numThread } : {}),
  };
}

export interface JsonChatRequest {
  system: string;
  user: string;
  /** JSON schema the response must follow (Ollama structured outputs). */
  schema: object;
  /** Overrides OLLAMA_MODEL, e.g. when the eval compares models. */
  model?: string;
}

export interface JsonChatResult {
  /** Parsed JSON response; validate before use. */
  json: unknown;
  model: string;
  totalSeconds: number;
  promptTokens: number | undefined;
  outputTokens: number | undefined;
}

export async function ollamaJsonChat(
  request: JsonChatRequest,
  settings: OllamaSettings = ollamaSettings(),
): Promise<JsonChatResult> {
  const model = request.model ?? settings.model;

  const response = await fetch(`${settings.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(settings.timeoutMs),
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      format: request.schema,
      options: {
        ...(settings.numThread ? { num_thread: settings.numThread } : {}),
        num_ctx: settings.numCtx,
        num_predict: settings.numPredict,
        temperature: 0.2,
      },
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
    }),
  });

  if (!response.ok) {
    // Ollama explains the problem in the body, e.g. a prompt that exceeds
    // the context window.
    const body = await response.text().catch(() => "");
    let detail = body.trim();
    try {
      detail = (JSON.parse(body) as { error?: string }).error ?? detail;
    } catch {
      // Not JSON; use the raw text.
    }
    throw new Error(
      `Ollama error: HTTP ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`,
    );
  }

  const data = (await response.json()) as {
    message?: { content?: string };
    done_reason?: string;
    total_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
  };

  console.log("Ollama performance:", {
    model,
    totalSeconds: (data.total_duration ?? 0) / 1e9,
    promptTokens: data.prompt_eval_count,
    promptSeconds: (data.prompt_eval_duration ?? 0) / 1e9,
    outputTokens: data.eval_count,
    outputSeconds: (data.eval_duration ?? 0) / 1e9,
    numCtx: settings.numCtx,
  });

  if (data.done_reason === "length") {
    throw new Error(
      `The model's answer was cut off after ${data.eval_count ?? settings.numPredict} tokens ` +
        `(OLLAMA_NUM_PREDICT=${settings.numPredict}, OLLAMA_NUM_CTX=${settings.numCtx}).`,
    );
  }

  if (!data.message?.content) {
    throw new Error("Empty Ollama response");
  }

  return {
    json: JSON.parse(data.message.content),
    model,
    totalSeconds: (data.total_duration ?? 0) / 1e9,
    promptTokens: data.prompt_eval_count,
    outputTokens: data.eval_count,
  };
}
