import type { LogEntry } from "./evidence.js";

export function getSampleLogs(): LogEntry[] {
  const SampleLogs: LogEntry[] = [
    {
      timestamp: new Date().toISOString(),
      service: "deploy-service",
      level: "info",
      message: "Deployment started",
    },
    {
      timestamp: new Date().toISOString(),
      service: "checkout-service",
      level: "error",
      message: "Request Timeout",
    },
    {
      timestamp: new Date().toISOString(),
      service: "database-service",
      level: "warn",
      message: "Query took 670 ms",
    },
    {
      timestamp: new Date().toISOString(),
      service: "checkout-service",
      level: "warn",
      message: "Request latency is dangerously high: 6969 ms",
    },
    {
      timestamp: new Date().toISOString(),
      service: "checkout-service",
      level: "error",
      message: "Request Timeout",
    },
  ];

  return SampleLogs;
}
