import type { ConfiguratorAnswers, CrmBlueprint, GenerateResponse } from "../shared/types";

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

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  health: () => fetch("/api/health").then(json<Health>),
  generate: (answers: ConfiguratorAnswers) =>
    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    }).then(json<GenerateResponse>),
  saveConfig: (payload: { answers: ConfiguratorAnswers; blueprint: CrmBlueprint; summary: string }) =>
    fetch("/api/configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(json<SavedConfig>),
  listConfigs: () => fetch("/api/configs").then(json<SavedConfig[]>),
  getConfig: (id: number) => fetch(`/api/configs/${id}`).then(json<SavedConfig>),
  deleteConfig: (id: number) => fetch(`/api/configs/${id}`, { method: "DELETE" }),
  stats: () => fetch("/api/stats").then(json<Stats>),
};
