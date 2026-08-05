import { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { api, type Health } from "./api";
import StudioPage from "./pages/StudioPage";
import SavedPage from "./pages/SavedPage";

function badgeClass(h: Health): string {
  if (h.mode === "static") return "badge-guided";
  return h.aiPowered ? "badge-ai" : "badge-guided";
}

function badgeLabel(h: Health): string {
  if (h.mode === "static") return "Modo estático (GitHub Pages)";
  return h.aiPowered ? "IA avanzada activa" : "Modo asistente guiado";
}

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-logo">◈</span>
          <span>
            CRM<span className="brand-accent">Studio</span>
          </span>
        </Link>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Diseñar
          </NavLink>
          <NavLink to="/configuraciones" className={({ isActive }) => (isActive ? "active" : "")}>
            Configuraciones
          </NavLink>
        </nav>
        <div className="status">
          {health ? (
            <span className={`badge ${badgeClass(health)}`}>{badgeLabel(health)}</span>
          ) : (
            <span className="badge badge-off">Conectando…</span>
          )}
        </div>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<StudioPage aiPowered={health?.aiPowered ?? false} />} />
          <Route path="/configuraciones" element={<SavedPage />} />
        </Routes>
      </main>
    </div>
  );
}
