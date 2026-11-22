import type { Config, Context } from "@netlify/functions";
import { fallbackSummary, prepareGeneration } from "../../shared/configurator";
import type { GenerateResponse } from "../../shared/types";
import { generateAiSummary } from "./_shared/ai";
import { clientKey, enforceRateLimit, generateLimiter, handleRequest, readJsonBody } from "./_shared/http";

export default async (req: Request, context: Context) =>
  handleRequest(async () => {
    enforceRateLimit(generateLimiter, clientKey(context.ip, "generate"));
    const { answers, blueprint } = prepareGeneration(await readJsonBody(req));
    const aiSummary = await generateAiSummary(answers, blueprint);
    const response: GenerateResponse = {
      blueprint,
      summary: aiSummary ?? fallbackSummary(answers, blueprint),
      aiPowered: Boolean(aiSummary),
    };
    return Response.json(response);
  });

export const config: Config = {
  path: "/api/generate",
  method: ["POST"],
};
