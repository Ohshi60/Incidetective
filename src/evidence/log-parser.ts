// One importer for most log formats. Analysis needs three things per entry:
// when, how bad, and what it says. Each line is read as the first of:
//
// 1. JSON object (Pino, Bunyan, Docker json-file, journalctl -o json, ...)
// 2. logfmt `key=value` pairs (Go's slog, logrus, Ollama)
// 3. plain text with a timestamp near the start (ISO 8601, syslog,
//    Apache/nginx, Unix time)
//
// Structured lines are read through common key names; text lines through a
// timestamp search and a level word. Lines without a timestamp:
// - after a plain-text entry, continue it (stack traces and other
//   multi-line messages; text loggers write those);
// - after a structured entry, start an entry of their own at the same time.
//   Structured loggers put each entry on one line, so an unstructured line
//   there is someone else's output (e.g. llama-server inside Ollama's log),
//   and folding it into the entry above would hide its errors.
// Indented lines always continue the entry above.

import { LogImportError, type ImportedLog } from "./log-import.js";

type Level = ImportedLog["level"];

interface ParsedLine {
  timestamp?: string;
  level?: Level;
  service?: string;
  message: string;
  structured: boolean;
}

export interface ParseOptions {
  /** Reference time for timestamps without a year (syslog). */
  now?: Date;
}

// --- Levels ------------------------------------------------------------------

const levelWords: Record<string, Level> = {
  trace: "debug",
  trc: "debug",
  debug: "debug",
  dbg: "debug",
  verbose: "debug",
  info: "info",
  inf: "info",
  information: "info",
  notice: "info",
  warn: "warn",
  wrn: "warn",
  warning: "warn",
  error: "error",
  err: "error",
  eror: "error",
  fatal: "error",
  ftl: "error",
  crit: "error",
  critical: "error",
  panic: "error",
  severe: "error",
  emerg: "error",
  alert: "error",
};

/** A level given as a word or a number (Pino 10–60, syslog 0–7). */
function levelFrom(value: unknown, numbers: "pino" | "syslog" = "pino") {
  if (typeof value === "string") {
    const word = value.trim().toLowerCase();
    if (/^\d+$/.test(word)) return levelFrom(Number(word), numbers);
    return levelWords[word];
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (numbers === "syslog") {
      return value <= 3
        ? "error"
        : value === 4
          ? "warn"
          : value <= 6
            ? "info"
            : "debug";
    }
    return value >= 50
      ? "error"
      : value >= 40
        ? "warn"
        : value >= 30
          ? "info"
          : "debug";
  }
  return undefined;
}

/** For lines without a level: guess from the words they use. */
function guessLevel(text: string): Level {
  if (/\b(?:error|fatal|panic|exception|critical)\b/i.test(text))
    return "error";
  if (/\b(?:warn|warning)\b/i.test(text)) return "warn";
  return "info";
}

// --- Timestamps --------------------------------------------------------------

const months = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";
const monthIndex = (name: string) =>
  months
    .split("|")
    .indexOf(name.slice(0, 1).toUpperCase() + name.slice(1, 3).toLowerCase());

interface TimestampFormat {
  pattern: RegExp;
  toDate: (match: RegExpMatchArray, now: Date) => Date | undefined;
}

const zonePart = String.raw`(?:\s?(Z|[+-]\d{2}:?\d{2}))?`;

function withZone(local: string, zone: string | undefined): Date {
  const offset = !zone
    ? "Z"
    : zone === "Z"
      ? "Z"
      : zone.replace(/^([+-]\d{2})(\d{2})$/, "$1:$2");
  return new Date(local + offset);
}

