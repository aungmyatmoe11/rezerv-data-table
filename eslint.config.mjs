import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Assignment constraint: the table engine is built from scratch — and so is every control it
// renders. Nothing ships a table, a grid, or a component/interaction library. Enforced by lint,
// not by convention; `package.json` runtime dependencies are react, react-dom, next and dayjs.
const forbiddenPackages = [
  "@tanstack/*",
  "ag-grid*",
  "react-data-grid",
  "@mui/*",
  "@glideapps/*",
  "antd",
  "antd/*",
  "@ant-design/*",
  "@dnd-kit/*",
  "@headlessui/*",
  "@radix-ui/*",
  "@chakra-ui/*",
  "react-window",
  "react-virtualized",
  "@tanstack/react-virtual",
];

const NO_LIBRARY = "Built from scratch: no table, grid, component or interaction library. Use the primitives in '@/lib/ui'.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", ".vercel/**", "out/**", "build/**", "next-env.d.ts", "docs/contracts/**", "test-results/**", "playwright-report/**"]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-restricted-imports": ["error", { patterns: [{ group: forbiddenPackages, message: NO_LIBRARY }] }],
    },
  },
  {
    // core = pure TypeScript. No React, no DOM, no Next, no app modules.
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
              group: ["react", "react-dom", "react/*", "next", "next/*", "@/lib/ui", "@/lib/ui/*", "@/features/*", "@/app/*", "@/mocks/*", "../react", "../react/*", "../ui", "../ui/*", ...forbiddenPackages],
              message: "core/ is pure TypeScript: no React, DOM, Next, UI or app modules (type-only imports are fine).",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    // react = hooks only. May import core; never markup, primitives or app modules.
    files: ["src/lib/table/react/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [{ group: ["next", "next/*", "@/lib/ui", "@/lib/ui/*", "@/features/*", "@/app/*", "@/mocks/*", "../ui", "../ui/*", ...forbiddenPackages], message: "react/ owns hooks only: no markup, primitives or app modules." }],
        },
      ],
    },
  },
  {
    // table ui = markup. May import core, react and our own primitives; never app modules.
    files: ["src/lib/table/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["next", "next/*", "@/features/*", "@/app/*", "@/mocks/*", ...forbiddenPackages], message: "ui/ must not depend on app modules." }] }],
    },
  },
  {
    // primitives = the bottom of the stack: React and its own CSS, nothing else.
    files: ["src/lib/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["next", "next/*", "@/lib/table", "@/lib/table/*", "@/features/*", "@/app/*", "@/mocks/*", ...forbiddenPackages], message: "Primitives depend on React only." }] }],
    },
  },
  {
    // consumers use the public entry points only.
    files: ["src/features/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [{ group: ["@/lib/table/core/*", "@/lib/table/react/*", "@/lib/table/ui/*", ...forbiddenPackages], message: "Consumers import from '@/lib/table' and '@/lib/ui' only." }],
        },
      ],
    },
  },
]);

export default eslintConfig;
