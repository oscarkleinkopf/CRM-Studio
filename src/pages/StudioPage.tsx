import { useEffect, useMemo, useRef, useState } from "react";
import { STEPS } from "../../shared/configurator";
import type { ConfiguratorAnswers, CrmBlueprint } from "../../shared/types";
import { api } from "../api";
import BlueprintPreview from "../components/BlueprintPreview";

type Message = { role: "bot" | "user"; text: string };

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

export default function StudioPage({ aiPowered }: { aiPowered: boolean }) {
  const [answers, setAnswers] = useState<ConfiguratorAnswers>(emptyAnswers);
  const [stepIndex, setStepIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([{ role: "bot", text: STEPS[0].question }]);
  const [textInput, setTextInput] = useState("");
  const [multiSelected, setMultiSelected] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [blueprint, setBlueprint] = useState<CrmBlueprint | null>(null);
  const [summary, setSummary] = useState("");
  const [aiUsed, setAiUsed] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const threadRef = useRef<HTMLDivElement>(null);
  const step = STEPS[stepIndex];
  const done = stepIndex >= STEPS.length;

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, generating]);

  const progress = useMemo(() => Math.round((Math.min(stepIndex, STEPS.length) / STEPS.length) * 100), [stepIndex]);

  function advance(next: Partial<ConfiguratorAnswers>, userText: string) {
    const updated = { ...answers, ...next };
    setAnswers(updated);
    setMessages((m) => [...m, { role: "user", text: userText }]);

    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);

    if (nextIndex < STEPS.length) {
      const q = fillTemplate(STEPS[nextIndex].question, updated);
      setMessages((m) => [...m, { role: "bot", text: q }]);
    } else {
      void generate(updated);
    }
  }

  async function generate(finalAnswers: ConfiguratorAnswers) {
    setGenerating(true);
    setMessages((m) => [...m, { role: "bot", text: "Perfecto, estoy diseñando tu CRM a medida…" }]);
    try {
      const res = await api.generate(finalAnswers);
      setBlueprint(res.blueprint);
      setSummary(res.summary);
      setAiUsed(res.aiPowered);
      setMessages((m) => [...m, { role: "bot", text: res.summary }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "bot", text: "Ups, no pude generar la configuración. Revisa la conexión e inténtalo otra vez." },
      ]);
    } finally {
      setGenerating(false);
    }
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = textInput.trim();
    if (!value) return;
    setTextInput("");
    advance({ [step.id]: value } as Partial<ConfiguratorAnswers>, value);
  }

  function handleSingle(option: string) {
    advance({ [step.id]: option } as Partial<ConfiguratorAnswers>, option);
  }

  function toggleMulti(option: string) {
    setMultiSelected((s) => (s.includes(option) ? s.filter((x) => x !== option) : [...s, option]));
  }

  function confirmMulti() {
    const label = multiSelected.length ? multiSelected.join(", ") : "Sin integraciones por ahora";
    advance({ integrations: multiSelected }, label);
    setMultiSelected([]);
  }

  async function save() {
    if (!blueprint) return;
    setSaving(true);
    try {
      const row = await api.saveConfig({ answers, blueprint, summary });
      setSaved(row.id);
      setMessages((m) => [
        ...m,
        { role: "bot", text: `Listo, guardé la configuración de ${answers.companyName}. La encuentras en la pestaña "Configuraciones".` },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "No pude guardar la configuración. Inténtalo de nuevo." }]);
    } finally {
      setSaving(false);
    }
  }

  function restart() {
    setAnswers(emptyAnswers);
    setStepIndex(0);
    setMessages([{ role: "bot", text: STEPS[0].question }]);
    setBlueprint(null);
    setSummary("");
    setSaved(null);
    setMultiSelected([]);
  }

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
          {messages.map((msg, i) => (
            <div key={i} className={`bubble ${msg.role}`}>
              {msg.text}
            </div>
          ))}
          {generating && (
            <div className="bubble bot typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
        </div>

        <div className="composer">
          {!done && step?.kind === "text" && (
            <form onSubmit={handleTextSubmit} className="text-composer">
              <input
                autoFocus
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={step.placeholder ?? "Escribe tu respuesta…"}
              />
              <button type="submit" disabled={!textInput.trim()}>
                Enviar
              </button>
            </form>
          )}

          {!done && step?.kind === "single" && (
            <div className="chips">
              {step.options?.map((opt) => (
                <button key={opt} className="chip" onClick={() => handleSingle(opt)}>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {!done && step?.kind === "multi" && (
            <div className="multi">
              <div className="chips">
                {step.options?.map((opt) => (
                  <button
                    key={opt}
                    className={`chip ${multiSelected.includes(opt) ? "chip-on" : ""}`}
                    onClick={() => toggleMulti(opt)}
                  >
                    {multiSelected.includes(opt) ? "✓ " : ""}
                    {opt}
                  </button>
                ))}
              </div>
              <button className="primary" onClick={confirmMulti}>
                {multiSelected.length ? `Continuar con ${multiSelected.length}` : "No conectar nada por ahora"}
              </button>
            </div>
          )}

          {done && blueprint && (
            <div className="done-actions">
              {saved ? (
                <span className="saved-pill">✓ Guardada (#{saved})</span>
              ) : (
                <button className="primary" onClick={save} disabled={saving}>
                  {saving ? "Guardando…" : "Guardar configuración"}
                </button>
              )}
              <button className="ghost" onClick={restart}>
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
          generating={generating}
        />
      </aside>
    </div>
  );
}
