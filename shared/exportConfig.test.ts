import { describe, expect, it } from "vitest";
import { buildBlueprint } from "./configurator";
import { configToJson, configToText, exportFileName } from "./exportConfig";

const config = {
  companyName: "Panadería La Espiga",
  industry: "Retail / eCommerce",
  teamSize: "2 a 5",
  salesMotion: "eCommerce / autoservicio",
  primaryGoal: "Fidelizar y dar postventa",
  monthlyLeads: "20 a 100",
  integrations: ["WhatsApp"],
  summary: "Un CRM para la panadería.",
  blueprint: buildBlueprint({
    companyName: "Panadería La Espiga",
    industry: "Retail / eCommerce",
    teamSize: "2 a 5",
    salesMotion: "eCommerce / autoservicio",
    primaryGoal: "Fidelizar y dar postventa",
    monthlyLeads: "20 a 100",
    integrations: ["WhatsApp"],
  }),
};

describe("exportConfig", () => {
  it("serializes the blueprint as JSON", () => {
    const parsed = JSON.parse(configToJson(config)) as { companyName: string; blueprint: { modules: string[] } };
    expect(parsed.companyName).toBe("Panadería La Espiga");
    expect(parsed.blueprint.modules).toContain("Bandeja de WhatsApp");
  });

  it("writes a readable text brief", () => {
    const text = configToText(config);
    expect(text).toContain("CRM Studio — Panadería La Espiga");
    expect(text).toContain("Plan sugerido:");
    expect(text).toContain("1. Carrito iniciado");
    expect(text).toContain("- Bandeja de WhatsApp");
  });

  it("builds a safe file name", () => {
    expect(exportFileName("Panadería La Espiga", "json")).toBe("crm-panaderia-la-espiga.json");
    expect(exportFileName("   ", "txt")).toBe("crm-configuracion.txt");
  });
});
