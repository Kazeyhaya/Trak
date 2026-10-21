import { describe, expect, it } from "vitest";
import { problemaUsername } from "./perfil";

describe("problemaUsername", () => {
  it("aceita nomes validos (inclusive em maiusculas, que viram minusculas)", () => {
    expect(problemaUsername("alex_allen")).toBeNull();
    expect(problemaUsername("Alex217")).toBeNull();
  });

  it("explica quando o navegador preencheu o e-mail", () => {
    expect(problemaUsername("alexallen217@gmail.c")).toMatch(/não o seu e-mail/);
  });

  it("explica tamanho e caracteres invalidos", () => {
    expect(problemaUsername("ab")).toMatch(/pelo menos 3/);
    expect(problemaUsername("a".repeat(21))).toMatch(/no máximo 20/);
    expect(problemaUsername("alex.allen")).toMatch(/sem espaços ou pontos/);
    expect(problemaUsername("joão")).toMatch(/sem acento/);
  });
});
