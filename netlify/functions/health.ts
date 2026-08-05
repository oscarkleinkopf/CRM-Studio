import type { Config, Context } from "@netlify/functions";
import { db } from "../../db";
import { crmConfigs } from "../../db/schema";
import { isAiAvailable } from "./_shared/ai";

export default async (_req: Request, _context: Context) => {
  let dbOk = false;
  try {
    await db.select().from(crmConfigs).limit(1);
    dbOk = true;
  } catch (err) {
    console.error("DB health check failed:", err);
  }

  return Response.json({
    ok: dbOk,
    db: dbOk,
    aiPowered: isAiAvailable(),
    mode: isAiAvailable() ? "ai-gateway" : "guided",
  });
};

export const config: Config = {
  path: "/api/health",
  method: ["GET"],
};
