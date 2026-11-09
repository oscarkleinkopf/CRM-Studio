export type StatRow = {
  industry: string;
  primaryGoal: string;
  monthlyLeads: number | null;
};

export function aggregateConfigStats(rows: StatRow[]) {
  const byIndustry: Record<string, number> = {};
  const byGoal: Record<string, number> = {};
  for (const row of rows) {
    byIndustry[row.industry] = (byIndustry[row.industry] ?? 0) + 1;
    byGoal[row.primaryGoal] = (byGoal[row.primaryGoal] ?? 0) + 1;
  }
  return {
    totalConfigs: rows.length,
    totalMonthlyLeads: rows.reduce((sum, r) => sum + (r.monthlyLeads ?? 0), 0),
    byIndustry,
    byGoal,
  };
}
