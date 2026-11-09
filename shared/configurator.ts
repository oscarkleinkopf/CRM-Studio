import { MAX_COMPANY_NAME_LENGTH, MAX_SUMMARY_LENGTH } from "./limits";
import type { ConfiguratorAnswers, CrmBlueprint, CustomField } from "./types";

export type Step = {
  id: keyof ConfiguratorAnswers;
  question: string;
  kind: "text" | "single" | "multi";
  options?: string[];
  placeholder?: string;
};

/**
 * The guided conversation the assistant walks every business owner through.
 * Kept declarative so the same flow drives the chat UI and server validation.
 */
export const STEPS: Step[] = [
  {
    id: "companyName",
    kind: "text",
    question:
      "¡Hola! Soy Estudio, tu asistente de CRM Studio. Voy a armarte un CRM a la medida de tu negocio en unos pocos pasos. Para empezar, ¿cómo se llama tu empresa o proyecto?",
    placeholder: "Ej. Panadería La Espiga",
  },
  {
    id: "industry",
    kind: "single",
    question: "Genial. ¿A qué rubro se dedica {companyName}?",
    options: [
      "Servicios profesionales",
      "Retail / eCommerce",
      "Software / SaaS",
      "Inmobiliaria",
      "Salud y bienestar",
      "Educación",
      "Manufactura",
      "Otro",
    ],
  },
  {
    id: "teamSize",
    kind: "single",
    question: "¿Cuántas personas forman tu equipo?",
    options: ["Solo yo", "2 a 5", "6 a 20", "21 a 50", "Más de 50"],
  },
  {
    id: "salesMotion",
    kind: "single",
    question: "¿Cómo vendes principalmente?",
    options: [
      "Contacto directo / consultivo",
      "eCommerce / autoservicio",
      "Suscripciones / recurrente",
      "Proyectos y cotizaciones",
      "Mixto",
    ],
  },
  {
    id: "primaryGoal",
    kind: "single",
    question: "¿Cuál es tu prioridad número uno con el CRM?",
    options: [
      "Conseguir más clientes",
      "Ordenar mi pipeline de ventas",
      "Fidelizar y dar postventa",
      "Automatizar tareas repetitivas",
      "Tener reportes y métricas",
    ],
  },
  {
    id: "monthlyLeads",
    kind: "single",
    question: "¿Cuántos prospectos nuevos manejas al mes, aproximadamente?",
    options: ["Menos de 20", "20 a 100", "100 a 500", "Más de 500"],
  },
  {
    id: "integrations",
    kind: "multi",
    question:
      "Por último, ¿qué herramientas te gustaría conectar? Puedes elegir varias.",
    options: [
      "WhatsApp",
      "Email marketing",
      "Facebook / Instagram",
      "Google Calendar",
      "Facturación",
      "Formularios del sitio web",
    ],
  },
];

const INDUSTRY_FIELDS: Record<string, CustomField[]> = {
  "Servicios profesionales": [
    { entity: "Contacto", name: "Tipo de servicio", type: "selección" },
    { entity: "Oportunidad", name: "Horas estimadas", type: "número" },
  ],
  "Retail / eCommerce": [
    { entity: "Contacto", name: "Ticket promedio", type: "moneda" },
    { entity: "Contacto", name: "Cliente recurrente", type: "booleano" },
  ],
  "Software / SaaS": [
    { entity: "Oportunidad", name: "Plan de interés", type: "selección" },
    { entity: "Oportunidad", name: "MRR estimado", type: "moneda" },
  ],
  Inmobiliaria: [
    { entity: "Oportunidad", name: "Zona de interés", type: "texto" },
    { entity: "Oportunidad", name: "Presupuesto", type: "moneda" },
  ],
  "Salud y bienestar": [
    { entity: "Contacto", name: "Próxima cita", type: "fecha" },
    { entity: "Contacto", name: "Tratamiento", type: "selección" },
  ],
  Educación: [
    { entity: "Contacto", name: "Programa de interés", type: "selección" },
    { entity: "Contacto", name: "Fecha de inscripción", type: "fecha" },
  ],
  Manufactura: [
    { entity: "Oportunidad", name: "Volumen estimado", type: "número" },
    { entity: "Oportunidad", name: "Plazo de entrega", type: "fecha" },
  ],
};

