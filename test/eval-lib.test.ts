import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  appCitedText,
  buildBaselineInput,
  keyEvidenceHits,
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
    const afterMarker = input.text.split("omitted to fit the model's context ...]\n")[1];
    expect(afterMarker).toMatch(/^line \d+\n/);
  });
});

describe("keyEvidenceHits", () => {
  it("matches substrings case-insensitively across all cited text", () => {
    expect(
      keyEvidenceHits(
        ["DiskErrorException", "valid local directory", "NoRouteToHost"],
        ["exited: org.apache.hadoop.util.DiskChecker$DiskErrorException", "Could not find any VALID LOCAL DIRECTORY"],
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
          service: "s",
          pattern: "Session lookup failed: <*>",
          occurrences: 2,
          firstSeen: "",
          lastSeen: "",
          evidence: [{ timestamp: "", message: "Session lookup failed: ETIMEDOUT" }],
        },
      ],
    };
    const investigation: AIInvestigation = {
      summary: "",
      hypotheses: [
        { cause: "Redis pool exhausted", evidenceIds: ["F1", "C1", "D1", "F9"], nextStep: "" },
      ],
      contextEvidence: [
        { id: "C1", timestamp: "", service: "s", level: "warn", message: "pool at max" },
      ],
      missingEvidence: [],
      diagnosticEvidence: [{ id: "D1", fileName: "d.txt", excerpt: "100/100 connections" }],
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
