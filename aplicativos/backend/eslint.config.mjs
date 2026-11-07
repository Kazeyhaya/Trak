import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "src/**/*.js", "src/**/*.d.ts"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      // Permite omitir campos com desestruturacao: const { a, ...resto } = obj.
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }]
    }
  }
);
