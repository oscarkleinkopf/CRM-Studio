import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { crmConfigs } from "../../db/schema";

export default async (req: Request, context: Context) => {
  const id = Number(context.params.id);
  if (!Number.isFinite(id)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  if (req.method === "DELETE") {
    await db.delete(crmConfigs).where(eq(crmConfigs.id, id));
    return new Response(null, { status: 204 });
  }

  const [row] = await db.select().from(crmConfigs).where(eq(crmConfigs.id, id)).limit(1);
  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json(row);
};

export const config: Config = {
  path: "/api/configs/:id",
  method: ["GET", "DELETE"],
};
