import { origensPermitidas } from "./cors";

function permite(valor: string | undefined, origem: string) {
  return origensPermitidas(valor).some((regra) => (typeof regra === "string" ? regra === origem : regra.test(origem)));
}

describe("origensPermitidas", () => {
  it("sem valor libera so o localhost do Next", () => {
    expect(permite(undefined, "http://localhost:3000")).toBe(true);
    expect(permite("", "http://localhost:3000")).toBe(true);
    expect(permite(undefined, "https://trak-xi.vercel.app")).toBe(false);
  });

  it("ignora barra final e espacos (erro comum ao colar a URL)", () => {
    expect(permite(" https://trak-xi.vercel.app/ ", "https://trak-xi.vercel.app")).toBe(true);
    expect(permite("http://localhost:3000, https://trak-xi.vercel.app//", "https://trak-xi.vercel.app")).toBe(true);
  });

  it("curinga libera subdominios, mas nao outros dominios", () => {
    const valor = "https://*.vercel.app";
    expect(permite(valor, "https://trak-git-main-kazeyhaya.vercel.app")).toBe(true);
    expect(permite(valor, "https://vercel.app")).toBe(false);
    expect(permite(valor, "https://a.b.vercel.app")).toBe(false);
    expect(permite(valor, "https://evil.com/?x=.vercel.app")).toBe(false);
    expect(permite(valor, "https://trakxvercel.app")).toBe(false);
  });

  it("exige o protocolo e o dominio exatos", () => {
    expect(permite("https://trak-xi.vercel.app", "http://trak-xi.vercel.app")).toBe(false);
    expect(permite("https://trak-xi.vercel.app", "https://trak-xi.vercel.app.evil.com")).toBe(false);
  });
});
