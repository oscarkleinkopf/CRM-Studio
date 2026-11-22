import { describe, expect, it } from "vitest";
import { ApiError, apiErrorMessage, readApiJson, shouldUseLocalFallback } from "./apiResult";

describe("readApiJson", () => {
  it("returns JSON on success", async () => {
    const res = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    await expect(readApiJson<{ ok: boolean }>(res)).resolves.toEqual({ ok: true });
  });

  it("accepts an empty 204", async () => {
    const res = new Response(null, { status: 204 });
    await expect(readApiJson(res)).resolves.toBeUndefined();
  });

  it("raises ApiError for a JSON error so the client does not fall back", async () => {
    const res = new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });
    await expect(readApiJson(res)).rejects.toMatchObject({ name: "ApiError", status: 429 });
  });

  it("treats an HTML error page as a missing API", async () => {
    const res = new Response("<html>not found</html>", {
      status: 404,
      headers: { "content-type": "text/html" },
    });
    await expect(readApiJson(res)).rejects.toThrow("API unavailable");
    try {
      await readApiJson(res.clone());
    } catch (err) {
      expect(err).not.toBeInstanceOf(ApiError);
      expect(shouldUseLocalFallback(err)).toBe(true);
    }
  });
});

describe("fallback policy", () => {
  it("keeps API failures on the server path", () => {
    const err = new ApiError(500, "Error 500");
    expect(shouldUseLocalFallback(err)).toBe(false);
    expect(apiErrorMessage(err, "fallback")).toBe("Error 500");
    expect(apiErrorMessage(new ApiError(429, "Too many requests"), "fallback")).toContain("Demasiadas");
    expect(shouldUseLocalFallback(new TypeError("Failed to fetch"))).toBe(true);
  });
});
