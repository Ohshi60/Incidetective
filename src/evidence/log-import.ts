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

function normalizeLevel(value: unknown): ImportedLog["level"] | undefined {
  switch (value) {
    case 10:
    case 20:
    case "trace":
    case "debug":
      return "debug";
    case 30:
    case "info":
      return "info";
    case 40:
    case "warn":
      return "warn";
    case 50:
    case 60:
    case "error":
    case "fatal":
      return "error";
    default:
      return undefined;
  }
}

function normalizeTimestamp(value: unknown, line: number): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  if (typeof value === "string" && isoFormat.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  throw new LogImportError(line, "Invalid timestamp");
}

export function parseJsonL(
  content: string,
  defaultService?: string,
): ImportedLog[] {
  return content
    .split("\n")
    .map((line, index) => ({
      line: line.trim(),
      lineNumber: index + 1,
    }))
    .filter(({ line }) => line.length > 0)
    .map(({ line, lineNumber }) => {
      let parsed: unknown;

      try {
        parsed = JSON.parse(line);
      } catch {
        throw new LogImportError(lineNumber, "Invalid JSON");
      }

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new LogImportError(lineNumber, "Expected log object");
      }

      const log = parsed as Record<string, unknown>;

      const level = normalizeLevel(log.level);
      if (!level) {
        throw new LogImportError(lineNumber, "Invalid log level");
      }

      const timestamp = normalizeTimestamp(
        log.timestamp ?? log.time,
        lineNumber,
      );

      const service =
        typeof log.service === "string" && log.service.trim()
          ? log.service.trim()
          : typeof log.name === "string" && log.name.trim()
            ? log.name.trim()
            : defaultService;

      if (!service) {
        throw new LogImportError(lineNumber, "Invalid service");
      }

      const baseMessage =
        typeof log.message === "string" && log.message.trim()
          ? log.message
          : typeof log.msg === "string"
            ? log.msg
            : "";

      // Preserve the underlying error message from Pino's
      // serialized `err` object when available.
      const err =
        log.err && typeof log.err === "object"
          ? (log.err as Record<string, unknown>)
          : null;

      const errorMessage = typeof err?.message === "string" ? err.message : "";

      const message = baseMessage
        ? errorMessage && !baseMessage.includes(errorMessage)
          ? `${baseMessage}: ${errorMessage}`
          : baseMessage
        : errorMessage;

      if (!message.trim()) {
        throw new LogImportError(lineNumber, "Invalid message");
      }

      return {
        timestamp,
        service,
        level,
        message,
      };
    });
}
