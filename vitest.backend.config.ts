import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config";

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage/backend",
      include: [
        "src/app/api/**/*.ts",
        "src/app/**/actions.ts",
        "src/lib/**/*.ts",
        "src/modules/**/*.ts",
      ],
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
