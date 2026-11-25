import { afterAll, afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { db } from "../src/db/client.js";
import { serviceNotes } from "../src/db/schema.js";

afterEach(async () => {
  await db.delete(serviceNotes);
});

describe("/services/:service/notes", () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it("returns empty notes for a service without any", async () => {
    const response = await app.inject({ url: "/services/ollama/notes" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ service: "ollama", notes: "" });
  });

  it("saves, replaces and clears notes", async () => {
    const put = (notes: string) =>
      app.inject({
        method: "PUT",
        url: "/services/ollama/notes",
        payload: { notes },
      });

    expect((await put("Windows 11, RX 7900 XT")).statusCode).toBe(200);
    expect((await put("Ollama 0.40.18 on ROCm")).statusCode).toBe(200);
    expect(
      (await app.inject({ url: "/services/ollama/notes" })).json().notes,
    ).toBe("Ollama 0.40.18 on ROCm");

    await put("   ");
    expect(await db.select().from(serviceNotes)).toEqual([]);
  });

  it("rejects notes over 2,000 characters", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/services/ollama/notes",
      payload: { notes: "x".repeat(2001) },
    });

    expect(response.statusCode).toBe(400);
  });
});
