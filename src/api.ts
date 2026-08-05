import type { ConfiguratorAnswers, CrmBlueprint, GenerateResponse } from "../shared/types";
import {
  localDelete,
  localGenerate,
  localGet,
  localList,
  localSave,
  localStats,
} from "./localStore";

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
      () =>
        fetch("/api/configs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).then(json<SavedConfig>),
      () => localSave(payload),
    ),
  listConfigs: () =>
    withFallback<SavedConfig[]>(() => fetch("/api/configs").then(json<SavedConfig[]>), () => localList()),
  getConfig: (id: number) =>
    withFallback<SavedConfig>(
      () => fetch(`/api/configs/${id}`).then(json<SavedConfig>),
      () => {
        const row = localGet(id);
        if (!row) throw new Error("Not found");
        return row;
      },
    ),
  deleteConfig: (id: number) =>
    withFallback<void>(
      async () => {
        await fetch(`/api/configs/${id}`, { method: "DELETE" });
      },
      () => localDelete(id),
    ),
  stats: () => withFallback<Stats>(() => fetch("/api/stats").then(json<Stats>), () => localStats()),
};
