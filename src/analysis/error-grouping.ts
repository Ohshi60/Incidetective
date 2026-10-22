import type { ErrorGroup } from "../../shared/types/analysis.js";
import type { LogEntry } from "../../shared/types/evidence.js";
import { normalizeErrorMessage } from "./normalize-error.js";

export function groupErrors(logs: LogEntry[]): ErrorGroup[] {
  // Map key: "service|message" -> value: ErrorGroup
  const groupsMap = new Map<string, ErrorGroup>();

  for (const log of logs) {
    if (log.level !== "error") continue;

    const normalizedMessage = normalizeErrorMessage(log.message);
    // A collision-safe option would be JSON.stringify([log.service, log.message]).
    const key = JSON.stringify([log.service, normalizedMessage]);
    const existingGroup = groupsMap.get(key);

    if (existingGroup) {
      existingGroup.count++;
      if (log.timestamp < existingGroup.firstSeen) {
        existingGroup.firstSeen = log.timestamp;
      }
      if (log.timestamp > existingGroup.lastSeen) {
        existingGroup.lastSeen = log.timestamp;
      }
    } else {
      groupsMap.set(key, {
        service: log.service,
        normalizedMessage: normalizedMessage,
        count: 1,
        firstSeen: log.timestamp,
        lastSeen: log.timestamp,
      });
    }
  }

  //Convert map to array and sort based on count desc
  return Array.from(groupsMap.values()).sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    //secondary sort on service name
    const serviceCompare = a.service.localeCompare(b.service);
    if (serviceCompare !== 0) {
      return serviceCompare;
    }
    return a.normalizedMessage.localeCompare(b.normalizedMessage);
  });
}
