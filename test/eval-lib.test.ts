import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  appCitedText,
  appEvidenceFocus,
  buildBaselineInput,
  keyEvidenceHits,
  nextStepHits,
  parseCase,
} from "../scripts/eval/lib.js";
import type { AIInvestigation } from "../shared/types/analysis.js";
import type { InvestigationReport } from "../shared/types/report.js";

describe("eval cases", () => {
  it.each(readdirSync("eval/cases"))("%s/case.json is valid", (id) => {
    const raw: unknown = JSON.parse(
      readFileSync(join("eval/cases", id, "case.json"), "utf8"),
    );
    expect(() => parseCase(id, raw)).not.toThrow();
  });

  it("rejects a case without key evidence", () => {
    expect(() =>
      parseCase("broken", {
        title: "t",
        service: "s",
        severity: "high",
        description: "d",
        logs: ["a.log"],
        groundTruth: { cause: "c", keyEvidence: [], goodNextSteps: [] },
      }),
    ).toThrow(/groundTruth.keyEvidence/);
  });
});

describe("buildBaselineInput", () => {
  const evalCase = { title: "Login fails", description: "HTTP 500s" };

  it("includes every file when they fit", () => {
    const input = buildBaselineInput(
      evalCase,
      [
        { name: "a.log", content: "line 1\nline 2\n" },
        { name: "b.txt", content: "diag" },
      ],
      1000,
    );

    expect(input.truncated).toBe(false);
    expect(input.keptFraction).toBe(1);
    expect(input.text).toContain("==> a.log <==\nline 1\nline 2\n");
    expect(input.text).toContain("==> b.txt <==\ndiag");
  });

  it("keeps whole lines from the end when the logs don't fit", () => {
    const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`);
    const input = buildBaselineInput(
      evalCase,
      [{ name: "big.log", content: lines.join("\n") }],
      200,
    );

    expect(input.truncated).toBe(true);
    expect(input.keptFraction).toBeGreaterThan(0);
    expect(input.keptFraction).toBeLessThan(1);
    expect(input.text).toContain("earlier log lines omitted");
    expect(input.text.trimEnd().endsWith("line 99")).toBe(true);
    // No partial first line after the cut.
    const afterMarker = input.text.split(
      "omitted to fit the model's context ...]\n",
    )[1];
    expect(afterMarker).toMatch(/^line \d+\n/);
  });
});

describe("keyEvidenceHits", () => {
  it("matches substrings case-insensitively across all cited text", () => {
    expect(
      keyEvidenceHits(
        ["DiskErrorException", "valid local directory", "NoRouteToHost"],
        [
          "exited: org.apache.hadoop.util.DiskChecker$DiskErrorException",
          "Could not find any VALID LOCAL DIRECTORY",
        ],
      ),
    ).toEqual({
      found: ["DiskErrorException", "valid local directory"],
      missing: ["NoRouteToHost"],
    });
  });
});

describe("appCitedText", () => {
  it("resolves F, C and D evidence IDs to the text the model was shown", () => {
    const report: InvestigationReport = {
      incidentId: "i",
      title: "t",
      service: "s",
      severity: "high",
      generatedAt: "2026-01-01T00:00:00Z",
      summary: "",
      findings: [
        {
          level: "error",
          service: "s",
          pattern: "Session lookup failed: <*>",
          occurrences: 2,
          firstSeen: "",
          lastSeen: "",
          evidence: [
            { timestamp: "", message: "Session lookup failed: ETIMEDOUT" },
          ],
        },
      ],
    };
    const investigation: AIInvestigation = {
      summary: "",
      hypotheses: [
        {
          cause: "Redis pool exhausted",
          evidenceIds: ["F1", "C1", "D1", "F9"],
          nextStep: "",
        },
      ],
      contextEvidence: [
        {
          id: "C1",
          timestamp: "",
          service: "s",
          level: "warn",
          message: "pool at max",
        },
      ],
      missingEvidence: [],
      diagnosticEvidence: [
        { id: "D1", fileName: "d.txt", excerpt: "100/100 connections" },
      ],
    };

    expect(appCitedText(report, investigation)).toEqual([
      "Redis pool exhausted",
      "Session lookup failed: <*>",
      "Session lookup failed: ETIMEDOUT",
      "pool at max",
      "100/100 connections",
    ]);
  });
});

describe("appEvidenceFocus", () => {
  const finding = (pattern: string) => ({
    level: "error" as const,
    service: "s",
    pattern,
    occurrences: 1,
    firstSeen: "",
    lastSeen: "",
    evidence: [],
  });
  const report: InvestigationReport = {
    incidentId: "i",
    title: "t",
    service: "s",
    severity: "high",
    generatedAt: "2026-01-01T00:00:00Z",
    summary: "",
    findings: [
      finding("DiskErrorException: no valid local directory"),
      finding("Could not delete temp file"),
      finding("Spilling map output"),
    ],
  };
  const investigation = (
    hypotheses: AIInvestigation["hypotheses"],
  ): AIInvestigation => ({
    summary: "",
    hypotheses,
    contextEvidence: [],
    missingEvidence: [],
    diagnosticEvidence: [],
  });

  it("counts IDs, checks hypothesis 1, and measures the key share", () => {
    const focus = appEvidenceFocus(
      report,
      investigation([
        // The cause mentions the key evidence, but only evidence counts.
        {
          cause: "DiskErrorException",
          evidenceIds: ["F1", "F3"],
          nextStep: "",
        },
        { cause: "HDFS", evidenceIds: ["F2", "F3"], nextStep: "" },
      ]),
      ["DiskErrorException", "valid local directory"],
    );
    expect(focus).toEqual({
      idsPerHypothesis: [2, 2],
      topKeyEvidence: {
        found: ["DiskErrorException", "valid local directory"],
        missing: [],
      },
      keyShare: 1 / 3,
    });
  });

  it("reports key evidence missing from hypothesis 1 even if cited later", () => {
    const focus = appEvidenceFocus(
      report,
      investigation([
        { cause: "HDFS", evidenceIds: ["F2"], nextStep: "" },
        { cause: "Disk", evidenceIds: ["F1"], nextStep: "" },
      ]),
      ["DiskErrorException"],
    );
    expect(focus.topKeyEvidence.missing).toEqual(["DiskErrorException"]);
    expect(focus.keyShare).toBe(0.5);
  });
});

describe("nextStepHits", () => {
  it("matches patterns case-insensitively against any next step", () => {
    expect(
      nextStepHits(
        ["vulkan", String.raw`\bping\b`],
        ["Retry with Vulkan", "Check memory usage"],
      ),
    ).toEqual({ matched: ["vulkan"] });
  });

  it("matches nothing when no step fits", () => {
    expect(nextStepHits(["vulkan"], ["Check logs"])).toEqual({ matched: [] });
  });
});
