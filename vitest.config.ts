import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // npm test runs only Sprint 1 tests.
    // additional/ (106 archived tests) and sprint2/ are excluded from this default run.
    // To run archived tests separately: npx vitest run src/tests/placement-test-management/additional/
    include: [
      "src/tests/placement-test-management/sprint1/**/*.test.ts",
      "src/tests/placement-test-management/sprint2/**/*.test.ts",
    ],
  },
});
