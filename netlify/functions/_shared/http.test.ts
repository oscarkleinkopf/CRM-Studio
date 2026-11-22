import { describe, expect, it } from "vitest";
import { MAX_JSON_BODY_BYTES } from "../../../shared/limits";
import {
  createRateLimiter,
  handleRequest,
  HttpError,
  jsonError,
  readJsonBody,
} from "./http";

describe("readJsonBody", () => {
  it("parses a small JSON object", async () => {
    const req = new Request("https://example.test", {
      method: "POST",
      body: JSON.stringify({ answers: { companyName: "A" } }),
    });
    await expect(readJsonBody(req)).resolves.toEqual({ answers: { companyName: "A" } });
  });

  it("rejects when Content-Length exceeds the cap", async () => {
    const req = {
      headers: { get: (name: string) => (name === "content-length" ? String(MAX_JSON_BODY_BYTES + 1) : null) },
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Request;
    await expect(readJsonBody(req)).rejects.toMatchObject({ status: 413 });
  });

  it("rejects a body larger than the cap", async () => {
    const req = new Request("https://example.test", {
      method: "POST",
      body: "x".repeat(MAX_JSON_BODY_BYTES + 8),
    });
    await expect(readJsonBody(req, 64)).rejects.toMatchObject({ status: 413 });
  });

  it("rejects invalid JSON", async () => {
    const req = new Request("https://example.test", {
      method: "POST",
      body: "{not json",
    });
    await expect(readJsonBody(req)).rejects.toMatchObject({ status: 400 });
  });
});

describe("createRateLimiter", () => {
  it("allows up to max hits in the window and then returns 429 semantics", () => {
    const limiter = createRateLimiter(1_000, 2);
    expect(limiter.check("ip", 1_000).ok).toBe(true);
    expect(limiter.check("ip", 1_100).ok).toBe(true);
    const blocked = limiter.check("ip", 1_200);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);
    expect(limiter.check("other", 1_200).ok).toBe(true);
    expect(limiter.check("ip", 2_100).ok).toBe(true);
  });
});

describe("handleRequest", () => {
  it("maps HttpError to a JSON response", async () => {
    const res = await handleRequest(async () => {
      throw new HttpError(429, "Too many requests", { "Retry-After": "12" });
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("12");
    await expect(res.json()).resolves.toEqual({ error: "Too many requests" });
  });

  it("builds jsonError payloads", async () => {
    const res = jsonError(404, "Not found");
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Not found" });
  });
});
