import { describe, expect, it } from "vitest";
import { parseLogContent } from "../src/evidence/log-ingestion.js";
import { LogImportError } from "../src/evidence/log-import.js";
import { parseLogs } from "../src/evidence/log-parser.js";

const now = new Date("2026-11-25T12:00:00Z");
const parse = (content: string, service = "svc") =>
  parseLogs(content, service, { now });

describe("parseLogs: plain text", () => {
  it("reads log4j-style timestamps without a timezone as UTC", () => {
    const logs = parse(
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

  it("applies an explicit timezone and drops a bracketed thread ID", () => {
    const [log] = parse(
      "[2026-11-12 13:10:22.300 +01:00] [ERR] [101] auth-service: Session lookup failed",
    );

    expect(log).toMatchObject({
      timestamp: "2026-11-12T12:10:22.300Z",
      level: "error",
      message: "auth-service: Session lookup failed",
    });
  });

  it("appends lines without a timestamp to the entry above", () => {
    const logs = parse(
      "2015-10-19 14:26:28,867 WARN [main] Exception running child\n" +
        "java.io.IOException: disk full\n" +
        "\tat org.example.Foo.bar(Foo.java:1)\n" +
        "Container killed on request. Exit code is 137",
    );

    expect(logs).toHaveLength(1);
    expect(logs[0]?.message).toBe(
      "[main] Exception running child\njava.io.IOException: disk full\n\tat org.example.Foo.bar(Foo.java:1)\nContainer killed on request. Exit code is 137",
    );
  });

  it("doesn't read a level and class name as a syslog host and program", () => {
    const [log] = parse(
      "2015-10-19 14:26:28,867 WARN org.apache.Foo: slow",
      "hadoop",
    );

    expect(log).toMatchObject({
      service: "hadoop",
      level: "warn",
      message: "org.apache.Foo: slow",
    });
  });

  it("reads syslog lines: no year, program as service, level from words", () => {
    const logs = parse(
      "Nov 12 13:10:20 pve sshd[1234]: error: maximum authentication attempts exceeded\n" +
        "Nov 12 13:10:21 pve kernel: EXT4-fs warning: mounting fs with errors",
      "pve",
    );

    expect(logs).toEqual([
      {
        timestamp: "2026-11-12T13:10:20.000Z",
        service: "sshd",
        level: "error",
        message: "maximum authentication attempts exceeded",
      },
      {
        timestamp: "2026-11-12T13:10:21.000Z",
        service: "kernel",
        level: "warn",
        message: "EXT4-fs warning: mounting fs with errors",
      },
    ]);
  });

  it("puts a syslog date more than a day ahead in the previous year", () => {
    const [log] = parse("Dec 31 23:59:59 host cron[1]: done");

    expect(log?.timestamp).toBe("2025-12-31T23:59:59.000Z");
  });

  it("reads journalctl -o short-iso lines", () => {
    const [log] = parse(
      "2026-11-25T14:18:02+0100 pve pveproxy[2051]: worker 2052 finished",
    );

    expect(log).toMatchObject({
      timestamp: "2026-11-25T13:18:02.000Z",
      service: "pveproxy",
      level: "info",
      message: "worker 2052 finished",
    });
  });

  it("reads Apache/nginx access logs, where the time isn't first", () => {
    const [log] = parse(
      '10.0.0.1 - - [25/Nov/2026:14:18:02 +0100] "GET /api HTTP/1.1" 502 157',
    );

    expect(log).toMatchObject({
      timestamp: "2026-11-25T13:18:02.000Z",
      message: '10.0.0.1 "GET /api HTTP/1.1" 502 157',
    });
  });

  it("reads a timestamp alone on its line, as Coolify's UI shows them", () => {
    const logs = parse(
      "2026-Nov-25 21:00:31\n" +
        "Container web-1 Starting\n" +
        "2026-Nov-25 21:00:32\n" +
        "Error response from daemon: port is already allocated\n" +
        "2026-Nov-25 21:00:33",
    );

    expect(logs).toEqual([
      {
        timestamp: "2026-11-25T21:00:31.000Z",
        service: "svc",
        level: "info",
        message: "Container web-1 Starting",
      },
      {
        timestamp: "2026-11-25T21:00:32.000Z",
        service: "svc",
        level: "error",
        message: "Error response from daemon: port is already allocated",
      },
      {
        timestamp: "2026-11-25T21:00:33.000Z",
        service: "svc",
        level: "info",
        message: "2026-Nov-25 21:00:33",
      },
    ]);
  });

  it("reads Unix time at the start of a line", () => {
    const [log] = parse("1764080282 backup failed with error 5");

    expect(log).toMatchObject({
      timestamp: "2025-11-25T14:18:02.000Z",
      level: "error",
    });
  });

  it("reads docker logs -t output from PostgreSQL", () => {
    const logs = parse(
      "2026-10-23T14:53:08.885123456Z initdb: warning: enabling trust authentication\n" +
        '2026-10-23T14:53:09.779123456Z 2026-10-23 14:53:09.778 UTC [1] ERROR:  relation "x" does not exist',
      "postgres",
    );

    expect(logs).toEqual([
      {
        timestamp: "2026-10-23T14:53:08.885Z",
        service: "postgres",
        level: "warn",
        message: "initdb: warning: enabling trust authentication",
      },
      {
        timestamp: "2026-10-23T14:53:09.779Z",
        service: "postgres",
        level: "error",
        message: 'relation "x" does not exist',
      },
    ]);
  });

  it("lets an explicit level win over words in the message", () => {
    const [log] = parse("2026-11-25T10:00:00Z INFO no errors found");

    expect(log?.level).toBe("info");
  });
});

describe("parseLogs: JSON lines", () => {
  it("reads common keys, Pino's numeric levels and its err object", () => {
    const logs = parse(
      '{"timestamp":"2026-10-23T10:00:00Z","service":"checkout-api","level":"error","message":"Database connection timeout"}\n' +
        '{"level":50,"time":1794482672213,"name":"auth","msg":"Session lookup failed","err":{"message":"ETIMEDOUT 10.0.0.9:6379"}}',
    );

    expect(logs).toEqual([
      {
        timestamp: "2026-10-23T10:00:00.000Z",
        service: "checkout-api",
        level: "error",
        message: "Database connection timeout",
      },
      {
        timestamp: "2026-11-12T11:24:32.213Z",
        service: "auth",
        level: "error",
        message: "Session lookup failed: ETIMEDOUT 10.0.0.9:6379",
      },
    ]);
  });

  it("reads Docker's json-file logs", () => {
    const [log] = parse(
      '{"log":"panic: out of memory\\n","stream":"stderr","time":"2026-11-25T13:18:02.123456789Z"}',
    );

    expect(log).toMatchObject({
      timestamp: "2026-11-25T13:18:02.123Z",
      level: "error",
      message: "panic: out of memory",
    });
  });

  it("reads journalctl -o json", () => {
    const [log] = parse(
      '{"__REALTIME_TIMESTAMP":"1764076682000000","PRIORITY":"3","SYSLOG_IDENTIFIER":"pveproxy","MESSAGE":"worker died"}',
    );

    expect(log).toEqual({
      timestamp: "2025-11-25T13:18:02.000Z",
      service: "pveproxy",
      level: "error",
      message: "worker died",
    });
  });

  it("keeps a line that isn't valid JSON as an entry of its own", () => {
    const logs = parse(
      '{"time":"2026-11-25T10:00:00Z","level":"info","msg":"ok"}\n{not valid JSON}',
    );

    expect(logs[1]).toMatchObject({
      timestamp: "2026-11-25T10:00:00.000Z",
      message: "{not valid JSON}",
    });
  });
});

describe("parseLogs: logfmt", () => {
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
    const [, , , terminated] = parse(ollamaLog, "ollama");

    expect(terminated).toEqual({
      timestamp: "2026-11-25T13:18:02.536Z",
      service: "ollama",
      level: "error",
      message: 'llama-server terminated error="exit status 1" exit=1',
    });
  });

  it("makes other programs' lines entries of their own with a guessed level", () => {
    const logs = parse(ollamaLog, "ollama");

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
    const logs = parse(ollamaLog, "ollama");

    expect(logs.at(-1)?.message).toBe("goroutine 1 [running]:\n\tmain.main()");
  });

  it("reads logrus: quoted time, a service key and escaped quotes", () => {
    const [log] = parse(
      'time="2026-01-01T10:00:00Z" level=warning service=api msg="said \\"hi\\""',
    );

    expect(log).toEqual({
      timestamp: "2026-01-01T10:00:00.000Z",
      service: "api",
      level: "warn",
      message: 'said "hi"',
    });
  });
});

describe("parseLogs: lines before the first timestamp and files without any", () => {
  it("gives leading lines the first timestamp in the file", () => {
    const logs = parse(
      "starting up\n" + '{"time":"2026-11-25T10:00:00Z","msg":"ready"}',
    );

    expect(logs.map((log) => log.timestamp)).toEqual([
      "2026-11-25T10:00:00.000Z",
      "2026-11-25T10:00:00.000Z",
    ]);
  });

  it("rejects a file without any timestamp", () => {
    const run = () => parse("hello\nworld");

    expect(run).toThrow(LogImportError);
    expect(run).toThrow(/^Line 1: No timestamps found/);
  });
});

describe("parseLogContent", () => {
  it("parses any supported format", () => {
    const logs = parseLogContent(
      'time=2026-10-23T10:00:00Z level=ERROR msg="boom"\nsrv error: bang',
      "ollama",
    );

    expect(logs.map((log) => log.message)).toEqual(["boom", "srv error: bang"]);
  });

  it("returns no entries for an empty file", () => {
    expect(parseLogContent("  \n\n", "svc")).toEqual([]);
  });
});
