import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import {
  clearIncidents,
  createIncident,
} from "../src/incidents/incident-store.js";

describe("POST /incidents", () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it("creates incident and returns it ", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/incidents",
      payload: {
        title: "Checkout requests are failing",
        service: "checkout-api",
        severity: "high",
        description: "HTTP 500 errors increased after deployment",
      },
    });

    expect(response.statusCode).toBe(201);
    const incident = response.json();
    expect(incident.title).toBe("Checkout requests are failing");
    expect(incident.service).toBe("checkout-api");
    expect(incident.severity).toBe("high");
    expect(incident.description).toBe(
      "HTTP 500 errors increased after deployment",
    );
    expect(incident.id).toBeDefined();
    expect(incident.createdAt).toBeDefined();
  });
  it("rejects when missing title ", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/incidents",
      payload: {
        service: "checkout-api",
        severity: "high",
        description: "HTTP 500 errors increased after deployment",
      },
    });

    expect(response.statusCode).toBe(400);
  });
  it("rejects if invalid severity ", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/incidents",
      payload: {
        title: "Something",
        service: "checkout-api",
        severity: "banana",
        description: "HTTP 500 errors increased after deployment",
      },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe("GET /incidents", () => {
  const app = buildApp();
  beforeEach(() => {
    clearIncidents();
  });
  afterAll(async () => {
    await app.close();
  });

  it("List Incidents with empty db ", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/incidents",
    });
    expect(response.json().length).toEqual(0);
  });
  it("List Incidents with populated db ", async () => {
    const payload = {
      title: "Something",
      service: "checkout-api",
      severity: "high" as const,
      description: "HTTP 500 errors increased after deployment",
    };
    createIncident(payload);
    const response = await app.inject({
      method: "GET",
      url: "/incidents",
    });
    expect(response.json().length).toEqual(1);
  });
});
describe("GET /incidents/:id", () => {
  const app = buildApp();
  beforeEach(() => {
    clearIncidents();
  });
  afterAll(async () => {
    await app.close();
  });

  it("Unknown Id returns 404 ", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/incidents/1",
    });
    expect(response.statusCode).toBe(404);
  });
  it("Returns incident when provided id ", async () => {
    const payload = {
      title: "Something",
      service: "checkout-api",
      severity: "high" as const,
      description: "HTTP 500 errors increased after deployment",
    };
    const incident = createIncident(payload);
    const response = await app.inject({
      method: "GET",
      url: `/incidents/${incident.id}`,
    });
    const parsesdResponse = response.json();
    expect(incident.title).toBe(parsesdResponse.title);
    expect(incident.service).toBe(parsesdResponse.service);
    expect(incident.severity).toBe(parsesdResponse.severity);
    expect(incident.description).toBe(parsesdResponse.description);
    expect(incident.createdAt).toBe(parsesdResponse.createdAt);
  });
});
