import { defineConfig } from "vitest/config";

export default defineConfig({
  // O tsconfig usa jsx "preserve" para o Next; nos testes o JSX vira chamadas do runtime novo.
  esbuild: { jsx: "automatic" },
  test: {
    // Testes de componente (.test.tsx) declaram "@vitest-environment jsdom" no topo.
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"]
  }
});
