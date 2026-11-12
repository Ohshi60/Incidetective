import type { ImportedLog } from "./log-import.js";

// ISO timestamps with explicit timezone, optionally bracketed.
const timestampPattern = String.raw`\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:\s?(?:Z|[+-]\d{2}:?\d{2}))`;

const headerPattern = new RegExp(
  String.raw`^(?:\[(${timestampPattern})\]|(${timestampPattern}))\s+(.+)$`,
);

const levelPattern =
  /^(?:\[(TRACE|DBG|DEBUG|INF|INFO|WRN|WARN|WARNING|ERR|ERROR|FTL|FATAL)\]|(TRACE|DBG|DEBUG|INF|INFO|WRN|WARN|WARNING|ERR|ERROR|FTL|FATAL)(?=\s|:|$))\s*:?\s*/i;

function normalizeTimestamp(value: string): string {
  const normalized = value
    .replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T")
    .replace(",", ".")
    .replace(/\s(?=[+-]\d{2}:?\d{2}$)/, "")
    .replace(/([+-]\d{2})(\d{2})$/, "$1:$2");

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${value}`);
  }

  return date.toISOString();
}

function parseSeverity(text: string): {
  level: ImportedLog["level"];
  message: string;
} {
  const match = text.match(levelPattern);
  const severity = (match?.[1] ?? match?.[2] ?? "INFO").toUpperCase();

  let level: ImportedLog["level"] = "info";

  if (["ERR", "ERROR", "FTL", "FATAL"].includes(severity)) {
    level = "error";
  } else if (["WRN", "WARN", "WARNING"].includes(severity)) {
    level = "warn";
  } else if (["TRACE", "DBG", "DEBUG"].includes(severity)) {
    level = "debug";
  }

  // Remove optional thread ID, e.g. [127].
  const message = text.slice(match?.[0].length ?? 0).replace(/^\[\d+\]\s*/, "");

  return { level, message };
}

export function parseTextLog(content: string, service: string): ImportedLog[] {
  const logs: ImportedLog[] = [];
  let current: ImportedLog | undefined;

  for (const [index, line] of content.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;

    const match = line.match(headerPattern);

    if (match) {
      const rawTimestamp = match[1] ?? match[2];

      if (!rawTimestamp) {
        throw new Error(`Missing timestamp at line ${index + 1}`);
      }

      const timestamp = normalizeTimestamp(rawTimestamp);
      const rawMessage = match[3];

      if (rawMessage === undefined) {
        throw new Error(`Missing log message at line ${index + 1}`);
      }

      const { level, message } = parseSeverity(rawMessage);
      current = {
        timestamp,
        service,
        level,
        message,
      };

      logs.push(current);
    } else if (current) {
      // Continuation line: stack trace or multiline message.
      current.message += `\n${line}`;
    } else {
      throw new Error(`Unsupported log header at line ${index + 1}`);
    }
  }

  if (logs.length === 0) {
    throw new Error("No valid log entries found");
  }

  return logs;
}
