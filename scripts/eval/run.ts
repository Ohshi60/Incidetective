/**
 * Run Incidetective's investigation on the eval cases in eval/cases/, next to
 * a "paste the raw logs into the same model" baseline, and write the results
 * to eval/results/. Needs a running Ollama (OLLAMA_BASE_URL); no database.
 *
 *   npm run eval                                  # all cases, both variants
 *   npm run eval -- --case hadoop-disk-full       # one case (repeatable)
 *   npm run eval -- --model qwen3:14b             # override OLLAMA_MODEL
 *   npm run eval -- --only app                    # app or baseline only
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import type { LogEntry } from "../../shared/types/evidence.js";
import type { Incident } from "../../shared/types/incident.js";
import {
  investigateWithAI,
  type InvestigationUsage,
} from "../../src/ai/investigate.js";
import {
  RAW_LOG_CHARS_PER_TOKEN,
  evidenceBudgetChars,
} from "../../src/ai/investigation-input.js";
import { ollamaJsonChat, ollamaSettings } from "../../src/ai/ollama.js";
import { generateReport } from "../../src/analysis/reports/generate-report.js";
import { parseLogContent } from "../../src/evidence/log-ingestion.js";
import {
  appCitedText,
  appEvidenceText,
  appEvidenceFocus,
  baselineCitedText,
  baselineSchema,
  baselineSystemPrompt,
  buildBaselineInput,
  keyEvidenceHits,
  nextStepHits,
  parseCase,
  redHerringCheck,
  renderMarkdown,
  shrinkToFit,
  type BaselineAnswer,
  type CaseResult,
  type EvalCase,
  type PastedFile,
  type RunResult,
  type VariantResult,
} from "./lib.js";

const casesDir = "eval/cases";
const cacheDir = "eval/.cache";
const resultsDir = "eval/results";

const { values: args } = parseArgs({
  options: {
    case: { type: "string", multiple: true },
    model: { type: "string" },
    only: { type: "string" },
  },
});

if (args.only && args.only !== "app" && args.only !== "baseline") {
  throw new Error('--only must be "app" or "baseline"');
}

const settings = ollamaSettings();
const model = args.model ?? settings.model;

function log(message: string) {
  process.stderr.write(`${message}\n`);
}

function loadCases(): EvalCase[] {
  const ids = readdirSync(casesDir).filter((id) =>
    existsSync(join(casesDir, id, "case.json")),
  );
  const wanted = args.case ?? ids;
  for (const id of wanted) {
    if (!ids.includes(id)) throw new Error(`Unknown case "${id}"`);
  }
  return wanted.map((id) =>
    parseCase(
      id,
      JSON.parse(readFileSync(join(casesDir, id, "case.json"), "utf8")),
    ),
  );
}

/** Download and extract a dataset case's logs into <case>/data/ once. */
function ensureData(evalCase: EvalCase) {
  const { source } = evalCase;
  if (!source) return;
  const dataDir = join(casesDir, evalCase.id, "data");
  if (existsSync(dataDir) && readdirSync(dataDir).length > 0) return;

  mkdirSync(cacheDir, { recursive: true });
  const zipPath = join(cacheDir, `${source.dataset}.zip`);
  if (!existsSync(zipPath)) {
    log(`Downloading ${source.dataset} from ${source.url} ...`);
    execFileSync("curl", ["-fsSL", "-o", zipPath, source.url], {
      stdio: "inherit",
    });
  }

  const extractDir = join(cacheDir, source.dataset);
  if (!existsSync(join(extractDir, source.path))) {
    execFileSync("unzip", [
      "-q",
      "-o",
      zipPath,
      `${source.path}/*`,
      "-d",
      extractDir,
    ]);
  }

  mkdirSync(dataDir, { recursive: true });
  for (const file of readdirSync(join(extractDir, source.path))) {
    writeFileSync(
      join(dataDir, file),
      readFileSync(join(extractDir, source.path, file)),
    );
  }
}

function readFiles(evalCase: EvalCase, paths: string[]): PastedFile[] {
  return paths.flatMap((path) => {
    const full = join(casesDir, evalCase.id, path);
    if (path.endsWith("/")) {
      return readdirSync(full)
        .filter((name) => statSync(join(full, name)).isFile())
        .sort()
        .map((name) => ({
          name,
          content: readFileSync(join(full, name), "utf8"),
        }));
    }
    return [{ name: path, content: readFileSync(full, "utf8") }];
  });
}

async function timed<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const start = performance.now();
  const value = await fn();
  return [value, (performance.now() - start) / 1000];
}

function errorResult(error: unknown): VariantResult {
  return {
    status: "error",
    reason: error instanceof Error ? error.message : String(error),
  };
}

