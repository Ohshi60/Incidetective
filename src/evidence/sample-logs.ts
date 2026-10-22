// helper function for creating chronological timestamps

import type { LogEntry } from "../../shared/types/evidence.js";

const incidentStart = Date.parse("2026-10-21T10:00:00.000Z");

function timestampAt(offsetSeconds: number): string {
  return new Date(incidentStart + offsetSeconds * 1000).toISOString();
}
export function getSampleLogs(): LogEntry[] {
  const sampleLogs: LogEntry[] = [
    {
      incidentId: "incident-checkout-demo",
      timestamp: timestampAt(-60),
      service: "deploy-service",
      level: "info",
      message: "Deployment started",
    },
    {
      incidentId: "incident-checkout-demo",
      timestamp: timestampAt(0),
      service: "checkout-service",
      level: "error",
      message: "Request Timeout",
    },
    {
      incidentId: "incident-checkout-demo",
      timestamp: timestampAt(30),
      service: "database-service",
      level: "warn",
      message: "Query took 670 ms",
    },
    {
      incidentId: "incident-checkout-demo",
      timestamp: timestampAt(60),
      service: "checkout-service",
      level: "warn",
      message: "Request latency is dangerously high: 6969 ms",
    },
    {
      incidentId: "incident-checkout-demo",
      timestamp: timestampAt(120),
      service: "checkout-service",
      level: "error",
      message: "Request Timeout",
    },
  ];

  return sampleLogs;
}

export function generateLogsForIncident(id: string): LogEntry[] {
  return getSampleLogs().map((log) => {
    return { ...log, incidentId: id };
  });
}
