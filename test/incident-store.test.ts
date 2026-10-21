import { describe, expect, it } from "vitest";
import {
  createIncident,
  getIncident,
  listIncidents,
} from "../src/incidents/incident-store.js";

describe("createIncident", () => {
  it("creates an incident with generated id and timestamp", () => {
    const input = {
      title: "Checkout requests are failing",
      service: "checkout-api",
      severity: "high" as const,
      description: "Http 500 errors increased after deployment",
    };

    const incident = createIncident(input);

    expect(incident.title).toBe(input.title);
    expect(incident.service).toBe(input.service);
    expect(incident.severity).toBe(input.severity);
    expect(incident.description).toBe(input.description);
    expect(new Date(incident.createdAt).toISOString()).toBe(incident.createdAt);
    expect(incident.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});

describe("getIncident", () => {
  it("fetches the incident when provided the id", () => {
    const input = {
      title: "Checkout requests are failing",
      service: "checkout-api",
      severity: "high" as const,
      description: "Http 500 errors increased after deployment",
    };

    const incident = createIncident(input);

    const fetchedIncident = getIncident(incident.id);

    expect(incident).toEqual(fetchedIncident);
  });
  it("returns undefined when fetching nonexistant id", () => {
    const incident = getIncident("123");
    expect(incident).toBeUndefined();
  });
});

describe("listIncidents", () => {
  it("fetches the correct amount of incidents", () => {
    const input = {
      title: "Checkout requests are failing",
      service: "checkout-api",
      severity: "high" as const,
      description: "Http 500 errors increased after deployment",
    };

    const i1 = createIncident(input);
    const i2 = createIncident(input);
    const i3 = createIncident(input);
    const i4 = createIncident(input);

    const fetchedIncidents = listIncidents();

    expect(fetchedIncidents.length).toBeGreaterThanOrEqual(4);
    expect(fetchedIncidents).toEqual(expect.arrayContaining([i1, i2, i3, i4]));
  });
});
