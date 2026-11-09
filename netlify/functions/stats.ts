import type { Config, Context } from "@netlify/functions";
import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { crmConfigs } from "../../db/schema";
import { aggregateConfigStats } from "./_shared/aggregate";
import { handleRequest } from "./_shared/http";
import {
  ADMIN_TOKEN_ENV,
  hashesForTokens,
  presentedOwnerTokens,
  requestHasAdminAccess,
} from "./_shared/ownership";

export default async (req: Request, _context: Context) =>
  handleRequest(async () => {
    const isAdmin = requestHasAdminAccess(req, Netlify.env.get(ADMIN_TOKEN_ENV));
    if (isAdmin) {
      const rows = await db.select().from(crmConfigs);
      return Response.json(aggregateConfigStats(rows));
    }

    const hashes = hashesForTokens(presentedOwnerTokens(req));
    if (hashes.length === 0) {
      return Response.json(aggregateConfigStats([]));
    }

    const rows = await db.select().from(crmConfigs).where(inArray(crmConfigs.ownerTokenHash, hashes));
    return Response.json(aggregateConfigStats(rows));
  });

export const config: Config = {
  path: "/api/stats",
  method: ["GET"],
};
