import { MODULE_CATALOG } from "../../shared/configurator";
import type { ConfiguratorAnswers, CrmBlueprint } from "../../shared/types";

type Props = {
  answers: ConfiguratorAnswers;
  blueprint: CrmBlueprint | null;
  aiUsed: boolean;
  aiAvailable: boolean;
  generating: boolean;
  onEditAnswer?: (id: keyof ConfiguratorAnswers) => void;
  onToggleModule?: (name: string) => void;
};

const FACTS: { id: keyof ConfiguratorAnswers; label: string }[] = [
  { id: "industry", label: "Rubro" },
  { id: "teamSize", label: "Equipo" },
  { id: "salesMotion", label: "Venta" },
  { id: "primaryGoal", label: "Objetivo" },
];

export default function BlueprintPreview({
  answers,
  blueprint,
  aiUsed,
  aiAvailable,
  generating,
  onEditAnswer,
  onToggleModule,
}: Props) {
  const enabled = new Set(blueprint?.modules ?? []);

  return (
    <div className="preview">
      <div className="preview-header">
        <div className="preview-header-row">
          <h3>{answers.companyName ? answers.companyName : "Tu CRM a medida"}</h3>
          {onEditAnswer && answers.companyName && (
            <button type="button" className="linkish" onClick={() => onEditAnswer("companyName")}>
              Cambiar
            </button>
          )}
        </div>
        <p className="preview-sub">
          {blueprint ? "Configuración recomendada" : "La vista previa se completará mientras conversas"}
        </p>
      </div>

      <div className="facts">
        {FACTS.map((fact) => {
          const value = answers[fact.id];
          const text = typeof value === "string" ? value : "";
          return (
            <Fact
              key={fact.id}
              label={fact.label}
              value={text}
              onEdit={onEditAnswer && text ? () => onEditAnswer(fact.id) : undefined}
            />
          );
        })}
      </div>

      {generating && <div className="preview-loading">Diseñando módulos y pipeline…</div>}

      {blueprint && (
        <>
          <div className="plan-card">
            <span>Plan sugerido</span>
            <strong>{blueprint.recommendedPlan}</strong>
          </div>

          <Group title={`Módulos activados (${blueprint.modules.length})`}>
            {onToggleModule && (
              <p className="group-hint">Prende o apaga módulos antes de guardar. Tiene que quedar al menos uno.</p>
            )}
            <div className="tag-list">
              {(onToggleModule ? MODULE_CATALOG : blueprint.modules).map((name) =>
                onToggleModule ? (
                  <button
                    key={name}
                    type="button"
                    className={`tag module-toggle ${enabled.has(name) ? "on" : "off"}`}
                    aria-pressed={enabled.has(name)}
                    onClick={() => onToggleModule(name)}
                  >
                    {enabled.has(name) ? "✓ " : ""}
                    {name}
                  </button>
                ) : (
                  <span key={name} className="tag">
                    {name}
                  </span>
                ),
              )}
            </div>
          </Group>

          <Group title="Pipeline de ventas">
            <div className="pipeline">
              {blueprint.pipelineStages.map((stage, i) => (
                <span key={stage} className="stage">
                  <span className="stage-num">{i + 1}</span>
                  {stage}
                </span>
              ))}
            </div>
          </Group>

          {blueprint.customFields.length > 0 && (
            <Group title="Campos personalizados">
              <ul className="fields">
                {blueprint.customFields.map((field) => (
                  <li key={`${field.entity}-${field.name}`}>
                    <strong>{field.name}</strong> <em>({field.type})</em> · {field.entity}
                  </li>
                ))}
              </ul>
            </Group>
          )}

          {blueprint.automations.length > 0 && (
            <Group title={`Automatizaciones (${blueprint.automations.length})`}>
              <ul className="automations">
                {blueprint.automations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Group>
          )}

          <div className="ai-note">
            {aiUsed
              ? "Resumen redactado con IA (Netlify AI Gateway)."
              : aiAvailable
                ? "IA disponible; se usará al generar el resumen."
                : "Recomendación generada por el motor guiado. La IA se activa tras el primer deploy en producción."}
          </div>
        </>
      )}
    </div>
  );
}

function Fact({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div className={`fact ${value ? "filled" : ""}`}>
      <div className="fact-top">
        <span className="fact-label">{label}</span>
        {onEdit && (
          <button type="button" className="linkish" onClick={onEdit}>
            Cambiar
          </button>
        )}
      </div>
      <span className="fact-value">{value || "—"}</span>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="group">
      <h4>{title}</h4>
      {children}
    </div>
  );
}
