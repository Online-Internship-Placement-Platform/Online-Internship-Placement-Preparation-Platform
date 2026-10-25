import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Shared Vitest configuration — chore/shared-testing-setup
 *
 * Environment: jsdom (supports both React component tests and server-side tests)
 * Individual test files that require a strict Node environment can opt out with:
 *   // @vitest-environment node
 *
 * include: deliberately limited to __tests__/ so feature-specific test folders
 * on individual feature branches are not accidentally discovered here.
 * Each team member configures their own include on their feature branch.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["__tests__/**/*.{test,spec}.{ts,tsx}"],
  },
});
