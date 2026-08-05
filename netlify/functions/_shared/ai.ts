import OpenAI from "openai";
import type { ConfiguratorAnswers, CrmBlueprint } from "../../../shared/types";

/**
 * The Netlify AI Gateway injects OPENAI_BASE_URL + a placeholder OPENAI_API_KEY
 * only after a site's first production deploy. When those are present we use the
 * real model; otherwise callers fall back to the deterministic engine so the
 * product works locally and offline.
 */
export function isAiAvailable(): boolean {
  const base = Netlify.env.get("OPENAI_BASE_URL");
  const key = Netlify.env.get("OPENAI_API_KEY");
  return Boolean(base && key);
}

export async function generateAiSummary(
  answers: ConfiguratorAnswers,
  blueprint: CrmBlueprint,
): Promise<string | null> {
  if (!isAiAvailable()) return null;
  try {
    const openai = new OpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres un consultor de CRM para PYMES. Explica de forma cálida y breve (máx. 4 frases, en español) por qué la configuración propuesta encaja con el negocio. No inventes funciones que no estén en la lista.",
        },
        {
          role: "user",
          content: JSON.stringify({ answers, blueprint }),
        },
      ],
      max_tokens: 300,
    });
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("AI summary failed, falling back:", err);
    return null;
  }
}
