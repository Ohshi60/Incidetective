import { describe, expect, it } from "vitest";
import {
  buildInvestigationInput,
  evidenceBudgetChars,
} from "../src/ai/investigation-input.js";
import { ollamaSettings } from "../src/ai/ollama.js";
import type { LogEntry } from "../shared/types/evidence.js";
import type {
  InvestigationReport,
  ReportFinding,
} from "../shared/types/report.js";

const base = Date.parse("2026-01-01T10:00:00Z");
const at = (seconds: number) => new Date(base + seconds * 1000).toISOString();

function finding(i: number, message: string): ReportFinding {
  return {
    level: "error",
    service: "api",
    pattern: `pattern ${i}`,
    occurrences: 10 - i,
    firstSeen: at(600),
    lastSeen: at(700),
    evidence: [
      { timestamp: at(600), message },
      { timestamp: at(650), message },
      { timestamp: at(700), message },
    ],
  };
}

function report(findings: ReportFinding[]): InvestigationReport {
  return {
    incidentId: "i",
    title: "Checkout failing",
    service: "api",
    severity: "high",
    generatedAt: at(0),
    summary: "",
    findings,
  };
}

function warning(seconds: number, message: string): LogEntry {
  return {
    incidentId: "i",
    timestamp: at(seconds),
    service: "api",
    level: "warn",
    message,
  };
}

const small = { numCtx: 4096, numPredict: 1200 };

describe("buildInvestigationInput", () => {
  it("sends everything when it fits, with full messages kept for the UI", () => {
    const longWarning = `pool at max ${"x".repeat(700)}`;
    const input = buildInvestigationInput(
      report([finding(0, "timeout"), finding(1, "refused")]),
      [
        warning(590, longWarning), // 10 s before the first error
        warning(100, "too early"), // more than 5 minutes before any error
        warning(800, "after the errors"),
      ],
      [{ fileName: "redis.txt", content: "100/100 connections" }],
      small,
    );

    expect([...input.validIds].sort()).toEqual(["C1", "D1", "F1", "F2"]);
    expect(input.omitted).toEqual({
      findings: 0,
      contextLogs: 0,
      diagnostics: 0,
    });
    // The UI gets the original message; the model gets a clipped one.
    expect(input.contextEvidence[0]?.message).toBe(longWarning);
    expect(input.user).toContain("…[truncated]");
    expect(input.user).not.toContain(longWarning);
    // Two examples per finding.
    const sent = JSON.parse(input.user) as {
      findings: { evidence: unknown[] }[];
    };
    expect(sent.findings[0]?.evidence).toHaveLength(2);
  });

  it("keeps the prompt inside the context window when the evidence is huge", () => {
    const stackTrace = `java.io.IOException: boom\n${"\tat org.example.Foo.bar(Foo.java:1)\n".repeat(200)}`;
    const findings = Array.from({ length: 20 }, (_, i) =>
      finding(i, stackTrace),
    );
    const warnings = Array.from({ length: 100 }, (_, i) =>
      warning(500 + i, `warning ${i} ${"y".repeat(400)}`),
    );

    const input = buildInvestigationInput(
      report(findings),
      warnings,
      [],
      small,
    );

    expect(input.user.length).toBeLessThanOrEqual(evidenceBudgetChars(small));
    expect(input.estimatedPromptTokens).toBeLessThanOrEqual(
      small.numCtx - small.numPredict,
    );
    expect(input.omitted.findings).toBeGreaterThan(0);
    expect(input.omitted.contextLogs).toBeGreaterThan(0);

    // Findings stay a prefix, so F-numbers match report.findings.
    const ids = [...input.validIds].filter((id) => id.startsWith("F"));
    expect(ids).toEqual(ids.map((_, i) => `F${i + 1}`));
  });

  it("uses a bigger context window for more evidence", () => {
    const findings = Array.from({ length: 15 }, (_, i) =>
      finding(i, `error ${i} ${"z".repeat(300)}`),
    );
    const warnings = Array.from({ length: 40 }, (_, i) =>
      warning(500 + i, `warning ${i} ${"y".repeat(200)}`),
    );

    const smallInput = buildInvestigationInput(
      report(findings),
      warnings,
      [],
      small,
    );
    const largeInput = buildInvestigationInput(report(findings), warnings, [], {
      numCtx: 32768,
      numPredict: 1200,
    });

    expect(largeInput.validIds.size).toBeGreaterThan(smallInput.validIds.size);
    expect(largeInput.omitted).toEqual({
      findings: 0,
      contextLogs: 0,
      diagnostics: 0,
    });
  });

  it("numbers context warnings in time order, newest kept first", () => {
    const warnings = Array.from({ length: 60 }, (_, i) =>
      warning(400 + i, `warning ${i}`),
    );
    const input = buildInvestigationInput(
      report([finding(0, "timeout")]),
      warnings,
      [],
      { numCtx: 32768, numPredict: 1200 },
    );

    // At most 40 context warnings: the newest ones, numbered oldest first.
    expect(input.contextEvidence).toHaveLength(40);
    expect(input.contextEvidence[0]).toMatchObject({
      id: "C1",
      message: "warning 20",
    });
    expect(input.contextEvidence.at(-1)).toMatchObject({
      id: "C40",
      message: "warning 59",
    });
  });

  it("only uses error findings to pick context warnings", () => {
    const warnFinding: ReportFinding = {
      ...finding(0, "slow read"),
      level: "warn",
    };
    const input = buildInvestigationInput(
      report([warnFinding]),
      [warning(590, "10 s before the warning finding")],
      [],
      small,
    );

    expect(input.contextEvidence).toEqual([]);
    expect(JSON.parse(input.user)).toMatchObject({
      findings: [{ id: "F1", level: "warn" }],
    });
  });

  it("always sends the first finding, even if nothing fits", () => {
    const input = buildInvestigationInput(
      report([finding(0, "timeout")]),
      [],
      [],
      { numCtx: 1500, numPredict: 1200 },
    );

    expect([...input.validIds]).toEqual(["F1"]);
  });
});

describe("ollamaSettings", () => {
  it("defaults to the previous hardcoded values", () => {
    expect(ollamaSettings({})).toEqual({
      baseUrl: "http://localhost:11434",
      model: "qwen3:4b-instruct",
      numCtx: 4096,
      numPredict: 1200,
      timeoutMs: 300000,
    });
  });

  it("reads overrides from the environment", () => {
    expect(
      ollamaSettings({
        OLLAMA_BASE_URL: "http://desktop:11434/",
        OLLAMA_MODEL: "qwen3:14b",
        OLLAMA_NUM_CTX: "16384",
        OLLAMA_NUM_PREDICT: "2000",
        OLLAMA_TIMEOUT_MS: "60000",
        OLLAMA_NUM_THREAD: "4",
      }),
    ).toEqual({
      baseUrl: "http://desktop:11434",
      model: "qwen3:14b",
      numCtx: 16384,
      numPredict: 2000,
      timeoutMs: 60000,
      numThread: 4,
    });
  });

  it("rejects values that aren't positive integers", () => {
    expect(() => ollamaSettings({ OLLAMA_NUM_CTX: "8k" })).toThrow(
      /OLLAMA_NUM_CTX must be a positive integer/,
    );
  });
});
