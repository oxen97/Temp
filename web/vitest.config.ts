import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    server: {
      deps: {
        // Rapier ships a large inlined-WASM "compat" build that breaks
        // vitest's dependency scan. Keep it external; the physics runtime is
        // loaded lazily at runtime and verified in the browser, not in vitest.
        external: ["@dimforge/rapier2d-compat"],
      },
    },
  },
});
