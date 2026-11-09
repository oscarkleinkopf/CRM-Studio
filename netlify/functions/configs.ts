import type { Config, Context } from "@netlify/functions";
import { desc, inArray } from "drizzle-orm";
import { db } from "../../db";
import { crmConfigs } from "../../db/schema";
import { monthlyLeadsToNumber, prepareSavedConfig } from "../../shared/configurator";
import {
  clientKey,
  enforceRateLimit,
  handleRequest,
  readJsonBody,
  writeLimiter,
} from "./_shared/http";
import {
  ADMIN_TOKEN_ENV,
  generateOwnerToken,
  hashOwnerToken,
  hashesForTokens,
  presentedOwnerTokens,
  publicConfig,
  requestHasAdminAccess,
} from "./_shared/ownership";

export default async (req: Request, context: Context) =>
  handleRequest(async () => {
    const isAdmin = requestHasAdminAccess(req, Netlify.env.get(ADMIN_TOKEN_ENV));

    if (req.method === "GET") {
      if (isAdmin) {
        const rows = await db.select().from(crmConfigs).orderBy(desc(crmConfigs.createdAt)).limit(100);
        return Response.json(rows.map(publicConfig));
      }
      const hashes = hashesForTokens(presentedOwnerTokens(req));
      if (hashes.length === 0) return Response.json([]);
      const rows = await db
        .select()
        .from(crmConfigs)
        .where(inArray(crmConfigs.ownerTokenHash, hashes))
        .orderBy(desc(crmConfigs.createdAt))
        .limit(100);
      return Response.json(rows.map(publicConfig));
    }

    enforceRateLimit(writeLimiter, clientKey(context.ip, "configs-write"));
    const { answers, blueprint, summary } = prepareSavedConfig(await readJsonBody(req));
    const ownerToken = generateOwnerToken();
    const ownerTokenHash = hashOwnerToken(ownerToken);

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
        ownerTokenHash,
      })
      .returning();

    return Response.json({ ...publicConfig(created), ownerToken }, { status: 201 });
  });

export const config: Config = {
  path: "/api/configs",
  method: ["GET", "POST"],
};
