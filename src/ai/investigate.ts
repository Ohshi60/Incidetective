import type { AIInvestigation } from "../../shared/types/analysis.js";
import type { LogEntry } from "../../shared/types/evidence.js";
import type { InvestigationReport } from "../../shared/types/report.js";
import type { DiagnosticEvidence } from "../evidence/diagnostic-store.js";
import {
  MAX_EVIDENCE_IDS,
  MAX_RULED_OUT,
  buildInvestigationInput,
} from "./investigation-input.js";
import { ollamaJsonChat, ollamaSettings } from "./ollama.js";

export interface InvestigationUsage {
  estimatedPromptTokens: number;
  promptTokens: number | undefined;
  outputTokens: number | undefined;
  numCtx: number;
  omitted: { findings: number; contextLogs: number; diagnostics: number };
}

export async function investigateWithAI(
  report: InvestigationReport,
  logs: LogEntry[],
  diagnostics: Pick<DiagnosticEvidence, "fileName" | "content">[] = [],
  options: {
    model?: string;
    /** Called with prompt size details, e.g. by the eval. */
    onUsage?: (usage: InvestigationUsage) => void;
  } = {},
): Promise<AIInvestigation> {
  const settings = ollamaSettings();
  const input = buildInvestigationInput(report, logs, diagnostics, settings);
  const { contextEvidence, diagnosticEvidence, validIds } = input;

  const chat = await ollamaJsonChat(
    {
      ...(options.model ? { model: options.model } : {}),
      schema: input.schema,
      system: input.system,
      user: input.user,
    },
    settings,
  );
  options.onUsage?.({
    estimatedPromptTokens: input.estimatedPromptTokens,
    promptTokens: chat.promptTokens,
    outputTokens: chat.outputTokens,
    numCtx: settings.numCtx,
    omitted: input.omitted,
  });
  const { json } = chat;

  const result = json as AIInvestigation;

  if (typeof result.summary !== "string" || !Array.isArray(result.hypotheses)) {
    throw new Error("Invalid AI response");
  }

  // The schema asks for missingEvidence per hypothesis; collect them.
  const modelRequests = [
    ...new Set(
      (result.hypotheses as { missingEvidence?: unknown }[]).flatMap((h) =>
        Array.isArray(h.missingEvidence)
          ? h.missingEvidence.filter(
              (item): item is string =>
                typeof item === "string" && item.trim().length > 0,
            )
          : [],
      ),
    ),
  ].slice(0, 2);

  // If the model didn't request evidence, use the diagnostic
  // steps it already proposed as follow-up evidence requests.
  const fallbackRequests = result.hypotheses
    .filter(
      (h) => typeof h.nextStep === "string" && h.nextStep.trim().length > 0,
    )
    .slice(0, 2)
    .map((h) => `Provide the results of this diagnostic check: ${h.nextStep}`);

  const missingEvidence =
    modelRequests.length > 0 ? modelRequests : fallbackRequests;

  const hypotheses = result.hypotheses.slice(0, 3).map((h) => {
    if (
      typeof h.cause !== "string" ||
      typeof h.nextStep !== "string" ||
      !Array.isArray(h.evidenceIds)
    ) {
      throw new Error("Invalid AI hypothesis");
    }

    return {
      cause: h.cause,
      nextStep: h.nextStep,
      evidenceIds: [
        ...new Set(
          h.evidenceIds.filter(
            (id): id is string => typeof id === "string" && validIds.has(id),
          ),
        ),
      ].slice(0, MAX_EVIDENCE_IDS),
    };
  });

  // Optional for robustness: keep only well-formed items citing real IDs.
  const ruledOut = (
    Array.isArray(result.ruledOut) ? (result.ruledOut as unknown[]) : []
  ).flatMap((item) => {
    const r = item as { evidenceIds?: unknown; reason?: unknown };
    if (typeof r.reason !== "string" || !r.reason.trim()) return [];
    const ids = Array.isArray(r.evidenceIds)
      ? r.evidenceIds.filter(
          (id): id is string => typeof id === "string" && validIds.has(id),
        )
      : [];
    return ids.length
      ? [{ evidenceIds: [...new Set(ids)], reason: r.reason }]
      : [];
  });

  return {
    summary: result.summary,
    contextEvidence,
    missingEvidence,
    diagnosticEvidence,
    ...settleRuledOut(hypotheses, ruledOut),
  };
}

/**
 * Small models sometimes rule evidence out and still build a hypothesis on
 * it. Settle the contradiction: the leading hypothesis wins (ruled-out items
 * touching its evidence are dropped), and a later hypothesis resting only on
 * ruled-out evidence is dropped.
 */
export function settleRuledOut(
  hypotheses: AIInvestigation["hypotheses"],
  ruledOut: AIInvestigation["ruledOut"],
): Pick<AIInvestigation, "hypotheses" | "ruledOut"> {
  const leading = new Set(hypotheses[0]?.evidenceIds ?? []);
  const kept = ruledOut
    .filter((r) => !r.evidenceIds.some((id) => leading.has(id)))
    .slice(0, MAX_RULED_OUT);
  const out = new Set(kept.flatMap((r) => r.evidenceIds));
  return {
    ruledOut: kept,
    hypotheses: hypotheses.filter(
      (h, index) =>
        index === 0 ||
        h.evidenceIds.length === 0 ||
        !h.evidenceIds.every((id) => out.has(id)),
    ),
  };
}
