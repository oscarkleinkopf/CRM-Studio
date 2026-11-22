import { useEffect, useMemo, useRef, useState } from "react";
import { STEPS, type Step } from "../../shared/configurator";
import { MAX_COMPANY_NAME_LENGTH } from "../../shared/limits";
import type { ConfiguratorAnswers, CrmBlueprint } from "../../shared/types";
import { api } from "../api";
import { apiErrorMessage } from "../apiResult";
import BlueprintPreview from "../components/BlueprintPreview";
import { downloadConfig } from "../downloadConfig";

type Phase = "ask" | "generating" | "ready" | "error";

const emptyAnswers: ConfiguratorAnswers = {
  companyName: "",
  industry: "",
  teamSize: "",
  salesMotion: "",
  primaryGoal: "",
  monthlyLeads: "",
  integrations: [],
};

function fillTemplate(text: string, answers: ConfiguratorAnswers): string {
  return text.replace(/\{companyName\}/g, answers.companyName || "tu negocio");
}

function answerLabel(step: Step, answers: ConfiguratorAnswers): string {
  if (step.id === "integrations") {
    return answers.integrations.length ? answers.integrations.join(", ") : "Sin integraciones por ahora";
  }
  const value = answers[step.id];
  return typeof value === "string" ? value : "";
}

function clearStep(answers: ConfiguratorAnswers, id: keyof ConfiguratorAnswers): ConfiguratorAnswers {
  if (id === "integrations") return { ...answers, integrations: [] };
  return { ...answers, [id]: "" };
}

function buildTranscript(answers: ConfiguratorAnswers, stepIndex: number): { role: "bot" | "user"; text: string }[] {
  const messages: { role: "bot" | "user"; text: string }[] = [];
  const last = Math.min(stepIndex, STEPS.length - 1);
  for (let i = 0; i <= last; i += 1) {
    const step = STEPS[i];
    if (!step) continue;
    messages.push({ role: "bot", text: fillTemplate(step.question, answers) });
    if (i < stepIndex) {
      const label = answerLabel(step, answers);
      if (label) messages.push({ role: "user", text: label });
    }
  }
  return messages;
}

