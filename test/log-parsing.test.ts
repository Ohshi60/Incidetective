import { describe, expect, it } from "vitest";
import { parseLogContent } from "../src/evidence/log-ingestion.js";
import { LogImportError } from "../src/evidence/log-import.js";
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
        message: "[main] org.apache.hadoop.mapred.YarnChild: Exception running child",
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
    const parse = () => parseTextLog("\nNov 12 13:10:20 pve sshd[1]: hello", "pve");

    expect(parse).toThrow(LogImportError);
    expect(parse).toThrow(/^Line 2: Unsupported log format/);
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
