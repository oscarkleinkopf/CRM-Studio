import { describe, expect, it } from "vitest";
import { MAX_COMPANY_NAME_LENGTH, MAX_SUMMARY_LENGTH } from "./limits";
import { buildBlueprint, prepareGeneration, prepareSavedConfig, validateAnswers } from "./configurator";
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
});
