import {
  TemplateMiner,
  TemplateMinerConfig,
  DEFAULT_MASKING_INSTRUCTIONS,
} from "@agentix-e/drain-ts";

import type { ErrorGroup } from "../../shared/types/analysis.js";
import type { LogEntry } from "../../shared/types/evidence.js";

export function groupErrors(logs: LogEntry[]): ErrorGroup[] {
  const miners = new Map<string, TemplateMiner>();
  const groups = new Map<string, ErrorGroup>();

  for (const log of logs) {
    if (log.level !== "error") continue;

    let miner = miners.get(log.service);

    if (!miner) {
      miner = new TemplateMiner({
        config: TemplateMinerConfig.from({
          maskingInstructions: DEFAULT_MASKING_INSTRUCTIONS,
        }),
      });

      miners.set(log.service, miner);
    }

    const result = miner.addLogMessage(log.message);

    // Cluster IDs are unique only within an individual miner.
    const key = JSON.stringify([log.service, result.clusterId]);

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

      // Templates evolve as new messages arrive.
      existing.normalizedMessage = result.templateMined;
    } else {
      groups.set(key, {
        service: log.service,
        normalizedMessage: result.templateMined,
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
