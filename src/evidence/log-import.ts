import type { LogEntry } from "../../shared/types/evidence.js";

export type ImportedLog = Omit<LogEntry, "incidentId">;

export class LogImportError extends Error {
  constructor(
    public readonly line: number,
    message: string,
  ) {
    super(`Line ${line}: ${message}`);
    this.name = "LogImportError";
  }
}

const isoFormat =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function isLogLevel(value: unknown): value is ImportedLog["level"] {
  return (
    value === "debug" ||
    value === "info" ||
    value === "warn" ||
    value === "error"
  );
}

export function parseJsonL(content: string): ImportedLog[] {
  return content
    .split("\n")
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter(({ line }) => line.length > 0)
    .map(({ line, lineNumber }) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch (error) {
        throw new LogImportError(lineNumber, "Invalid JSON");
      }
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new LogImportError(lineNumber, "expected a log object");
      }
      const log = parsed as Record<string, unknown>;
      if (typeof log.service !== "string" || log.service.trim() === "") {
        throw new LogImportError(lineNumber, "Invalid service");
      }
      if (typeof log.message !== "string" || log.message.trim() === "") {
        throw new LogImportError(lineNumber, "Invalid message");
      }
      if (!isLogLevel(log.level)) {
        throw new LogImportError(lineNumber, "invalid log level");
      }
      if (typeof log.timestamp !== "string" || log.timestamp.trim() === "") {
        throw new LogImportError(lineNumber, "Invalid: timestamp not a string");
      }
      if (!isoFormat.test(log.timestamp)) {
        throw new LogImportError(
          lineNumber,
          "Invalid: timestamp format - use ISO 8601",
        );
      }
      const unixTimestamp = Date.parse(log.timestamp);
      if (Number.isNaN(unixTimestamp)) {
        throw new LogImportError(lineNumber, "Invalid: timestamp is NaN");
      }

      return {
        timestamp: new Date(unixTimestamp).toISOString(),
        service: log.service,
        level: log.level,
        message: log.message,
      };
    });
}
