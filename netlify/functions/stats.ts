import type { Config, Context } from "@netlify/functions";
import { db } from "../../db";
import { crmConfigs } from "../../db/schema";

export default async (_req: Request, _context: Context) => {
  const rows = await db.select().from(crmConfigs);

  const byIndustry: Record<string, number> = {};
  const byGoal: Record<string, number> = {};
  for (const row of rows) {
    byIndustry[row.industry] = (byIndustry[row.industry] ?? 0) + 1;
    byGoal[row.primaryGoal] = (byGoal[row.primaryGoal] ?? 0) + 1;
  }

  return Response.json({
    totalConfigs: rows.length,
    totalMonthlyLeads: rows.reduce((sum, r) => sum + (r.monthlyLeads ?? 0), 0),
    byIndustry,
    byGoal,
  });
};

export const config: Config = {
  path: "/api/stats",
  method: ["GET"],
};
