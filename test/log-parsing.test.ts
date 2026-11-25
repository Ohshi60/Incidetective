import { describe, expect, it } from "vitest";
import { parseLogContent } from "../src/evidence/log-ingestion.js";
import { LogImportError } from "../src/evidence/log-import.js";
import { parseLogfmtLog } from "../src/evidence/logfmt-log-import.js";
import { parseTextLog } from "../src/evidence/text-log-import.js";

describe("parseTextLog", () => {
  it("reads log4j-style timestamps without a timezone as UTC", () => {
    const logs = parseTextLog(
      "2015-10-19 14:26:28,867 WARN [main] org.apache.hadoop.mapred.YarnChild: Exception running child\n" +
        "2015-10-19 14:26:28,977 FATAL [IPC Server handler 10] TaskAttemptListenerImpl: exited",
      "hadoop",
    );

    expect(logs).toEqual([
      {
        timestamp: "2015-10-19T14:26:28.867Z",
        service: "hadoop",
        level: "warn",
        message:
          "[main] org.apache.hadoop.mapred.YarnChild: Exception running child",
      },
      {
        timestamp: "2015-10-19T14:26:28.977Z",
        service: "hadoop",
        level: "error",
        message: "[IPC Server handler 10] TaskAttemptListenerImpl: exited",
      },
    ]);
  });

  it("still applies an explicit timezone offset", () => {
    const [log] = parseTextLog(
      "[2026-11-12 13:10:22.300 +01:00] [ERR] [101] auth-service: Session lookup failed",
      "auth",
    );

    expect(log?.timestamp).toBe("2026-11-12T12:10:22.300Z");
    expect(log?.level).toBe("error");
    expect(log?.message).toBe("auth-service: Session lookup failed");
  });

  it("appends continuation lines such as stack traces to the previous entry", () => {
    const logs = parseTextLog(
      "2015-10-19 14:26:28,867 WARN [main] Exception running child\n" +
        "java.io.IOException: disk full\n" +
        "\tat org.example.Foo.bar(Foo.java:1)",
      "hadoop",
    );

    expect(logs).toHaveLength(1);
    expect(logs[0]?.message).toBe(
      "[main] Exception running child\njava.io.IOException: disk full\n\tat org.example.Foo.bar(Foo.java:1)",
    );
  });

  it("rejects an unsupported first line with a LogImportError and its line number", () => {
    const parse = () =>
      parseTextLog("\nNov 12 13:10:20 pve sshd[1]: hello", "pve");

    expect(parse).toThrow(LogImportError);
    expect(parse).toThrow(/^Line 2: Unsupported log format/);
  });
});

describe("parseLogfmtLog", () => {
  // Shaped like Ollama's server.log: slog lines plus llama-server output.
  const ollamaLog = [
    'time=2026-11-25T14:17:58.100+01:00 level=INFO source=server.go:1200 msg="llama runner started in 2.10 seconds"',
    "llama_kv_cache:      ROCm0 KV buffer size =  2304.00 MiB",
    "srv    send_error: task id = 1429, error: got exception: Unexpected empty grammar stack after accepting piece: 0 (15)",
    'time=2026-11-25T14:18:02.536+01:00 level=ERROR source=llama_server.go:1122 msg="llama-server terminated" error="exit status 1" exit=1',
    "panic: runtime error: index out of range",
    "",
    "goroutine 1 [running]:",
    "\tmain.main()",
  ].join("\n");

  it("reads time, level and msg, and keeps other keys in the message", () => {
    const [, , , terminated] = parseLogfmtLog(ollamaLog, "ollama");

    expect(terminated).toEqual({
      timestamp: "2026-11-25T13:18:02.536Z",
      service: "ollama",
      level: "error",
      message: 'llama-server terminated error="exit status 1" exit=1',
    });
  });

  it("makes untimestamped lines their own entries with a guessed level", () => {
    const logs = parseLogfmtLog(ollamaLog, "ollama");

    expect(logs.map((log) => [log.timestamp, log.level])).toEqual([
      ["2026-11-25T13:17:58.100Z", "info"],
      ["2026-11-25T13:17:58.100Z", "info"],
      ["2026-11-25T13:17:58.100Z", "error"],
      ["2026-11-25T13:18:02.536Z", "error"],
      ["2026-11-25T13:18:02.536Z", "error"],
      ["2026-11-25T13:18:02.536Z", "info"],
    ]);
    expect(logs[2]?.message).toMatch(/^srv {4}send_error: task id = 1429/);
  });

  it("keeps indented lines with the entry above", () => {
    const logs = parseLogfmtLog(ollamaLog, "ollama");

    expect(logs.at(-1)?.message).toBe("goroutine 1 [running]:\n\tmain.main()");
  });

  it("uses a service key when present and unescapes quoted values", () => {
    const [log] = parseLogfmtLog(
      'time="2026-01-01T10:00:00Z" level=warning service=api msg="said \\"hi\\""',
      "default",
    );

    expect(log).toMatchObject({
      service: "api",
      level: "warn",
      message: 'said "hi"',
    });
  });

  it("rejects a first line without time= with its line number", () => {
    expect(() => parseLogfmtLog("\nhello", "s")).toThrow(LogImportError);
  });
});

describe("parseLogContent", () => {
  it("uses the JSONL parser when the first non-empty line is a JSON object", () => {
    const logs = parseLogContent(
      '\n{"timestamp":"2026-10-23T10:00:00Z","level":"error","message":"boom"}',
      "checkout-api",
    );

    expect(logs).toEqual([
      {
        timestamp: "2026-10-23T10:00:00.000Z",
        service: "checkout-api",
        level: "error",
        message: "boom",
      },
    ]);
  });

  it("uses the logfmt parser when the first line starts with time=", () => {
    const logs = parseLogContent(
      'time=2026-10-23T10:00:00Z level=ERROR msg="boom"\nsrv error: bang',
      "ollama",
    );

    expect(logs.map((log) => log.message)).toEqual(["boom", "srv error: bang"]);
  });

  it("uses the text parser otherwise", () => {
    const logs = parseLogContent(
      "2026-10-23T10:00:00Z ERROR boom",
      "checkout-api",
    );

    expect(logs).toHaveLength(1);
    expect(logs[0]?.level).toBe("error");
  });

  it("returns no entries for an empty file", () => {
    expect(parseLogContent("  \n\n", "svc")).toEqual([]);
  });
});
