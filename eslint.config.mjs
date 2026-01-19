import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Extend core web vitals and typescript configs via compat
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "out/**", "build/**", ".vercel/**"],
  },
  {
    // Override rules - no plugins used here directly, relies on extended configs
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@next/next/no-img-element": "off",
      "@next/next/no-page-custom-font": "off",
      "react-hooks/rules-of-hooks": "off",
    },
  },
];

export default eslintConfig;
