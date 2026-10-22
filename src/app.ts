import Fastify from "fastify";
import type { CreateIncidentInput } from "../shared/types/incident.js";
import {
  createIncident,
  getIncident,
  listIncidents,
} from "./incidents/incident-store.js";
import { fetchIncidentLogs } from "./evidence/evidence-store.js";
import { loadSampleLogsForIncident } from "./evidence/sample-evidence-loader.js";
import { analyseIncident } from "./analysis/incident-analysis.js";
import { generateReport } from "./analysis/reports/generate-report.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.get("/incidents", async (req, res) => {
    return res.send(listIncidents());
  });
  app.get<{ Params: { id: string } }>("/incidents/:id", async (req, res) => {
    const incident = getIncident(req.params.id);
    if (incident) {
      return res.code(200).send(incident);
    } else {
      return res.code(404).send({ error: "incident not found" });
    }
  });
  app.get<{ Params: { id: string } }>(
    "/incidents/:id/logs",
    async (req, res) => {
      const incident = getIncident(req.params.id);
      if (!incident) {
        return res.code(404).send({ error: "incident not found" });
      }

      const incidentLogs = fetchIncidentLogs(req.params.id);
      return res.code(200).send(incidentLogs);
    },
  );
  app.get<{ Params: { id: string } }>(
    "/incidents/:id/analysis",
    async (req, res) => {
      const incident = getIncident(req.params.id);
      if (!incident) {
        return res.code(404).send({ error: "incident not found" });
      }

      const incidentLogs = fetchIncidentLogs(req.params.id);
      const analysis = analyseIncident(incidentLogs);
      return res.code(200).send(analysis);
    },
  );
  app.get<{ Params: { id: string } }>(
    "/incidents/:id/report",
    async (req, res) => {
      const incident = getIncident(req.params.id);
      if (!incident) {
        return res.code(404).send({ error: "incident not found" });
      }

      const incidentLogs = fetchIncidentLogs(req.params.id);
      const report = generateReport(incident, incidentLogs);

      return res.code(200).send(report);
    },
  );
  app.post<{ Body: CreateIncidentInput }>(
    "/incidents",
    {
      schema: {
        body: {
          type: "object",
          required: ["title", "service", "severity", "description"],
          additionalProperties: false,
          properties: {
            title: { type: "string", minLength: 1 },
            service: { type: "string", minLength: 1 },
            severity: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
            },
            description: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (req, res) => {
      const incident = createIncident(req.body);
      // temporary create synthetic evidence
      loadSampleLogsForIncident(incident.id);
      return res.code(201).send(incident);
    },
  );

  return app;
}
