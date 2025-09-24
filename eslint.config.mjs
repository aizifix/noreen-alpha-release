import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Warn on console usage during development; CI can treat warnings as errors
      "no-console": ["warn", { allow: ["error", "warn"] }],
      "no-debugger": "warn",
    },
  },
];

export default eslintConfig;
