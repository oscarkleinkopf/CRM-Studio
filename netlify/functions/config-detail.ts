import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { crmConfigs } from "../../db/schema";
import { clientKey, enforceRateLimit, handleRequest, jsonError, writeLimiter } from "./_shared/http";
import {
  ADMIN_TOKEN_ENV,
  canAccessRow,
  presentedOwnerTokens,
  publicConfig,
  requestHasAdminAccess,
} from "./_shared/ownership";

export default async (req: Request, context: Context) =>
  handleRequest(async () => {
    const id = Number(context.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return jsonError(400, "Invalid id");
    }

    const isAdmin = requestHasAdminAccess(req, Netlify.env.get(ADMIN_TOKEN_ENV));
    const tokens = presentedOwnerTokens(req);

    if (req.method === "DELETE") {
      enforceRateLimit(writeLimiter, clientKey(context.ip, "configs-write"));
    }

    const [row] = await db.select().from(crmConfigs).where(eq(crmConfigs.id, id)).limit(1);
    if (!row || !canAccessRow(row, tokens, isAdmin)) {
      return jsonError(404, "Not found");
    }

    if (req.method === "DELETE") {
      await db.delete(crmConfigs).where(eq(crmConfigs.id, id));
      return new Response(null, { status: 204 });
    }

    return Response.json(publicConfig(row));
  });

export const config: Config = {
  path: "/api/configs/:id",
  method: ["GET", "DELETE"],
};
