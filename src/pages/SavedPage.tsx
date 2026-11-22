import { useEffect, useState } from "react";
import { api, type SavedConfig, type Stats } from "../api";
import { apiErrorMessage } from "../apiResult";
import { downloadConfig } from "../downloadConfig";

export default function SavedPage() {
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selected, setSelected] = useState<SavedConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [list, s] = await Promise.all([api.listConfigs(), api.stats()]);
      setConfigs(list);
      setStats(s);
      setSelected((prev) => (prev ? (list.find((row) => row.id === prev.id) ?? list[0] ?? null) : (list[0] ?? null)));
    } catch (err) {
      setError(apiErrorMessage(err, "No pude cargar las configuraciones."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, []);

  async function remove(id: number) {
    setError(null);
    try {
      await api.deleteConfig(id);
      setSelected(null);
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err, "No pude eliminar la configuración."));
    }
  }

  if (loading) return <div className="loading">Cargando configuraciones…</div>;

  return (
    <div className="saved">
      {error && <div className="banner-error">{error}</div>}
      {stats && (
        <div className="stat-row">
          <StatCard label="Configuraciones creadas" value={stats.totalConfigs} />
          <StatCard label="Leads/mes combinados" value={stats.totalMonthlyLeads.toLocaleString("es")} />
          <StatCard label="Rubros distintos" value={Object.keys(stats.byIndustry).length} />
        </div>
      )}

      {configs.length === 0 ? (
        <div className="empty">
          Todavía no hay configuraciones guardadas. Ve a <strong>Diseñar</strong> y crea la primera.
        </div>
      ) : (
        <div className="saved-grid">
          <ul className="config-list">
            {configs.map((c) => (
              <li
                key={c.id}
                className={selected?.id === c.id ? "active" : ""}
                onClick={() => setSelected(c)}
              >
                <div className="config-name">{c.companyName}</div>
                <div className="config-meta">
                  {c.industry} · {c.blueprint.modules.length} módulos
                </div>
              </li>
            ))}
          </ul>

          {selected && (
            <div className="config-detail">
              <div className="detail-head">
                <div>
                  <h2>{selected.companyName}</h2>
                  <p>
                    {selected.industry} · {selected.teamSize} · {selected.salesMotion}
                  </p>
                </div>
                <div className="detail-actions">
                  <button type="button" className="ghost" onClick={() => downloadConfig(selected, "json")}>
                    Descargar JSON
                  </button>
                  <button type="button" className="ghost" onClick={() => downloadConfig(selected, "txt")}>
                    Descargar texto
                  </button>
                  <button type="button" className="danger" onClick={() => void remove(selected.id)}>
                    Eliminar
                  </button>
                </div>
              </div>

              <p className="detail-summary">{selected.summary}</p>

              <div className="plan-card">
                <span>Plan sugerido</span>
                <strong>{selected.blueprint.recommendedPlan}</strong>
              </div>

              <h4>Módulos</h4>
              <div className="tag-list">
                {selected.blueprint.modules.map((m) => (
                  <span key={m} className="tag">
                    {m}
                  </span>
                ))}
              </div>

              <h4>Pipeline</h4>
              <div className="pipeline">
                {selected.blueprint.pipelineStages.map((s, i) => (
                  <span key={s} className="stage">
                    <span className="stage-num">{i + 1}</span>
                    {s}
                  </span>
                ))}
              </div>

              {selected.blueprint.automations.length > 0 && (
                <>
                  <h4>Automatizaciones</h4>
                  <ul className="automations">
                    {selected.blueprint.automations.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