const SALES_STAGES: Record<string, string[]> = {
  "Contacto directo / consultivo": [
    "Nuevo",
    "Contactado",
    "Reunión agendada",
    "Propuesta enviada",
    "Negociación",
    "Ganado",
    "Perdido",
  ],
  "eCommerce / autoservicio": [
    "Carrito iniciado",
    "Carrito abandonado",
    "Compra realizada",
    "Recompra",
  ],
  "Suscripciones / recurrente": [
    "Prueba gratis",
    "Activación",
    "Suscripción activa",
    "En riesgo (churn)",
    "Renovado",
  ],
  "Proyectos y cotizaciones": [
    "Solicitud recibida",
    "Relevamiento",
    "Cotización enviada",
    "Ajustes",
    "Adjudicado",
    "En ejecución",
    "Cerrado",
  ],
  Mixto: [
    "Nuevo",
    "Calificado",
    "Propuesta",
    "Negociación",
    "Ganado",
    "Perdido",
  ],
};

function planFor(teamSize: string, monthlyLeads: string): string {
  if (teamSize === "Solo yo" && (monthlyLeads === "Menos de 20" || monthlyLeads === "20 a 100")) {
    return "Starter (ideal para emprendedores)";
  }
  if (teamSize === "Más de 50" || monthlyLeads === "Más de 500") {
    return "Scale (equipos grandes y alto volumen)";
  }
  return "Growth (PYMES en crecimiento)";
}

/**
 * Deterministic recommendation engine: turns the collected answers into a
 * concrete, tailored CRM blueprint. This is the source of truth and runs with
 * or without the AI Gateway available.
 */
export function buildBlueprint(answers: ConfiguratorAnswers): CrmBlueprint {
  const modules = new Set<string>(["Contactos", "Empresas", "Oportunidades", "Actividades y tareas"]);
  const automations = new Set<string>();

  const stages = SALES_STAGES[answers.salesMotion] ?? SALES_STAGES["Mixto"];

  const customFields: CustomField[] = [...(INDUSTRY_FIELDS[answers.industry] ?? [])];

  switch (answers.primaryGoal) {
    case "Conseguir más clientes":
      modules.add("Captura de leads");
      modules.add("Campañas");
      automations.add("Asignación automática de nuevos leads a un responsable");
      break;
    case "Ordenar mi pipeline de ventas":
      modules.add("Pipeline visual (Kanban)");
      modules.add("Pronóstico de ventas");
      automations.add("Recordatorio cuando una oportunidad lleva 7 días sin actividad");
      break;
    case "Fidelizar y dar postventa":
      modules.add("Tickets de soporte");
      modules.add("Encuestas de satisfacción (NPS)");
      automations.add("Seguimiento automático de postventa a los 15 días");
      break;
    case "Automatizar tareas repetitivas":
      modules.add("Automatizaciones");
      modules.add("Plantillas de mensajes");
      automations.add("Secuencia de bienvenida automática para cada nuevo contacto");
      break;
    case "Tener reportes y métricas":
      modules.add("Dashboards y reportes");
      modules.add("Metas del equipo");
      automations.add("Reporte semanal de ventas enviado por email");
      break;
  }

  for (const tool of answers.integrations) {
    switch (tool) {
      case "WhatsApp":
        modules.add("Bandeja de WhatsApp");
        automations.add("Registrar cada conversación de WhatsApp en el contacto");
        break;
      case "Email marketing":
        modules.add("Email marketing");
        break;
      case "Facebook / Instagram":
        modules.add("Leads de redes sociales");
        automations.add("Importar automáticamente leads de formularios de Meta");
        break;
      case "Google Calendar":
        modules.add("Agenda y citas");
        break;
      case "Facturación":
        modules.add("Cotizaciones y facturas");
        break;
      case "Formularios del sitio web":
        modules.add("Formularios web");
        automations.add("Crear un contacto automáticamente desde el formulario del sitio");
        break;
    }
  }

  return {
    modules: [...modules],
    pipelineStages: stages,
    customFields,
    automations: [...automations],
    integrations: answers.integrations,
    recommendedPlan: planFor(answers.teamSize, answers.monthlyLeads),
  };
}

