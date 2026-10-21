import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

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
