import type { CrmBlueprint } from "./types";

export type ExportableConfig = {
  companyName: string;
  industry: string;
  teamSize: string;
  salesMotion: string;
  primaryGoal: string;
  monthlyLeads: number | string;
  integrations: string[];
  blueprint: CrmBlueprint;
  summary: string;
};

export function configToJson(config: ExportableConfig): string {
  return JSON.stringify(
    {
      companyName: config.companyName,
      industry: config.industry,
      teamSize: config.teamSize,
      salesMotion: config.salesMotion,
      primaryGoal: config.primaryGoal,
      monthlyLeads: config.monthlyLeads,
      integrations: config.integrations,
      summary: config.summary,
      blueprint: config.blueprint,
    },
    null,
    2,
  );
}

export function configToText(config: ExportableConfig): string {
  const blueprint = config.blueprint;
  const lines = [
    `CRM Studio — ${config.companyName}`,
    "",
    `Rubro: ${config.industry}`,
    `Equipo: ${config.teamSize}`,
    `Venta: ${config.salesMotion}`,
    `Objetivo: ${config.primaryGoal}`,
    `Prospectos al mes: ${config.monthlyLeads}`,
    `Integraciones: ${config.integrations.length ? config.integrations.join(", ") : "ninguna"}`,
    `Plan sugerido: ${blueprint.recommendedPlan}`,
    "",
    "Resumen",
    config.summary,
    "",
    "Módulos",
    ...blueprint.modules.map((module) => `- ${module}`),
    "",
    "Pipeline",
    ...blueprint.pipelineStages.map((stage, index) => `${index + 1}. ${stage}`),
  ];
  if (blueprint.customFields.length > 0) {
    lines.push(
      "",
      "Campos personalizados",
      ...blueprint.customFields.map((field) => `- ${field.entity}: ${field.name} (${field.type})`),
    );
  }
  if (blueprint.automations.length > 0) {
    lines.push("", "Automatizaciones", ...blueprint.automations.map((item) => `- ${item}`));
  }
  return `${lines.join("\n")}\n`;
}

export function exportFileName(companyName: string, ext: "json" | "txt"): string {
  const slug =
    companyName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "configuracion";
  return `crm-${slug}.${ext}`;
}
