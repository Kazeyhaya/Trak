import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "src/**/*.js", "src/**/*.d.ts"] },
  ...tseslint.configs.recommended
);
