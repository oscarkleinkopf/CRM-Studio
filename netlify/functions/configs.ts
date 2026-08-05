import type { Config, Context } from "@netlify/functions";
import { desc } from "drizzle-orm";
import { db } from "../../db";
import { crmConfigs } from "../../db/schema";
import { buildBlueprint, monthlyLeadsToNumber, validateAnswers } from "../../shared/configurator";

export default async (req: Request, _context: Context) => {
  if (req.method === "GET") {
    const rows = await db.select().from(crmConfigs).orderBy(desc(crmConfigs.createdAt)).limit(100);
    return Response.json(rows);
  }

  const body = await req.json().catch(() => ({}));
  const answers = validateAnswers(body?.answers);
  const blueprint = body?.blueprint ?? buildBlueprint(answers);
  const summary = typeof body?.summary === "string" ? body.summary : "";

  const [created] = await db
    .insert(crmConfigs)
    .values({
      companyName: answers.companyName,
      industry: answers.industry,
      teamSize: answers.teamSize,
      salesMotion: answers.salesMotion,
      primaryGoal: answers.primaryGoal,
      monthlyLeads: monthlyLeadsToNumber(answers.monthlyLeads),
      integrations: answers.integrations,
      blueprint,
      summary,
    })
    .returning();

  return Response.json(created, { status: 201 });
};

export const config: Config = {
  path: "/api/configs",
  method: ["GET", "POST"],
};
