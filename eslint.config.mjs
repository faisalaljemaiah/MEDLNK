import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored skill packs (npx skills add / pnpm dlx skills add) — third-
    // party content, not this app's source, so it shouldn't be held to (or
    // fail) this app's lint rules.
    ".agents/**",
    ".claude/skills/**",
  ]),
]);

export default eslintConfig;
