
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
      "src/modules/applications/**/*_test.ts",
      "src/tests/placement-test-management/sprint1/**/*.test.ts",
      "src/tests/placement-test-management/sprint2/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/tests/**",
        "src/**/__tests__/**",
        "src/**/*.d.ts",
        "src/**/*_test.{ts,tsx}",
      ],
    },
  },
});
