import type { ConfiguratorAnswers, CrmBlueprint } from "../../shared/types";

type Props = {
  answers: ConfiguratorAnswers;
  blueprint: CrmBlueprint | null;
  aiUsed: boolean;
  aiAvailable: boolean;
  generating: boolean;
};

export default function BlueprintPreview({ answers, blueprint, aiUsed, aiAvailable, generating }: Props) {
  return (
    <div className="preview">
      <div className="preview-header">
        <h3>{answers.companyName ? answers.companyName : "Tu CRM a medida"}</h3>
        <p className="preview-sub">
          {blueprint ? "Configuración recomendada" : "La vista previa se completará mientras conversas"}
        </p>
      </div>

      <div className="facts">
        <Fact label="Rubro" value={answers.industry} />
        <Fact label="Equipo" value={answers.teamSize} />
        <Fact label="Venta" value={answers.salesMotion} />
        <Fact label="Objetivo" value={answers.primaryGoal} />
      </div>

      {generating && <div className="preview-loading">Diseñando módulos y pipeline…</div>}

      {blueprint && (
        <>
          <div className="plan-card">
            <span>Plan sugerido</span>
            <strong>{blueprint.recommendedPlan}</strong>
          </div>

          <Group title={`Módulos activados (${blueprint.modules.length})`}>
            <div className="tag-list">
              {blueprint.modules.map((m) => (
                <span key={m} className="tag">
                  {m}
                </span>
              ))}
            </div>
          </Group>

          <Group title="Pipeline de ventas">
            <div className="pipeline">
              {blueprint.pipelineStages.map((s, i) => (
                <span key={s} className="stage">
                  <span className="stage-num">{i + 1}</span>
                  {s}
                </span>
              ))}
            </div>
          </Group>

          {blueprint.customFields.length > 0 && (
            <Group title="Campos personalizados">
              <ul className="fields">
                {blueprint.customFields.map((f) => (
                  <li key={`${f.entity}-${f.name}`}>
                    <strong>{f.name}</strong> <em>({f.type})</em> · {f.entity}
                  </li>
                ))}
              </ul>
            </Group>
          )}

          {blueprint.automations.length > 0 && (
            <Group title={`Automatizaciones (${blueprint.automations.length})`}>
              <ul className="automations">
                {blueprint.automations.map((a) => (
                  <li key={a}>{a}</li>
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={`fact ${value ? "filled" : ""}`}>
      <span className="fact-label">{label}</span>
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