async function runCase(evalCase: EvalCase): Promise<CaseResult> {
  ensureData(evalCase);
  const logFiles = readFiles(evalCase, evalCase.logs);
  const diagnosticFiles = readFiles(evalCase, evalCase.diagnostics);

  const logs: LogEntry[] = logFiles
    .flatMap((file) => parseLogContent(file.content, evalCase.service))
    .map((entry) => ({ ...entry, incidentId: evalCase.id }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const incident: Incident = {
    id: evalCase.id,
    title: evalCase.title,
    service: evalCase.service,
    severity: evalCase.severity,
    description: evalCase.description,
    createdAt: new Date().toISOString(),
  };
  const report = generateReport(incident, logs);

  const result: CaseResult = {
    id: evalCase.id,
    title: evalCase.title,
    logLines: logFiles.reduce((n, f) => n + f.content.split("\n").length, 0),
    parsedEntries: logs.length,
    findings: report.findings.length,
    groundTruth: evalCase.groundTruth,
  };

  if (args.only !== "baseline") {
    if (report.findings.length === 0) {
      result.app = {
        status: "skipped",
        reason:
          "No error-level findings, so the app refuses to investigate (the API returns 400).",
      };
    } else {
      log(`  app ...`);
      try {
        let usage: InvestigationUsage | undefined;
        const [investigation, seconds] = await timed(() =>
          investigateWithAI(
            report,
            logs,
            diagnosticFiles.map((f) => ({
              fileName: f.name,
              content: f.content,
            })),
            { model, onUsage: (u) => (usage = u) },
          ),
        );
        const cited = appCitedText(report, investigation);
        const causes = new Set(investigation.hypotheses.map((h) => h.cause));
        result.app = {
          status: "ok",
          seconds,
          answer: investigation,
          cited: [...new Set(cited.filter((text) => !causes.has(text)))],
          keyEvidence: keyEvidenceHits(evalCase.groundTruth.keyEvidence, cited),
          nextStep: nextStepHits(
            evalCase.groundTruth.nextStepPatterns,
            investigation.hypotheses.map((h) => h.nextStep),
          ),
          ...(evalCase.groundTruth.redHerrings
            ? {
                redHerring: redHerringCheck(
                  evalCase.groundTruth.redHerrings,
                  investigation.hypotheses.map((h) => [
                    h.cause,
                    ...h.evidenceIds.flatMap((id) =>
                      appEvidenceText(report, investigation, id),
                    ),
                  ]),
                  investigation.ruledOut.flatMap((r) => [
                    r.reason,
                    ...r.evidenceIds.flatMap((id) =>
                      appEvidenceText(report, investigation, id),
                    ),
                  ]),
                ),
              }
            : {}),
          focus: appEvidenceFocus(
            report,
            investigation,
            evalCase.groundTruth.keyEvidence,
          ),
          ...(usage?.promptTokens !== undefined
            ? { promptTokens: usage.promptTokens }
            : {}),
          ...(usage ? { omitted: usage.omitted } : {}),
        };
      } catch (error) {
        result.app = errorResult(error);
      }
    }
  }

  if (args.only !== "app") {
    log(`  baseline ...`);
    // Same budget rule as the app: what's left after the prompt and answer.
    const maxChars = evidenceBudgetChars(
      settings,
      baselineSystemPrompt,
      RAW_LOG_CHARS_PER_TOKEN,
    );
    let input = buildBaselineInput(
      evalCase,
      [...diagnosticFiles, ...logFiles],
      maxChars,
    );
    const ask = () =>
      ollamaJsonChat(
        {
          model,
          schema: baselineSchema,
          system: baselineSystemPrompt,
          user: input.text,
        },
        settings,
      );
    try {
      const [chat, seconds] = await timed(async () => {
        try {
          return await ask();
        } catch (error) {
          // Some logs (shell commands, hex IDs) pack more tokens per character
          // than the estimate: cut to Ollama's own count and retry once.
          const smaller = shrinkToFit(String(error), maxChars, settings);
          if (smaller === undefined) throw error;
          log(
            `  baseline too long for the context; retrying at ${smaller} chars`,
          );
          input = buildBaselineInput(
            evalCase,
            [...diagnosticFiles, ...logFiles],
            smaller,
          );
          return await ask();
        }
      });
      const answer = chat.json as BaselineAnswer;
      const hypotheses = Array.isArray(answer.hypotheses)
        ? answer.hypotheses
        : [];
      result.baseline = {
        status: "ok",
        seconds,
        answer,
        ...(chat.promptTokens !== undefined
          ? { promptTokens: chat.promptTokens }
          : {}),
        cited: [...new Set(hypotheses.flatMap((h) => h.evidence ?? []))],
        nextStep: nextStepHits(
          evalCase.groundTruth.nextStepPatterns,
          hypotheses.map((h) =>
            typeof h.nextStep === "string" ? h.nextStep : "",
          ),
        ),
        ...(evalCase.groundTruth.redHerrings
          ? {
              redHerring: redHerringCheck(
                evalCase.groundTruth.redHerrings,
                hypotheses.map((h) => [
                  typeof h.cause === "string" ? h.cause : "",
                  ...(h.evidence ?? []),
                ]),
              ),
            }
          : {}),
        truncated: input.truncated,
        keptFraction: input.keptFraction,
        keyEvidence: keyEvidenceHits(
          evalCase.groundTruth.keyEvidence,
          baselineCitedText({ ...answer, hypotheses }),
        ),
      };
    } catch (error) {
      result.baseline = errorResult(error);
    }
  }

  return result;
}

async function checkOllama() {
  const { baseUrl } = settings;
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    const { models } = (await response.json()) as {
      models: { name: string }[];
    };
    if (!models.some((m) => m.name === model)) {
      throw new Error(
        `model "${model}" is not pulled on ${baseUrl}. Available: ${models.map((m) => m.name).join(", ") || "none"}`,
      );
    }
  } catch (error) {
    throw new Error(
      `Ollama check failed at ${baseUrl}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

const cases = loadCases();
await checkOllama();

const run: RunResult = {
  date: new Date().toISOString(),
  model,
  numCtx: settings.numCtx,
  cases: [],
};

for (const evalCase of cases) {
  log(`${evalCase.id}`);
  run.cases.push(await runCase(evalCase));
}

mkdirSync(resultsDir, { recursive: true });
const stamp = run.date.slice(0, 16).replace(/[:T]/g, "-");
const base = join(
  resultsDir,
  `${stamp}-${model.replace(/[^a-z0-9.-]+/gi, "_")}-ctx${settings.numCtx}`,
);
writeFileSync(`${base}.json`, JSON.stringify(run, null, 2) + "\n");
writeFileSync(`${base}.md`, renderMarkdown(run));
log(`Wrote ${base}.md and ${base}.json`);