const timestampFormats: TimestampFormat[] = [
  // ISO 8601 and close relatives: 2026-11-25T14:18:02.536+01:00,
  // 2015-10-18 18:01:47,978 (log4j), 2026/11/25 14:18:02 (Go's log).
  // No timezone means UTC.
  {
    pattern: new RegExp(
      String.raw`(\d{4})[-/](\d{2})[-/](\d{2})[ T](\d{2}:\d{2}:\d{2})(?:[.,](\d+))?` +
        zonePart,
    ),
    toDate: ([, y, mo, d, time, fraction, zone]) =>
      withZone(
        `${y}-${mo}-${d}T${time}${fraction ? `.${fraction.slice(0, 3).padEnd(3, "0")}` : ""}`,
        zone,
      ),
  },
  // Apache/nginx: [25/Nov/2026:14:18:02 +0100]
  {
    pattern: new RegExp(
      String.raw`(\d{2})/(${months})/(\d{4}):(\d{2}:\d{2}:\d{2})` + zonePart,
    ),
    toDate: ([, d, mon, y, time, zone]) => {
      const mo = String(monthIndex(mon ?? "") + 1).padStart(2, "0");
      return withZone(`${y}-${mo}-${d}T${time}`, zone);
    },
  },
  // Syslog: Nov 25 14:18:02 (no year: the most recent such date, read as UTC).
  {
    pattern: new RegExp(
      String.raw`\b(${months})\s+(\d{1,2}) (\d{2}:\d{2}:\d{2})(?:\.(\d+))?`,
    ),
    toDate: ([, mon, d, time, fraction], now) => {
      const month = monthIndex(mon ?? "");
      const build = (year: number) =>
        new Date(
          `${year}-${String(month + 1).padStart(2, "0")}-${(d ?? "").padStart(2, "0")}T${time}${
            fraction ? `.${fraction.slice(0, 3).padEnd(3, "0")}` : ""
          }Z`,
        );
      const date = build(now.getUTCFullYear());
      // A date more than a day ahead is from last year.
      return date.getTime() > now.getTime() + 86_400_000
        ? build(now.getUTCFullYear() - 1)
        : date;
    },
  },
];

/** How far into a line a timestamp may start (after a host, prefix, etc.). */
const TIMESTAMP_SEARCH_CHARS = 64;

function findTimestamp(
  line: string,
  now: Date,
): { iso: string; start: number; end: number } | undefined {
  const head = line.slice(0, TIMESTAMP_SEARCH_CHARS + 40);
  let best: { iso: string; start: number; end: number } | undefined;
  for (const format of timestampFormats) {
    const match = format.pattern.exec(head);
    if (!match || match.index > TIMESTAMP_SEARCH_CHARS) continue;
    if (best && match.index >= best.start) continue;
    const date = format.toDate(match, now);
    if (!date || Number.isNaN(date.getTime())) continue;
    best = {
      iso: date.toISOString(),
      start: match.index,
      end: match.index + match[0].length,
    };
  }
  // Unix time in seconds or milliseconds, only as the line's first token.
  if (!best) {
    const epoch = /^(\d{10}|\d{13})(?:\.\d+)?(?=\s)/.exec(line);
    if (epoch?.[1]) {
      const iso = timeValue(Number(epoch[0]));
      if (iso) best = { iso, start: 0, end: epoch[0].length };
    }
  }
  return best;
}

/** A structured time value: a number (Unix s/ms/µs/ns) or a string. */
function timeValue(value: unknown, now = new Date()): string | undefined {
  if (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value.trim())) {
    return timeValue(Number(value), now);
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    // Scale to milliseconds by magnitude: s < 1e11 < ms < 1e14 < µs < 1e17 < ns.
    const ms =
      value < 1e11
        ? value * 1000
        : value < 1e14
          ? value
          : value < 1e17
            ? value / 1e3
            : value / 1e6;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  if (typeof value === "string") {
    const found = findTimestamp(value, now);
    return found?.start === 0 ? found.iso : undefined;
  }
  return undefined;
}

// --- Structured lines --------------------------------------------------------

