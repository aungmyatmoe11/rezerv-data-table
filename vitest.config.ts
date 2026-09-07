import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    globals: false,
    projects: [
      {
        extends: true,
        test: {
          name: "core",
          environment: "node",
          include: ["src/lib/table/core/**/*.test.ts", "src/mocks/**/*.test.ts", "tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/lib/table/react/**/*.test.{ts,tsx}", "src/lib/table/ui/**/*.test.{ts,tsx}", "src/features/**/*.test.{ts,tsx}"],
        },
      },
    ],
    typecheck: { enabled: true, include: ["src/**/*.test-d.ts"], tsconfig: "./tsconfig.json" },
  },
});
