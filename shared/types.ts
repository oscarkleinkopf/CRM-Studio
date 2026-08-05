export type CustomField = {
  entity: string;
  name: string;
  type: "texto" | "número" | "fecha" | "selección" | "moneda" | "booleano";
};

export type CrmBlueprint = {
  modules: string[];
  pipelineStages: string[];
  customFields: CustomField[];
  automations: string[];
  integrations: string[];
  recommendedPlan: string;
};

export type ConfiguratorAnswers = {
  companyName: string;
  industry: string;
  teamSize: string;
  salesMotion: string;
  primaryGoal: string;
  monthlyLeads: string;
  integrations: string[];
};

export type GenerateResponse = {
  blueprint: CrmBlueprint;
  summary: string;
  aiPowered: boolean;
};
