import Fastify from "fastify";
import type { CreateIncidentInput } from "./incidents/incident.js";
import { createIncident } from "./incidents/incident-store.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => {
    return { status: "ok" };
  });

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
      return res.code(201).send(incident);
    },
  );

  return app;
}
