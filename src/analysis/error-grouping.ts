import type { LogEntry } from "../evidence/evidence.js";

export interface ErrorGroup {
  service: string;
  message: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

export function groupErrors(logs: LogEntry[]): ErrorGroup[] {
  // Map key: "service|message" -> value: ErrorGroup
  const groupsMap = new Map<string, ErrorGroup>();

  for (const log of logs) {
    if (log.level !== "error") continue;
    const key = `${log.service}|${log.message}`;
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
        message: log.message,
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
    return a.message.localeCompare(b.message);
  });
}
