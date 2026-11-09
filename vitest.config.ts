import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["shared/**/*.test.ts", "netlify/functions/_shared/**/*.test.ts"],
  },
});
