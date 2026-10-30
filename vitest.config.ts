import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Merged Vitest configuration.
 *
 * Includes both:
 *   - Placement-test management Sprint 1 & Sprint 2 tests (node environment)
 *   - Shared __tests__/ component/auth tests (jsdom environment, React plugin)
 *
 * Server-action test files that need node semantics use:
 *   // @vitest-environment node
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./node_modules/next/dist/compiled/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: [
      "__tests__/**/*.{test,spec}.{ts,tsx}",
      "src/tests/placement-test-management/sprint1/**/*.test.ts",
      "src/tests/placement-test-management/sprint2/**/*.test.ts",
    ],
  },
});
