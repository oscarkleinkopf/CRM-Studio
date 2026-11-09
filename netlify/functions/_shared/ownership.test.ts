import { describe, expect, it } from "vitest";
import { MAX_OWNER_TOKENS } from "../../../shared/limits";
import {
  canAccessRow,
  generateOwnerToken,
  hashMatches,
  hashOwnerToken,
  hashesForTokens,
  parseOwnerTokens,
  presentedOwnerTokens,
  requestHasAdminAccess,
  tokensEqual,
} from "./ownership";

describe("owner tokens", () => {
  it("hashes and matches a generated token", () => {
    const token = generateOwnerToken();
    expect(token.length).toBeGreaterThan(20);
    const hash = hashOwnerToken(token);
    expect(hash).toHaveLength(64);
    expect(hashMatches(token, hash)).toBe(true);
    expect(hashMatches("nope", hash)).toBe(false);
    expect(tokensEqual(token, token)).toBe(true);
    expect(tokensEqual(token, generateOwnerToken())).toBe(false);
  });

  it("parses, de-duplicates and caps the owner-token header", () => {
    expect(parseOwnerTokens(" a , a , b ")).toEqual(["a", "b"]);
    expect(parseOwnerTokens("x".repeat(200))).toEqual([]);
    const many = Array.from({ length: MAX_OWNER_TOKENS + 5 }, (_, i) => `tok${i}`).join(",");
    expect(parseOwnerTokens(many)).toHaveLength(MAX_OWNER_TOKENS);
  });

  it("reads singular and plural owner headers", () => {
    const req = new Request("https://example.test", {
      headers: {
        "X-Owner-Token": "one",
        "X-Owner-Tokens": "two, one",
      },
    });
    expect(presentedOwnerTokens(req)).toEqual(["one", "two"]);
  });

  it("grants access only to matching tokens, never to legacy rows without a hash", () => {
    const token = generateOwnerToken();
    const row = { ownerTokenHash: hashOwnerToken(token) };
    expect(canAccessRow(row, [token], false)).toBe(true);
    expect(canAccessRow(row, [generateOwnerToken()], false)).toBe(false);
    expect(canAccessRow(row, [], true)).toBe(true);
    expect(canAccessRow({ ownerTokenHash: null }, [token], false)).toBe(false);
    expect(canAccessRow({ ownerTokenHash: null }, [], true)).toBe(true);
  });

  it("accepts a configured admin bearer token", () => {
    const admin = "super-secret-admin-token";
    const req = new Request("https://example.test", {
      headers: { Authorization: `Bearer ${admin}` },
    });
    expect(requestHasAdminAccess(req, admin)).toBe(true);
    expect(requestHasAdminAccess(req, "other-secret-admin-token")).toBe(false);
    expect(requestHasAdminAccess(new Request("https://example.test"), admin)).toBe(false);
    expect(requestHasAdminAccess(req, undefined)).toBe(false);
  });

  it("hashes a list of tokens without duplicates", () => {
    const token = generateOwnerToken();
    const hashes = hashesForTokens([token, token]);
    expect(hashes).toEqual([hashOwnerToken(token)]);
  });
});
