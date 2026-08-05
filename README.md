# CRM Studio

**CRM Studio** es una plataforma donde PYMES y emprendedores arman, conversando con un chatbot, la
configuración de un CRM a la medida de su negocio. El asistente ("Estudio") hace unas pocas preguntas
—rubro, tamaño de equipo, forma de vender, objetivo principal, volumen de leads e integraciones— y
genera un **blueprint** concreto: módulos activados, etapas del pipeline, campos personalizados,
automatizaciones y el plan recomendado. Cada configuración se puede guardar y consultar después.

## Stack

- **Frontend:** Vite + React 19 + TypeScript (SPA con React Router).
- **Backend:** Netlify Functions (sintaxis moderna `export default` + `Config`).
- **Base de datos:** Netlify Database (Postgres administrado) con Drizzle ORM.
- **IA (opcional):** Netlify AI Gateway vía el SDK de OpenAI, con degradación elegante.
- **Deploy:** Netlify.

## Arquitectura

```
index.html ─ src/            → SPA de React (chat + vista previa + configuraciones guardadas)
netlify/functions/           → API REST
  ├─ health.ts               → GET  /api/health        estado de DB + IA
  ├─ generate.ts             → POST /api/generate       arma el blueprint (motor + IA opcional)
  ├─ configs.ts              → GET/POST /api/configs     lista y guarda configuraciones
  ├─ config-detail.ts        → GET/DELETE /api/configs/:id
  ├─ stats.ts                → GET  /api/stats           métricas del dashboard
  └─ _shared/ai.ts           → helper del AI Gateway (con fallback)
shared/                      → lógica de dominio compartida frontend ⇄ backend
  ├─ types.ts                → tipos (ConfiguratorAnswers, CrmBlueprint, …)
  └─ configurator.ts         → flujo de preguntas + motor de recomendación determinista
db/                          → capa Drizzle (schema.ts, index.ts)
netlify/database/migrations/ → migraciones aplicadas por el deploy
```

El **motor de recomendación** (`shared/configurator.ts`) es la fuente de verdad y es determinista:
funciona con o sin IA. El AI Gateway solo se usa para redactar el resumen en lenguaje natural y **se
activa recién después del primer deploy a producción** (limitación de la plataforma), por eso en local
la app corre en "modo asistente guiado".

## Desarrollo local

Requisitos: Node 22+.

```bash
npm install                      # instala dependencias
npm run db:migrate               # aplica migraciones a la base local embebida
npm run dev                      # levanta Vite + Netlify (funciones, DB, env) en http://localhost:5173
```

El plugin `@netlify/vite-plugin` expone las Netlify Functions y una base Postgres **local embebida**
(no toca producción; los datos viven en `.netlify/`). No hace falta `netlify dev` como wrapper.

### Comprobación rápida (end to end)

```bash
curl localhost:5173/api/health
curl -s -X POST localhost:5173/api/generate -H 'content-type: application/json' \
  -d '{"answers":{"companyName":"Panadería La Espiga","industry":"Retail / eCommerce","teamSize":"2 a 5","salesMotion":"eCommerce / autoservicio","primaryGoal":"Fidelizar y dar postventa","monthlyLeads":"20 a 100","integrations":["WhatsApp","Email marketing"]}}'
```

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (Vite + Netlify primitives). |
| `npm run build` | `tsc -b && vite build` → salida en `dist/`. |
| `npm run typecheck` | Chequeo de tipos sin emitir. |
| `npm run db:generate` | Genera una migración a partir de `db/schema.ts`. |
| `npm run db:migrate` | Aplica migraciones **a la base local** (`netlify database migrations apply`). |

## Base de datos (flujo de cambios)

1. Edita `db/schema.ts`.
2. `npm run db:generate` → crea el archivo en `netlify/database/migrations/`.
3. Revisa el SQL.
4. `npm run db:migrate` → aplica a la base local para probar.
5. Commitea schema + migración juntos. **El deploy aplica las migraciones** a preview y producción.

> Nunca corras `drizzle-kit migrate`/`push` contra una base hosteada ni ejecutes DDL por
> `netlify database connect`. Los cambios de esquema van siempre por archivos de migración.

## Deploy en Netlify

`netlify.toml` ya define el build (`npm run build`, publish `dist/`) y el fallback SPA. Con
`@netlify/database` en las dependencias, Netlify aprovisiona Postgres en el primer deploy. Para activar
el chatbot con IA, habilita **AI** en el sitio y publica a producción una vez.

## Para otros bots programadores

Lee [`AGENTS.md`](./AGENTS.md): convenciones, cómo correr y testear, el flujo de la base de datos y las
reglas de la plataforma Netlify que debes respetar.
