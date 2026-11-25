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
]);
