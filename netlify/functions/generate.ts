import type { Config, Context } from "@netlify/functions";
import { buildBlueprint, fallbackSummary, validateAnswers } from "../../shared/configurator";
import type { GenerateResponse } from "../../shared/types";
import { generateAiSummary } from "./_shared/ai";

export default async (req: Request, _context: Context) => {
  const body = await req.json().catch(() => ({}));
  const answers = validateAnswers(body?.answers);
  const blueprint = buildBlueprint(answers);

  const aiSummary = await generateAiSummary(answers, blueprint);
  const response: GenerateResponse = {
    blueprint,
    summary: aiSummary ?? fallbackSummary(answers, blueprint),
    aiPowered: Boolean(aiSummary),
  };

  return Response.json(response);
};

export const config: Config = {
  path: "/api/generate",
  method: ["POST"],
};