export default function StudioPage({ aiPowered }: { aiPowered: boolean }) {
  const [answers, setAnswers] = useState<ConfiguratorAnswers>(emptyAnswers);
  const [stepIndex, setStepIndex] = useState(0);
  const [revising, setRevising] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("ask");
  const [textInput, setTextInput] = useState("");
  const [multiSelected, setMultiSelected] = useState<string[]>([]);
  const [blueprint, setBlueprint] = useState<CrmBlueprint | null>(null);
  const [summary, setSummary] = useState("");
  const [aiUsed, setAiUsed] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const threadRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const transcript = useMemo(() => buildTranscript(answers, stepIndex), [answers, stepIndex]);
  const activeStep = revising !== null ? STEPS[revising] : STEPS[stepIndex];
  const showStep = revising !== null || phase === "ask";
  const progress = phase === "ask" ? Math.round((stepIndex / STEPS.length) * 100) : 100;

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript, phase, flash]);

  useEffect(() => {
    if (revising !== null) composerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [revising]);

  function commit(next: Partial<ConfiguratorAnswers>) {
    const updated = { ...answers, ...next };
    setAnswers(updated);
    setTextInput("");
    setMultiSelected([]);
    if (revising !== null || stepIndex >= STEPS.length) {
      setRevising(null);
      void generate(updated);
      return;
    }
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    if (nextIndex >= STEPS.length) void generate(updated);
  }

  async function generate(finalAnswers: ConfiguratorAnswers) {
    setPhase("generating");
    setFlash(null);
    setSaved(null);
    setBlueprint(null);
    try {
      const res = await api.generate(finalAnswers);
      setBlueprint(res.blueprint);
      setSummary(res.summary);
      setAiUsed(res.aiPowered);
      setPhase("ready");
    } catch (err) {
      setPhase("error");
      setFlash(apiErrorMessage(err, "No pude generar la configuración. Revisa la conexión e inténtalo otra vez."));
    }
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeStep || activeStep.kind !== "text") return;
    const value = textInput.trim();
    if (!value) return;
    commit({ [activeStep.id]: value } as Partial<ConfiguratorAnswers>);
  }

  function handleSingle(option: string) {
    if (!activeStep || activeStep.kind !== "single") return;
    commit({ [activeStep.id]: option } as Partial<ConfiguratorAnswers>);
  }

  function toggleMulti(option: string) {
    setMultiSelected((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    );
  }

  function confirmMulti() {
    commit({ integrations: multiSelected });
  }

  function goBack() {
    if (phase === "generating") return;
    if (revising !== null) {
      setRevising(null);
      setTextInput("");
      setMultiSelected([]);
      return;
    }
    if (stepIndex <= 0) return;
    const prev = stepIndex - 1;
    const step = STEPS[prev];
    if (!step) return;
    const previous = answers[step.id];
    setAnswers(clearStep(answers, step.id));
    setStepIndex(prev);
    setPhase("ask");
    setBlueprint(null);
    setSummary("");
    setSaved(null);
    setAiUsed(false);
    setFlash(null);
    if (step.kind === "text" && typeof previous === "string") setTextInput(previous);
    else setTextInput("");
    if (step.kind === "multi" && Array.isArray(previous)) setMultiSelected(previous);
    else setMultiSelected([]);
  }

  function startRevise(id: keyof ConfiguratorAnswers) {
    const index = STEPS.findIndex((step) => step.id === id);
    if (index < 0) return;
    const step = STEPS[index];
    if (!step) return;
    setRevising(index);
    setFlash(null);
    if (step.kind === "text") setTextInput(typeof answers[step.id] === "string" ? String(answers[step.id]) : "");
    else setTextInput("");
    setMultiSelected(step.kind === "multi" ? [...answers.integrations] : []);
  }

  function toggleModule(name: string) {
    if (!blueprint || saving) return;
    const enabled = new Set(blueprint.modules);
    if (enabled.has(name)) {
      if (enabled.size === 1) return;
      enabled.delete(name);
    } else {
      enabled.add(name);
    }
    setBlueprint({ ...blueprint, modules: [...enabled] });
    setSaved(null);
  }

  async function save() {
    if (!blueprint || phase !== "ready") return;
    setSaving(true);
    try {
      const row = await api.saveConfig({ answers, blueprint, summary });
      setBlueprint(row.blueprint);
      setSummary(row.summary);
      setSaved(row.id);
      setFlash(
        `Listo, guardé la configuración de ${row.companyName}. La encuentras en la pestaña "Configuraciones".`,
      );
    } catch (err) {
      setFlash(apiErrorMessage(err, "No pude guardar la configuración. Inténtalo de nuevo."));
    } finally {
      setSaving(false);
    }
  }

  function restart() {
    setAnswers(emptyAnswers);
    setStepIndex(0);
    setRevising(null);
    setPhase("ask");
    setTextInput("");
    setMultiSelected([]);
    setBlueprint(null);
    setSummary("");
    setAiUsed(false);
    setSaved(null);
    setFlash(null);
  }

  const exportable =
    blueprint && phase === "ready"
      ? {
          companyName: answers.companyName,
          industry: answers.industry,
          teamSize: answers.teamSize,
          salesMotion: answers.salesMotion,
          primaryGoal: answers.primaryGoal,
          monthlyLeads: answers.monthlyLeads,
          integrations: answers.integrations,
          blueprint,
          summary,
        }
      : null;

  return (
    <div className="studio">
      <section className="chat-panel">
        <div className="chat-head">
          <div className="assistant-avatar">◈</div>
          <div>
            <h2>Estudio, tu asistente de CRM</h2>
            <p>Responde unas preguntas y armo tu CRM ideal.</p>
          </div>
        </div>

        <div className="progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="thread" ref={threadRef}>
          {transcript.map((msg, i) => (
            <div key={i} className={`bubble ${msg.role}`}>
              {msg.text}
            </div>
          ))}
          {phase === "generating" && (
            <div className="bubble bot typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
          {phase === "ready" && summary && <div className="bubble bot">{summary}</div>}
          {flash && <div className="bubble bot">{flash}</div>}
        </div>

        <div className="composer" ref={composerRef}>
          {(stepIndex > 0 || revising !== null) && phase !== "generating" && (
            <div className="composer-nav">
              <button type="button" className="ghost" onClick={goBack}>
                {revising !== null ? "Cancelar cambio" : "Volver"}
              </button>
            </div>
          )}

          {revising !== null && <p className="revise-hint">Cambia esta respuesta y vuelvo a armar el CRM.</p>}

          {showStep && activeStep?.kind === "text" && (
            <form onSubmit={handleTextSubmit} className="text-composer">
              <input
                autoFocus
                value={textInput}
                maxLength={activeStep.id === "companyName" ? MAX_COMPANY_NAME_LENGTH : undefined}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={activeStep.placeholder ?? "Escribe tu respuesta…"}
              />
              <button type="submit" disabled={!textInput.trim()}>
                Enviar
              </button>
            </form>
          )}

          {showStep && activeStep?.kind === "single" && (
            <div className="chips">
              {activeStep.options?.map((opt) => (
                <button key={opt} type="button" className="chip" onClick={() => handleSingle(opt)}>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {showStep && activeStep?.kind === "multi" && (
            <div className="multi">
              <div className="chips">
                {activeStep.options?.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`chip ${multiSelected.includes(opt) ? "chip-on" : ""}`}
                    onClick={() => toggleMulti(opt)}
                  >
                    {multiSelected.includes(opt) ? "✓ " : ""}
                    {opt}
                  </button>
                ))}
              </div>
              <button type="button" className="primary" onClick={confirmMulti}>
                {multiSelected.length ? `Continuar con ${multiSelected.length}` : "No conectar nada por ahora"}
              </button>
            </div>
          )}

          {phase === "error" && (
            <div className="done-actions">
              <button type="button" className="primary" onClick={() => void generate(answers)}>
                Reintentar
              </button>
            </div>
          )}

          {phase === "ready" && blueprint && revising === null && (
            <div className="done-actions">
              {saved ? (
                <span className="saved-pill">✓ Guardada (#{saved})</span>
              ) : (
                <button type="button" className="primary" onClick={() => void save()} disabled={saving}>
                  {saving ? "Guardando…" : "Guardar configuración"}
                </button>
              )}
              {exportable && (
                <>
                  <button type="button" className="ghost" onClick={() => downloadConfig(exportable, "json")}>
                    Descargar JSON
                  </button>
                  <button type="button" className="ghost" onClick={() => downloadConfig(exportable, "txt")}>
                    Descargar texto
                  </button>
                </>
              )}
              <button type="button" className="ghost" onClick={restart}>
                Empezar de nuevo
              </button>
            </div>
          )}
        </div>
      </section>

      <aside className="preview-panel">
        <BlueprintPreview
          answers={answers}
          blueprint={blueprint}
          aiUsed={aiUsed}
          aiAvailable={aiPowered}
          generating={phase === "generating"}
          onEditAnswer={phase === "ready" && revising === null ? startRevise : undefined}
          onToggleModule={phase === "ready" && revising === null ? toggleModule : undefined}
        />
      </aside>
    </div>
  );
}
