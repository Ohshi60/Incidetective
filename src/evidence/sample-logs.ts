import { randomUUID } from "node:crypto";
import type { LogEntry } from "./evidence.js";

export function getSampleLogs(): LogEntry[] {
  const SampleLogs: LogEntry[] = [
    {
      incidentId: "420-69-yolo",
      timestamp: new Date().toISOString(),
      service: "deploy-service",
      level: "info",
      message: "Deployment started",
    },
    {
      incidentId: "420-69-yolo",
      timestamp: new Date().toISOString(),
      service: "checkout-service",
      level: "error",
      message: "Request Timeout",
    },
    {
      incidentId: "random-uuid",
      timestamp: new Date().toISOString(),
      service: "database-service",
      level: "warn",
      message: "Query took 670 ms",
    },
    {
      incidentId: randomUUID(),
      timestamp: new Date().toISOString(),
      service: "checkout-service",
      level: "warn",
      message: "Request latency is dangerously high: 6969 ms",
    },
    {
      incidentId: randomUUID(),
      timestamp: new Date().toISOString(),
      service: "checkout-service",
      level: "error",
      message: "Request Timeout",
    },
  ];

  return SampleLogs;
}
