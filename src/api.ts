import type { ConfiguratorAnswers, CrmBlueprint, GenerateResponse } from "../shared/types";
import {
  localDelete,
  localGenerate,
  localGet,
  localList,
  localSave,
  localStats,
} from "./localStore";
import { allOwnerTokens, forgetOwnerToken, getOwnerToken, rememberOwnerToken } from "./ownerTokens";

export type SavedConfig = {
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
  createdAt: string;
};

export type CreatedConfig = SavedConfig & { ownerToken: string };

export type Stats = {
  totalConfigs: number;
  totalMonthlyLeads: number;
  byIndustry: Record<string, number>;
  byGoal: Record<string, number>;
};

export type Health = {
  ok: boolean;
  db: boolean;
  aiPowered: boolean;
  mode: string;
};

// Set at build time (VITE_STATIC_ONLY=true) for static hosts like GitHub Pages.
// When true, we skip the network entirely and use the client-side store.
const STATIC_ONLY = import.meta.env.VITE_STATIC_ONLY === "true";

async function json<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || !contentType.includes("application/json")) {
    throw new Error(`Non-JSON or failed response: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function ownerHeaders(id?: number): HeadersInit {
  if (id != null) {
    const token = getOwnerToken(id);
    return token ? { "X-Owner-Token": token } : {};
  }
  const tokens = allOwnerTokens();
  return tokens.length ? { "X-Owner-Tokens": tokens.join(",") } : {};
}

// Try the backend API; if it's unavailable (static hosting, offline, or the
// request fails), transparently fall back to the client-side implementation.
async function withFallback<T>(network: () => Promise<T>, local: () => T): Promise<T> {
  if (STATIC_ONLY) return local();
  try {
    return await network();
  } catch {
    return local();
  }
}

export const api = {
  health: () =>
    withFallback<Health>(
      () => fetch("/api/health").then(json<Health>),
      () => ({ ok: true, db: false, aiPowered: false, mode: "static" }),
    ),
  generate: (answers: ConfiguratorAnswers) =>
    withFallback<GenerateResponse>(
      () =>
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        }).then(json<GenerateResponse>),
      () => localGenerate(answers),
    ),
  saveConfig: (payload: { answers: ConfiguratorAnswers; blueprint: CrmBlueprint; summary: string }) =>
    withFallback<SavedConfig>(
      async () => {
        const created = await fetch("/api/configs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: payload.answers, summary: payload.summary }),
        }).then(json<CreatedConfig>);
        rememberOwnerToken(created.id, created.ownerToken);
        return {
          id: created.id,
          companyName: created.companyName,
          industry: created.industry,
          teamSize: created.teamSize,
          salesMotion: created.salesMotion,
          primaryGoal: created.primaryGoal,
          monthlyLeads: created.monthlyLeads,
          integrations: created.integrations,
          blueprint: created.blueprint,
          summary: created.summary,
          createdAt: created.createdAt,
        };
      },
      () => localSave(payload),
    ),
  listConfigs: () =>
    withFallback<SavedConfig[]>(
      () => fetch("/api/configs", { headers: ownerHeaders() }).then(json<SavedConfig[]>),
      () => localList(),
    ),
  getConfig: (id: number) =>
    withFallback<SavedConfig>(
      () => fetch(`/api/configs/${id}`, { headers: ownerHeaders(id) }).then(json<SavedConfig>),
      () => {
        const row = localGet(id);
        if (!row) throw new Error("Not found");
        return row;
      },
    ),
  deleteConfig: (id: number) =>
    withFallback<void>(
      async () => {
        const res = await fetch(`/api/configs/${id}`, { method: "DELETE", headers: ownerHeaders(id) });
        if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
        forgetOwnerToken(id);
      },
      () => localDelete(id),
    ),
  stats: () =>
    withFallback<Stats>(
      () => fetch("/api/stats", { headers: ownerHeaders() }).then(json<Stats>),
      () => localStats(),
    ),
};
