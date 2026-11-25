import {
  TemplateMiner,
  TemplateMinerConfig,
  DEFAULT_MASKING_INSTRUCTIONS,
} from "@agentix-e/drain-ts";

import type { LogGroup } from "../../shared/types/analysis.js";
import type { LogEntry } from "../../shared/types/evidence.js";

function extractErrorCodes(message: string): string[] {
  const matches = message.match(
    /\b(?:ECONNREFUSED|ETIMEDOUT|ECONNRESET|EHOSTUNREACH|ENETUNREACH|ENOTFOUND|EPIPE)\b/gi,
  );

  return [...new Set((matches ?? []).map((code) => code.toUpperCase()))].sort();
}

// Words that rarely appear in info lines during healthy operation. Checked
// against Loghub's Hadoop runs: they match info lines in 23 of 28
// machine-down runs and 1 of 11 normal runs. Broader words like "killed",
// "retrying" or "exception" also match routine cleanup and were left out.
const notableInfoPattern =
  /\b(?:unusable|unreachable|unhealthy|refused|timed out|lost|no space|out of memory|disconnect(?:ed)?|dead|crash(?:ed)?|retrying connect|no route|not reachable|failed to connect|connection reset|broken pipe)\b/i;

/** An info-level line that mentions a likely failure. */
export function isNotableInfo(log: LogEntry): boolean {
  return log.level === "info" && notableInfoPattern.test(log.message);
}

/**
 * Cluster log messages of one level into patterns with the Drain algorithm,
 * separately per service and per set of Node error codes. For "info", only
 * notable info lines are clustered.
 */
export function groupLogs(
  logs: LogEntry[],
  level: LogGroup["level"],
): LogGroup[] {
  const miners = new Map<string, TemplateMiner>();
  const groups = new Map<string, LogGroup>();

  for (const log of logs) {
    if (log.level !== level) continue;
    if (level === "info" && !isNotableInfo(log)) continue;

    const errorCodes = extractErrorCodes(log.message);

    // Keep diagnostically different errors in separate miners.
    const minerKey = JSON.stringify([log.service, errorCodes]);

    let miner = miners.get(minerKey);

    if (!miner) {
      miner = new TemplateMiner({
        config: TemplateMinerConfig.from({
          maskingInstructions: DEFAULT_MASKING_INSTRUCTIONS,
        }),
      });

      miners.set(minerKey, miner);
    }

    const result = miner.addLogMessage(log.message);

    const key = JSON.stringify([minerKey, result.clusterId]);

    // Keep error codes visible even if Drain masks them.
    const missingCodes = errorCodes.filter(
      (code) => !result.templateMined.toUpperCase().includes(code),
    );

    const normalizedMessage = missingCodes.length
      ? `${result.templateMined} [${missingCodes.join(", ")}]`
      : result.templateMined;

    const existing = groups.get(key);

    if (existing) {
      existing.count++;
      existing.evidence.push(log);

      if (log.timestamp < existing.firstSeen) {
        existing.firstSeen = log.timestamp;
      }

      if (log.timestamp > existing.lastSeen) {
        existing.lastSeen = log.timestamp;
      }

      existing.normalizedMessage = normalizedMessage;
    } else {
      groups.set(key, {
        level,
        service: log.service,
        normalizedMessage,
        count: 1,
        firstSeen: log.timestamp,
        lastSeen: log.timestamp,
        evidence: [log],
      });
    }
  }

  return [...groups.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;

    const serviceCompare = a.service.localeCompare(b.service);
    if (serviceCompare !== 0) return serviceCompare;

    return a.normalizedMessage.localeCompare(b.normalizedMessage);
  });
}

export function groupErrors(logs: LogEntry[]): LogGroup[] {
  return groupLogs(logs, "error");
}
