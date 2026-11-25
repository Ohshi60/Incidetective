import { LogImportError, type ImportedLog } from "./log-import.js";

// logfmt: `key=value` pairs, values optionally double-quoted, as written by
// Go's log/slog text handler and logrus, e.g. Ollama's server.log:
//   time=2026-11-25T14:18:02.536+01:00 level=ERROR source=llama_server.go:1122 msg="llama-server terminated" error="exit status 1"
//
// Such services often also pass through output from child processes without
// a timestamp (Ollama's llama-server lines). Those become entries of their
// own, at the previous entry's time, with a level guessed from their words,
// so an error there isn't hidden inside the line before. Indented lines
// (stack traces, a Go panic's goroutine dump) stay part of the entry above.

const pairPattern = /([\w.-]+)=(?:"((?:[^"\\]|\\.)*)"|(\S*))/g;

/** True if the line looks like logfmt with a time key first. */
export function isLogfmtLine(line: string): boolean {
  return /^time="?\d{4}-\d{2}-\d{2}/.test(line.trimStart());
}

function parsePairs(line: string): Map<string, string> {
  const pairs = new Map<string, string>();
  for (const match of line.matchAll(pairPattern)) {
    const [, key, quoted, bare] = match;
    if (key === undefined) continue;
    pairs.set(
      key,
      quoted !== undefined ? quoted.replace(/\\(.)/g, "$1") : (bare ?? ""),
    );
  }
  return pairs;
}

function toLevel(value: string | undefined): ImportedLog["level"] {
  const level = (value ?? "").toLowerCase();
  if (["error", "err", "fatal", "panic", "critical"].includes(level)) {
    return "error";
  }
  if (["warn", "warning"].includes(level)) return "warn";
  if (["debug", "trace"].includes(level)) return "debug";
  return "info";
}

/** Level of a line without one of its own, from the words it uses. */
function guessLevel(line: string): ImportedLog["level"] {
  if (/\b(?:error|fatal|panic|exception)\b/i.test(line)) return "error";
  if (/\b(?:warn|warning)\b/i.test(line)) return "warn";
  return "info";
}

function toTimestamp(value: string, line: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new LogImportError(line, `Invalid timestamp: ${value}`);
  }
  return date.toISOString();
}

// Keys that become the entry's own fields, or add nothing for analysis.
const skippedKeys = new Set(["time", "level", "msg", "source", "service"]);

export function parseLogfmtLog(
  content: string,
  service: string,
): ImportedLog[] {
  const logs: ImportedLog[] = [];
  let current: ImportedLog | undefined;

  for (const [index, line] of content.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const lineNumber = index + 1;

    if (isLogfmtLine(line)) {
      const pairs = parsePairs(line);
      const extra = [...pairs]
        .filter(([key]) => !skippedKeys.has(key))
        .map(([key, value]) =>
          /\s/.test(value) ? `${key}="${value}"` : `${key}=${value}`,
        );
      current = {
        timestamp: toTimestamp(pairs.get("time") ?? "", lineNumber),
        service: pairs.get("service") ?? service,
        level: toLevel(pairs.get("level")),
        message: [pairs.get("msg") ?? "", ...extra].join(" ").trim(),
      };
      logs.push(current);
    } else if (!current) {
      throw new LogImportError(
        lineNumber,
        "Unsupported log format: expected a line starting with time=",
      );
    } else if (/^\s/.test(line)) {
      current.message += `\n${line}`;
    } else {
      current = {
        timestamp: current.timestamp,
        service: current.service,
        level: guessLevel(line),
        message: line.trim(),
      };
      logs.push(current);
    }
  }

  if (logs.length === 0) {
    throw new LogImportError(1, "No valid log entries found");
  }

  return logs;
}