export function fallbackSummary(answers: ConfiguratorAnswers, blueprint: CrmBlueprint): string {
  const tools =
    answers.integrations.length > 0 ? answers.integrations.join(", ") : "ninguna integración por ahora";
  return (
    `Diseñé un CRM para ${answers.companyName} (${answers.industry.toLowerCase()}). ` +
    `Con un equipo de "${answers.teamSize.toLowerCase()}" y una venta ${answers.salesMotion.toLowerCase()}, ` +
    `armé un pipeline de ${blueprint.pipelineStages.length} etapas y activé ${blueprint.modules.length} módulos ` +
    `enfocados en "${answers.primaryGoal.toLowerCase()}". Conecté: ${tools}. ` +
    `Te recomiendo el plan ${blueprint.recommendedPlan}.`
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function optionOrDefault(
  id: keyof ConfiguratorAnswers,
  value: unknown,
  fallback: string,
): string {
  const step = STEPS.find((s) => s.id === id);
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (step?.options?.length) {
    return step.options.includes(trimmed) ? trimmed : fallback;
  }
  return trimmed || fallback;
}

export function validateAnswers(input: unknown): ConfiguratorAnswers {
  const a = asRecord(input);
  const companyRaw = typeof a.companyName === "string" ? a.companyName.trim() : "";
  const companyName = companyRaw.slice(0, MAX_COMPANY_NAME_LENGTH) || "Mi empresa";
  const allowedIntegrations = new Set(STEPS.find((s) => s.id === "integrations")?.options ?? []);
  const integrations = Array.isArray(a.integrations)
    ? [
        ...new Set(
          a.integrations.filter((x): x is string => typeof x === "string" && allowedIntegrations.has(x)),
        ),
      ]
    : [];
  return {
    companyName,
    industry: optionOrDefault("industry", a.industry, "Otro"),
    teamSize: optionOrDefault("teamSize", a.teamSize, "Solo yo"),
    salesMotion: optionOrDefault("salesMotion", a.salesMotion, "Mixto"),
    primaryGoal: optionOrDefault("primaryGoal", a.primaryGoal, "Ordenar mi pipeline de ventas"),
    monthlyLeads: optionOrDefault("monthlyLeads", a.monthlyLeads, "20 a 100"),
    integrations,
  };
}

export function sanitizeSummary(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_SUMMARY_LENGTH);
}

export function prepareGeneration(body: unknown): {
  answers: ConfiguratorAnswers;
  blueprint: CrmBlueprint;
} {
  const answers = validateAnswers(asRecord(body).answers);
  return { answers, blueprint: buildBlueprint(answers) };
}

export function prepareSavedConfig(body: unknown): {
  answers: ConfiguratorAnswers;
  blueprint: CrmBlueprint;
  summary: string;
} {
  const record = asRecord(body);
  const { answers, blueprint } = prepareGeneration(record);
  const summary = sanitizeSummary(record.summary) || fallbackSummary(answers, blueprint);
  return { answers, blueprint, summary };
}

export function monthlyLeadsToNumber(bucket: string): number {
  switch (bucket) {
    case "Menos de 20":
      return 20;
    case "20 a 100":
      return 100;
    case "100 a 500":
      return 500;
    case "Más de 500":
      return 1000;
    default:
      return 0;
  }
}