const timeKeys = [
  "timestamp",
  "time",
  "ts",
  "@timestamp",
  "datetime",
  "date",
  "t",
];
const levelKeys = [
  "level",
  "severity",
  "lvl",
  "loglevel",
  "log.level",
  "levelname",
];
const messageKeys = ["message", "msg", "MESSAGE", "log", "text"];
const serviceKeys = ["service", "service.name", "SYSLOG_IDENTIFIER", "name"];

function firstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function fromRecord(
  record: Record<string, unknown>,
  now: Date,
  extraKeys: "none" | "rest",
): ParsedLine {
  let timestamp: string | undefined;
  for (const key of timeKeys) {
    if (record[key] !== undefined) {
      timestamp = timeValue(record[key], now);
      if (timestamp) break;
    }
  }
  // journalctl -o json: microseconds since the epoch, as a string.
  timestamp ??= timeValue(record.__REALTIME_TIMESTAMP, now);

  let level: Level | undefined;
  for (const key of levelKeys) {
    level = levelFrom(record[key]);
    if (level) break;
  }
  level ??= levelFrom(record.PRIORITY, "syslog");

  // trimEnd: Docker's json-file keeps each line's newline in "log".
  let message = firstString(record, messageKeys)?.trimEnd() ?? "";

  if (extraKeys === "rest") {
    // logfmt: other keys often carry the detail, e.g. error="exit status 1".
    const used = new Set([
      ...timeKeys,
      ...levelKeys,
      ...messageKeys,
      ...serviceKeys,
      "source",
    ]);
    const rest = Object.entries(record)
      .filter(([key]) => !used.has(key))
      .map(([key, value]) => {
        const text = String(value);
        return /\s/.test(text) ? `${key}="${text}"` : `${key}=${text}`;
      });
    message = [message, ...rest].filter(Boolean).join(" ");
  } else {
    // Pino/Bunyan put the underlying error in a serialized `err` object.
    const err = record.err ?? record.error;
    const errMessage =
      err && typeof err === "object"
        ? (err as Record<string, unknown>).message
        : undefined;
    if (
      typeof errMessage === "string" &&
      errMessage &&
      !message.includes(errMessage)
    ) {
      message = message ? `${message}: ${errMessage}` : errMessage;
    }
  }

  if (!message) {
    // No message field: keep everything but the time and level.
    const { ...rest } = record;
    for (const key of [
      ...timeKeys,
      ...levelKeys,
      "__REALTIME_TIMESTAMP",
      "PRIORITY",
    ])
      delete rest[key];
    message = JSON.stringify(rest);
  }

  const service = firstString(record, serviceKeys)?.trim();
  return {
    ...(timestamp ? { timestamp } : {}),
    ...(level ? { level } : {}),
    ...(service ? { service } : {}),
    message,
    structured: true,
  };
}

function parseJsonLine(line: string, now: Date): ParsedLine | undefined {
  if (!line.trimStart().startsWith("{")) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return undefined;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return undefined;
  return fromRecord(value as Record<string, unknown>, now, "none");
}

const pairPattern = /([\w.@-]+)=(?:"((?:[^"\\]|\\.)*)"|(\S*))/g;

function parseLogfmtLine(line: string, now: Date): ParsedLine | undefined {
  // Needs a known key first, so prose containing "a=b" isn't mistaken for it.
  const first = /^\s*([\w.@-]+)=/.exec(line)?.[1];
  if (!first || ![...timeKeys, ...levelKeys].includes(first)) return undefined;
  const record: Record<string, unknown> = {};
  for (const [, key, quoted, bare] of line.matchAll(pairPattern)) {
    if (key === undefined) continue;
    record[key] =
      quoted !== undefined ? quoted.replace(/\\(.)/g, "$1") : (bare ?? "");
  }
  return fromRecord(record, now, "rest");
}

// --- Plain-text lines --------------------------------------------------------

/**
 * A level as the first word after the timestamp: "ERROR", "[WRN]", "<warn>",
 * "error:", or Python's "ERROR:root:message". Lowercase words only count
 * when marked (bracketed or followed by a colon), so prose isn't a level.
 */
