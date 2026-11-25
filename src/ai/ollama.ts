// Ollama client used by the AI investigation and the eval baseline.
// All Ollama-specific request details live here, so another provider can be
// added later behind the same function shape.

export const OLLAMA_NUM_CTX = 4096;

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
): Promise<JsonChatResult> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const model =
    request.model ?? process.env.OLLAMA_MODEL ?? "qwen3:4b-instruct";

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(300_000),
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      format: request.schema,
      options: {
        num_thread: 4,
        num_ctx: OLLAMA_NUM_CTX,
        num_predict: 1200,
        temperature: 0.2,
      },
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    message?: { content?: string };
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
  });

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
