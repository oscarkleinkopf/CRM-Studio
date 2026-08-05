# AGENTS.md — Guía para bots programadores de CRM Studio

Instrucciones operativas para agentes de código que trabajen en este repo. Léelas antes de editar.
Prioriza siempre las instrucciones directas del usuario y del sistema por sobre este archivo.

## Qué es este proyecto

CRM Studio: un chatbot ("Estudio") que arma la configuración de un CRM a medida para PYMES y
emprendedores. El usuario responde preguntas y el sistema genera un `CrmBlueprint` (módulos, etapas de
pipeline, campos personalizados, automatizaciones, plan). Las configuraciones se guardan en Postgres.

## Stack y estructura

- Vite + React 19 + TypeScript (SPA) en `src/`.
- Netlify Functions en `netlify/functions/` (API REST bajo `/api/*`).
- Netlify Database (Postgres) + Drizzle ORM en `db/`.
- Lógica de dominio **compartida** frontend/backend en `shared/`.
- Netlify AI Gateway (SDK de OpenAI) en `netlify/functions/_shared/ai.ts`, con fallback.

Mapa completo en el `README.md`.

## Cómo correr y verificar

```bash
npm install
npm run db:migrate      # aplica migraciones a la base local embebida
npm run dev             # http://localhost:5173  (Vite + funciones + DB + env)
npm run typecheck       # obligatorio antes de commitear
npm run build           # obligatorio antes de commitear
```

Smoke test de la API (ver ejemplos en el `README.md`): `GET /api/health`, `POST /api/generate`,
`GET/POST /api/configs`, `GET /api/stats`.

## Reglas de la plataforma Netlify (no romper)

1. **Funciones:** usa siempre la sintaxis moderna `export default async (req, context) => Response` +
   `export const config: Config = { path, method }`. Nunca `exports.handler`.
2. **Env vars en funciones:** usa `Netlify.env.get("VAR")`, **no** `process.env`.
3. **Secretos:** nunca hardcodees claves. Para el AI Gateway **no** definas `OPENAI_API_KEY` propia:
   Netlify inyecta base URL + key placeholder automáticamente. Definir una key propia rompe el gateway.
4. **AI Gateway:** solo se activa tras el primer deploy a producción. En local no hay IA: el código
   debe degradar al motor determinista (ver `_shared/ai.ts` → `isAiAvailable()`). Usa solo modelos de
   la lista soportada por el gateway.
5. **`.netlify` está en `.gitignore`.** No lo commitees.

## Base de datos con Drizzle (flujo estricto)

- El esquema vive en `db/schema.ts` (fuente de verdad). Nombres de columna en `snake_case`.
- Para cambiar el esquema: editar `db/schema.ts` → `npm run db:generate` → revisar SQL →
  `npm run db:migrate` (solo base local) → commitear schema + migración juntos.
- **Nunca** corras `drizzle-kit migrate` ni `drizzle-kit push` contra una base hosteada.
- **Nunca** ejecutes DDL (`CREATE/ALTER/DROP/TRUNCATE`) por `netlify database connect` ni por conexión
  directa. Todo cambio de esquema pasa por un archivo de migración; el **deploy** los aplica.
- Una migración ya aplicada es inmutable: corrige "hacia adelante" con una migración nueva.
- Drizzle está en la línea `@rc` (`drizzle-orm`/`drizzle-kit`). Es la que trae el adaptador
  `drizzle-orm/netlify-db`. La línea `latest` no lo incluye; la `@beta` está rota (`_relations`).

## Convenciones de código

- TypeScript estricto; el proyecto compila con `noUnusedLocals`/`noUnusedParameters`. Sin variables
  sin usar.
- Comparte tipos y lógica de negocio vía `shared/`; no dupliques el flujo de preguntas ni el motor.
- El motor de recomendación (`shared/configurator.ts`) es determinista y debe seguir funcionando sin
  IA. La IA solo enriquece el resumen.
- Textos de la UI en español (audiencia LatAm/España).
- No agregues comentarios que narren código obvio.

## Cómo extender

- **Nueva pregunta del chatbot:** agrega un `Step` en `STEPS` (`shared/configurator.ts`) y, si aplica,
  un campo en `ConfiguratorAnswers` (`shared/types.ts`). Ajusta `buildBlueprint`. Si se persiste, agrega
  columna en `db/schema.ts` y genera migración.
- **Nuevo módulo/automatización recomendada:** edítalo en `buildBlueprint`.
- **Nuevo endpoint:** crea `netlify/functions/<nombre>.ts` con `config.path = "/api/<...>"`.

## Git

- Trabaja en ramas `cursor/<descripción>-8fba`. Commits chicos y descriptivos.
- Commitea y pushea antes de testear; abre/actualiza el PR al terminar.
- No hagas force-push ni amend salvo pedido explícito.
