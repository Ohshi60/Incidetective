import { afterEach, describe, expect, it, vi } from "vitest";
import { investigateWithAI } from "../src/ai/investigate.js";
import type { InvestigationReport } from "../shared/types/report.js";

const report: InvestigationReport = {
  incidentId: "i",
  title: "Users can't log in",
  service: "auth",
  severity: "high",
  generatedAt: "2026-01-01T10:00:00.000Z",
  summary: "",
  findings: [
    {
      service: "auth",
      pattern: "Session lookup failed: <*>",
      occurrences: 3,
      firstSeen: "2026-01-01T10:00:00.000Z",
      lastSeen: "2026-01-01T10:01:00.000Z",
      evidence: [
        {
          timestamp: "2026-01-01T10:00:00.000Z",
          message: "Session lookup failed: ETIMEDOUT",
        },
      ],
    },
  ],
};

function mockOllama(answer: unknown, extra: Record<string, unknown> = {}) {
  const fetchMock = vi.fn(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          message: { content: JSON.stringify(answer) },
          done_reason: "stop",
          ...extra,
        }),
      ),
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("investigateWithAI", () => {
  it("returns the model's per-hypothesis evidence requests", async () => {
    mockOllama({
      summary: "Redis is overloaded.",
      hypotheses: [
        {
          cause: "Redis connection pool exhausted",
          evidenceIds: ["F1", "F7"],
          nextStep: "Check pool metrics",
          missingEvidence: ["Redis INFO clients output"],
        },
        {
          cause: "Network issue",
          evidenceIds: [],
          nextStep: "Ping Redis",
          missingEvidence: ["Redis INFO clients output", "Packet loss stats"],
        },
      ],
    });

    const result = await investigateWithAI(report, []);

    expect(result.missingEvidence).toEqual([
      "Redis INFO clients output",
      "Packet loss stats",
    ]);
    // Evidence IDs that weren't sent are dropped.
    expect(result.hypotheses[0]?.evidenceIds).toEqual(["F1"]);
  });

  it("falls back to the next steps when the model requests no evidence", async () => {
    mockOllama({
      summary: "s",
      hypotheses: [
        {
          cause: "c",
          evidenceIds: ["F1"],
          nextStep: "Check pool metrics",
          missingEvidence: [],
        },
      ],
    });

    const result = await investigateWithAI(report, []);

    expect(result.missingEvidence).toEqual([
      "Provide the results of this diagnostic check: Check pool metrics",
    ]);
  });

  it("explains when the answer was cut off by the output limit", async () => {
    mockOllama({ summary: "unfinished" }, { done_reason: "length" });

    await expect(investigateWithAI(report, [])).rejects.toThrow(
      /answer was cut off/,
    );
  });

  it("sends the configured context size to Ollama", async () => {
    vi.stubEnv("OLLAMA_NUM_CTX", "8192");
    const fetchMock = mockOllama({ summary: "s", hypotheses: [] });

    await investigateWithAI(report, []);

    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1]
        .body,
    ) as { options: { num_ctx: number; num_thread?: number } };
    expect(body.options.num_ctx).toBe(8192);
    expect(body.options.num_thread).toBeUndefined();
    vi.unstubAllEnvs();
  });
});
