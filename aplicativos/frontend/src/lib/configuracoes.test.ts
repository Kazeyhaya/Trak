import { describe, expect, it } from "vitest";

import { camposAlterados, idadeEm, secaoValida } from "./configuracoes";

describe("camposAlterados", () => {
  it("devolve so o que mudou", () => {
    const salvo = { username: "ana", bio: "oi", isPublic: true };
    expect(camposAlterados(salvo, { ...salvo, bio: "nova" })).toEqual({ bio: "nova" });
    expect(camposAlterados(salvo, { ...salvo })).toEqual({});
    expect(camposAlterados(salvo, { username: "bia", bio: "oi", isPublic: false })).toEqual({
      username: "bia",
      isPublic: false
    });
  });
});

describe("secaoValida", () => {
  it("aceita as secoes conhecidas e cai em perfil no resto", () => {
    expect(secaoValida("conta")).toBe("conta");
    expect(secaoValida("privacidade")).toBe("privacidade");
    expect(secaoValida("qualquer")).toBe("perfil");
    expect(secaoValida(undefined)).toBe("perfil");
  });
});

describe("idadeEm", () => {
  it("conta o aniversario do ano", () => {
    const hoje = new Date(2026, 10, 6);
    expect(idadeEm("2008-11-06", hoje)).toBe(18);
    expect(idadeEm("2008-11-07", hoje)).toBe(17);
    expect(idadeEm("", hoje)).toBe(0);
  });
});
