import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config";

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage/frontend",
      
      thresholds: {
        statements: 50,
        branches: 70,
        functions: 70,
        lines: 50,
      },

      include: [
        "src/components/**/*.{ts,tsx}",
        "src/app/**/page.tsx",
        "src/app/**/layout.tsx",
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
