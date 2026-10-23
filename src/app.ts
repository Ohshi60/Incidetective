import Fastify from "fastify";
import type { CreateIncidentInput } from "../shared/types/incident.js";
import {
  createIncident,
  getIncident,
  listIncidents,
} from "./incidents/incident-store.js";
import { fetchIncidentLogs } from "./evidence/evidence-store.js";
import { analyseIncident } from "./analysis/incident-analysis.js";
import { generateReport } from "./analysis/reports/generate-report.js";
import multipart from "@fastify/multipart";
import { ingestLogs } from "./evidence/log-ingestion.js";
import { LogImportError } from "./evidence/log-import.js";
export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(multipart, {
    limits: {
      fileSize: 1024 * 1024, // 1 MiB
      files: 1,
    },
  });
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
      //loadSampleLogsForIncident(incident.id);
      return res.code(201).send(incident);
    },
  );
  app.post<{ Params: { id: string } }>(
    "/incidents/:id/logs/import",
    async (req, res) => {
      //check incident exists
      const incident = getIncident(req.params.id);
      if (!incident) {
        return res.code(404).send({ error: "incident not found" });
      }

      const data = await req.file();
      if (!data) {
        return res.code(400).send({ error: "no file provided" });
      }
      try {
        const content = (await data.toBuffer()).toString("utf8");

        const importedRecords = ingestLogs(incident.id, content);
        return res.code(201).send({ imported: importedRecords.length });
      } catch (error) {
        if (error instanceof app.multipartErrors.RequestFileTooLargeError) {
          return res.code(413).send({
            error: "File exceeds the 1 MiB upload limit",
          });
        }
        if (error instanceof LogImportError) {
          return res.code(400).send({
            error: "Invalid log file",
            line: error.line,
            message: error.message,
          });
        }
        throw error;
      }
    },
  );

  return app;
}
