import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { MAX_OWNER_TOKEN_LENGTH, MAX_OWNER_TOKENS } from "../../../shared/limits";
import type { CrmBlueprint } from "../../../shared/types";

type OwnedRow = { ownerTokenHash: string | null };

type ConfigRow = OwnedRow & {
  id: number;
  companyName: string;
  industry: string;
  teamSize: string;
  salesMotion: string;
  primaryGoal: string;
  monthlyLeads: number;
  integrations: string[];
  blueprint: CrmBlueprint;
  summary: string;
  createdAt: Date;
};

export const ADMIN_TOKEN_ENV = "CRM_STUDIO_ADMIN_TOKEN";
export const OWNER_TOKEN_HEADER = "X-Owner-Token";
export const OWNER_TOKENS_HEADER = "X-Owner-Tokens";

export function generateOwnerToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOwnerToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokensEqual(left: string, right: string): boolean {
  const leftHash = Buffer.from(hashOwnerToken(left));
  const rightHash = Buffer.from(hashOwnerToken(right));
  return timingSafeEqual(leftHash, rightHash);
}

export function hashMatches(token: string, hash: string): boolean {
  const computed = hashOwnerToken(token);
  if (computed.length !== hash.length) return false;
  return timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

export function parseOwnerTokens(header: string | null): string[] {
  if (!header) return [];
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const part of header.split(",")) {
    const token = part.trim();
    if (!token || token.length > MAX_OWNER_TOKEN_LENGTH) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
    if (tokens.length >= MAX_OWNER_TOKENS) break;
  }
  return tokens;
}

export function presentedOwnerTokens(req: Request): string[] {
  const single = req.headers.get(OWNER_TOKEN_HEADER);
  const multi = req.headers.get(OWNER_TOKENS_HEADER);
  return parseOwnerTokens([single, multi].filter(Boolean).join(","));
}

export function hashesForTokens(tokens: string[]): string[] {
  return [...new Set(tokens.map(hashOwnerToken))];
}

export function requestHasAdminAccess(
  req: Request,
  configuredToken: string | undefined,
): boolean {
  if (!configuredToken) return false;
  const header = req.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  const presented = header.slice(prefix.length).trim();
  if (!presented) return false;
  return tokensEqual(presented, configuredToken);
}

export function canAccessRow(row: OwnedRow, tokens: string[], isAdmin: boolean): boolean {
  if (isAdmin) return true;
  const hash = row.ownerTokenHash;
  if (!hash) return false;
  return tokens.some((token) => hashMatches(token, hash));
}

export function publicConfig(row: ConfigRow) {
  return {
    id: row.id,
    companyName: row.companyName,
    industry: row.industry,
    teamSize: row.teamSize,
    salesMotion: row.salesMotion,
    primaryGoal: row.primaryGoal,
    monthlyLeads: row.monthlyLeads,
    integrations: row.integrations,
    blueprint: row.blueprint,
    summary: row.summary,
    createdAt: row.createdAt,
  };
}
