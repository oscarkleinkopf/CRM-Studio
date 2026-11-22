import { describe, expect, it } from "vitest";
import { MAX_COMPANY_NAME_LENGTH, MAX_SUMMARY_LENGTH } from "./limits";
import {
  MODULE_CATALOG,
  STEPS,
  applyModuleSelection,
  buildBlueprint,
  prepareGeneration,
  prepareSavedConfig,
  validateAnswers,
} from "./configurator";
import type { CrmBlueprint } from "./types";

const validAnswers = {
  companyName: "Panadería La Espiga",
  industry: "Retail / eCommerce",
  teamSize: "2 a 5",
  salesMotion: "eCommerce / autoservicio",
  primaryGoal: "Fidelizar y dar postventa",
  monthlyLeads: "20 a 100",
  integrations: ["WhatsApp", "Email marketing"],
};

const bogusBlueprint: CrmBlueprint = {
  modules: ["injected"],
  pipelineStages: ["hack"],
  customFields: [],
  automations: ["rm -rf"],
  integrations: ["not-a-tool"],
  recommendedPlan: "Enterprise gratis",
};

describe("validateAnswers", () => {
  it("keeps allowed values", () => {
    expect(validateAnswers(validAnswers)).toEqual(validAnswers);
  });

  it("clamps company name and replaces unknown enums", () => {
    const answers = validateAnswers({
      companyName: `  ${"x".repeat(MAX_COMPANY_NAME_LENGTH + 40)}  `,
      industry: "Minería ilegal",
      teamSize: "millones",
      salesMotion: "<script>",
      primaryGoal: "otro",
      monthlyLeads: "999999",
      integrations: ["WhatsApp", "WhatsApp", "not-allowed", 12, "Email marketing"],
    });
    expect(answers.companyName).toHaveLength(MAX_COMPANY_NAME_LENGTH);
    expect(answers.industry).toBe("Otro");
    expect(answers.teamSize).toBe("Solo yo");
    expect(answers.salesMotion).toBe("Mixto");
    expect(answers.primaryGoal).toBe("Ordenar mi pipeline de ventas");
    expect(answers.monthlyLeads).toBe("20 a 100");
    expect(answers.integrations).toEqual(["WhatsApp", "Email marketing"]);
  });

  it("defaults missing or non-object input", () => {
    expect(validateAnswers(null).companyName).toBe("Mi empresa");
    expect(validateAnswers("nope").industry).toBe("Otro");
  });
});

describe("prepareGeneration / prepareSavedConfig", () => {
  it("rebuilds the blueprint from answers and ignores a client-supplied one", () => {
    const prepared = prepareSavedConfig({
      answers: validAnswers,
      blueprint: bogusBlueprint,
      summary: "  resumen propio  ",
    });
    expect(prepared.blueprint).toEqual(buildBlueprint(validAnswers));
    expect(prepared.blueprint).not.toEqual(bogusBlueprint);
    expect(prepared.summary).toBe("resumen propio");
  });

  it("truncates an oversized summary and fills a missing one", () => {
    const huge = prepareSavedConfig({
      answers: validAnswers,
      summary: "z".repeat(MAX_SUMMARY_LENGTH + 50),
    });
    expect(huge.summary).toHaveLength(MAX_SUMMARY_LENGTH);

    const generated = prepareGeneration({ answers: validAnswers });
    const filled = prepareSavedConfig({ answers: validAnswers });
    expect(filled.summary.length).toBeGreaterThan(20);
    expect(filled.blueprint).toEqual(generated.blueprint);
  });

  it("applies a catalog module selection and drops unknown names", () => {
    const recommended = buildBlueprint(validAnswers);
    const withoutWhatsApp = recommended.modules.filter((name) => name !== "Bandeja de WhatsApp");
    const saved = prepareSavedConfig({
      answers: validAnswers,
      blueprint: bogusBlueprint,
      modules: [...withoutWhatsApp, "Dashboards y reportes", "injected", "Dashboards y reportes"],
    });
    expect(saved.blueprint.pipelineStages).toEqual(recommended.pipelineStages);
    expect(saved.blueprint.modules).not.toContain("injected");
    expect(saved.blueprint.modules).not.toContain("Bandeja de WhatsApp");
    expect(saved.blueprint.modules).toContain("Dashboards y reportes");
    expect(saved.blueprint.recommendedPlan).toBe(recommended.recommendedPlan);
  });

  it("keeps the recommendation when the module list is empty or missing", () => {
    const recommended = buildBlueprint(validAnswers);
    expect(applyModuleSelection(recommended, []).modules).toEqual(recommended.modules);
    expect(applyModuleSelection(recommended, ["no-existe"]).modules).toEqual(recommended.modules);
    expect(prepareSavedConfig({ answers: validAnswers, modules: "no" }).blueprint.modules).toEqual(
      recommended.modules,
    );
  });
});

describe("MODULE_CATALOG", () => {
  it("covers every module the engine can recommend", () => {
    const options = (id: string) => STEPS.find((step) => step.id === id)?.options ?? [];
    const catalog = new Set<string>(MODULE_CATALOG);
    const unknown = new Set<string>();
    const integrations = options("integrations");
    for (const industry of options("industry")) {
      for (const salesMotion of options("salesMotion")) {
        for (const primaryGoal of options("primaryGoal")) {
          for (let mask = 0; mask < 1 << integrations.length; mask += 1) {
            const chosen = integrations.filter((_, index) => (mask & (1 << index)) !== 0);
            const blueprint = buildBlueprint({
              companyName: "X",
              industry,
              teamSize: "Solo yo",
              salesMotion,
              primaryGoal,
              monthlyLeads: "Menos de 20",
              integrations: chosen,
            });
            for (const module of blueprint.modules) {
              if (!catalog.has(module)) unknown.add(module);
            }
          }
        }
      }
    }
    expect([...unknown]).toEqual([]);
  });
});
