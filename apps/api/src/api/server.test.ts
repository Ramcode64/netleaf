import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./server.js";

// These tests assemble the real Fastify app and exercise the HTTP layer via
// inject() — no network, no DB, no browser. They prove the server wires up all
// plugins + routes without conflict, and that the auth gate behaves correctly.
// (Default env: LOCAL_MODE unset → false, so auth is enforced.)

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("server assembly", () => {
  it("builds and responds to /health", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "ok" });
  });

  it("lists all v1 endpoints on /", async () => {
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("netleaf");
    expect(body.endpoints).toEqual(
      expect.arrayContaining([
        "POST /v1/scrape",
        "POST /v1/crawl",
        "POST /v1/map",
        "POST /v1/extract",
        "POST /v1/search",
      ])
    );
  });
});

describe("auth gate (non-local mode)", () => {
  it("rejects /v1/scrape with no Authorization header", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/scrape",
      payload: { url: "https://example.com" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().success).toBe(false);
  });

  it("rejects a malformed Authorization header", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/crawl",
      headers: { authorization: "NotBearer xyz" },
      payload: { url: "https://example.com" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects /v1/keys without auth", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/keys" });
    expect(res.statusCode).toBe(401);
  });
});
