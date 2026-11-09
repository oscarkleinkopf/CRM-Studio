import { describe, expect, it } from "vitest";
import { aggregateConfigStats } from "./aggregate";

describe("aggregateConfigStats", () => {
  it("returns zeros for an empty owned set", () => {
    expect(aggregateConfigStats([])).toEqual({
      totalConfigs: 0,
      totalMonthlyLeads: 0,
      byIndustry: {},
      byGoal: {},
    });
  });

  it("aggregates only the provided rows", () => {
    const stats = aggregateConfigStats([
      { industry: "Retail / eCommerce", primaryGoal: "Fidelizar y dar postventa", monthlyLeads: 100 },
      { industry: "Retail / eCommerce", primaryGoal: "Conseguir más clientes", monthlyLeads: 20 },
      { industry: "Educación", primaryGoal: "Conseguir más clientes", monthlyLeads: null },
    ]);
    expect(stats).toEqual({
      totalConfigs: 3,
      totalMonthlyLeads: 120,
      byIndustry: { "Retail / eCommerce": 2, Educación: 1 },
      byGoal: { "Fidelizar y dar postventa": 1, "Conseguir más clientes": 2 },
    });
  });
});
