import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Assignment constraint: the table engine must be built from scratch.
// These are enforced by lint, not by convention.
const forbiddenTableEngines = [
  "@tanstack/*",
  "ag-grid*",
  "react-data-grid",
  "@mui/x-data-grid*",
  "@glideapps/*",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "docs/contracts/**", "test-results/**", "playwright-report/**"]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "antd", importNames: ["Table", "Pagination"], message: "Assignment constraint: build the table (and its pagination) from scratch. Use antd only for non-table primitives." },
            { name: "antd/es/table", message: "Assignment constraint: no Ant Design Table engine." },
            { name: "antd/lib/table", message: "Assignment constraint: no Ant Design Table engine." },
          ],
          patterns: [{ group: forbiddenTableEngines, message: "Assignment constraint: no table/grid library." }],
        },
      ],
    },
  },
  {
    // core = pure TypeScript. No React, no DOM, no Next, no antd, no app modules.
    // Type-only imports (e.g. `ReactNode` for public prop types) are allowed; runtime imports are not.
    files: ["src/lib/table/core/**/*.ts"],
    rules: {
      "no-restricted-globals": ["error", { name: "fetch", message: "Core must stay free of I/O." }, { name: "document", message: "Core must stay free of the DOM." }, { name: "window", message: "Core must stay free of the DOM." }],
      "no-restricted-imports": "off",
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "react/*", "next", "next/*", "antd", "antd/*", "@ant-design/*", "@dnd-kit/*", "@/features/*", "@/app/*", "@/mocks/*", "../react", "../react/*", "../ui", "../ui/*", ...forbiddenTableEngines],
              message: "core/ is pure TypeScript: no React, DOM, Next, antd, or app modules (type-only imports are fine).",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    // react = hooks only. May import core; never ui, antd, or app modules.
    files: ["src/lib/table/react/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["next", "next/*", "antd", "antd/*", "@ant-design/*", "@/features/*", "@/app/*", "@/mocks/*", "../ui", "../ui/*", ...forbiddenTableEngines], message: "react/ owns hooks only: no markup libraries or app modules." },
          ],
        },
      ],
    },
  },
  {
    // ui = markup. May import core, react, antd non-table primitives; never app modules.
    files: ["src/lib/table/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "antd", importNames: ["Table", "Pagination"], message: "Assignment constraint: no Ant Design Table / Pagination inside the DataTable." }],
          patterns: [{ group: ["next", "next/*", "@/features/*", "@/app/*", "@/mocks/*", ...forbiddenTableEngines], message: "ui/ must not depend on app modules." }],
        },
      ],
    },
  },
  {
    // consumers use the public index only.
    files: ["src/features/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "antd", importNames: ["Table", "Pagination"], message: "Assignment constraint: use our DataTable." }],
          patterns: [{ group: ["@/lib/table/core/*", "@/lib/table/react/*", "@/lib/table/ui/*", ...forbiddenTableEngines], message: "Consumers import from '@/lib/table' only." }],
        },
      ],
    },
  },
]);

export default eslintConfig;
