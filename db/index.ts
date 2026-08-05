import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "./schema";

// The Netlify DB adapter auto-configures the connection from the environment
// (NETLIFY_DB_URL) — no connection string needed here.
export const db = drizzle();
export { schema };