function textLevel(rest: string): { level: Level; end: number } | undefined {
  const match = /^([[(<]?)([A-Za-z]+)([\])>]?)(:?)/.exec(rest);
  if (!match?.[2]) return undefined;
  const [whole, open, word, close, colon] = match;
  const level = levelWords[word.toLowerCase()];
  const marked = Boolean(open || close || colon) || word === word.toUpperCase();
  const endsWord =
    /^(?:\s|$|:)/.test(rest.slice(whole.length)) || Boolean(colon);
  return level && marked && endsWord ? { level, end: whole.length } : undefined;
}

function parseTextLine(line: string, now: Date): ParsedLine | undefined {
  const found = findTimestamp(line, now);
  if (!found) return undefined;

  const before = line
    .slice(0, found.start)
    .replace(/[[(\s|-]+$/, "")
    .trim();
  let rest = line.slice(found.end).replace(/^[\])]?\s*/, "");

  // Syslog/journald: "host program[pid]: message". The host can't be a
  // level word, so "WARN org.apache.Foo: message" isn't read as one.
  let service: string | undefined;
  const syslog = /^(\S+) ([\w./@-]+?)(?:\[\d+\])?: /.exec(rest);
  if (
    syslog?.[1] &&
    syslog[2] &&
    !levelWords[syslog[1].replace(/\W/g, "").toLowerCase()]
  ) {
    service = syslog[2];
    rest = rest.slice(syslog[0].length);
  }

  let level: Level | undefined;
  const explicit = textLevel(rest);
  if (explicit) {
    level = explicit.level;
    rest = rest.slice(explicit.end).replace(/^\s*:?\s*/, "");
    // Drop a thread ID right after the level, e.g. Serilog's [127].
    rest = rest.replace(/^\[\d+\]\s*/, "");
  }

  const message =
    (before ? `${before} ${rest}` : rest).trimStart() || line.trim();
  return {
    timestamp: found.iso,
    level: level ?? guessLevel(message),
    ...(service ? { service } : {}),
    message,
    structured: false,
  };
}

// --- File --------------------------------------------------------------------

export function parseLogs(
  content: string,
  defaultService: string,
  options: ParseOptions = {},
): ImportedLog[] {
  const now = options.now ?? new Date();
  const logs: ImportedLog[] = [];
  /** Entries before the first timestamp; they get that timestamp. */
  const undated: ImportedLog[] = [];
  let current: (ImportedLog & { structured: boolean }) | undefined;

  for (const raw of content.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const line = raw;

    if (current && /^\s/.test(line)) {
      current.message += `\n${line}`;
      continue;
    }

    const parsed =
      parseJsonLine(line, now) ??
      parseLogfmtLine(line, now) ??
      parseTextLine(line, now);

    if (!parsed?.timestamp && current && !current.structured) {
      current.message += `\n${line}`;
      continue;
    }

    const entry = {
      timestamp: parsed?.timestamp ?? current?.timestamp ?? "",
      service: parsed?.service ?? defaultService,
      level: parsed?.level ?? guessLevel(line),
      message: parsed?.message ?? line.trim(),
      // An unstructured line in a structured file is foreign output: the
      // next one is an entry of its own too.
      structured: parsed?.structured ?? current?.structured ?? true,
    };
    logs.push(entry);
    if (!entry.timestamp) undated.push(entry);
    current = entry;

    if (entry.timestamp && undated.length) {
      for (const early of undated) early.timestamp = entry.timestamp;
      undated.length = 0;
    }
  }

  if (logs.length > 0 && undated.length === logs.length) {
    throw new LogImportError(
      1,
      "No timestamps found. Supported: ISO 8601 (2026-11-25T14:18:02Z), syslog (Nov 25 14:18:02), Apache ([25/Nov/2026:14:18:02 +0100]), Unix time, or a time field in JSON or key=value lines",
    );
  }

  return logs.map(({ timestamp, service, level, message }) => ({
    timestamp,
    service,
    level,
    message,
  }));
}
