import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "**/.turbo/**",
      "**/dist/**",
      "**/coverage/**",
      "next-env.d.ts",
      ".next/**",
      "node_modules/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    // Relax some rules temporarily to allow iterative development
    // TODO: Gradually re-enable as technical debt is paid down
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // allow explicit any during rapid prototyping; we'll tighten later
      '@typescript-eslint/no-explicit-any': 'warn',
      // unused vars - warn instead of error to not block development
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      // react hooks exhaustive deps - warn instead of error
      'react-hooks/exhaustive-deps': 'warn',
      // allow <img> for now (will migrate to next/image later)
      '@next/next/no-img-element': 'warn'
    }
  },
];

export default eslintConfig;
