import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

// Backend lint config. web/ has its own eslint.config.js; ESLint 10 uses the
// nearest config per file, so the frontend is ignored here.
export default defineConfig([
  globalIgnores(["web/**", "dist/**", "drizzle/**", "infra/**"]),
  {
    files: ["**/*.{ts,js,mjs}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Type-aware rules for code covered by tsconfig.json.
    files: ["src/**/*.ts", "shared/**/*.ts", "test/**/*.ts"],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Fastify's inject().json() returns any; asserting on it in tests is fine.
    files: ["test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
    },
  },
]);
