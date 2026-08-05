import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import netlify from "@netlify/vite-plugin";

// VITE_STATIC_ONLY=true → build a pure static SPA (e.g. for GitHub Pages):
// the Netlify dev plugin is omitted and the app runs the configurator engine
// client-side with localStorage instead of Functions + Database.
// VITE_BASE sets the base path (GitHub Pages project sites live under /<repo>/).
export default defineConfig(() => {
  const staticOnly = process.env.VITE_STATIC_ONLY === "true";
  return {
    base: process.env.VITE_BASE ?? "/",
    plugins: [react(), ...(staticOnly ? [] : [netlify()])],
  };
});
