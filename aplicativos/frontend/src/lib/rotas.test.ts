import { describe, expect, it } from "vitest";
import { destinoSeguro, ehRotaPrivada } from "./rotas";

describe("ehRotaPrivada", () => {
  it.each(["/painel", "/feed", "/perfil", "/moderacao", "/importar", "/recomendacoes", "/recap", "/painel/qualquer"])(
    "%s exige login",
    (rota) => {
      expect(ehRotaPrivada(rota)).toBe(true);
    }
  );

  it.each(["/", "/catalogo", "/itens/tmdb_movie_1", "/u/ana", "/entrar", "/painelzinho", "/offline"])(
    "%s e publica",
    (rota) => {
      expect(ehRotaPrivada(rota)).toBe(false);
    }
  );
});

describe("destinoSeguro", () => {
  it("aceita caminhos internos", () => {
    expect(destinoSeguro("/itens/tmdb_movie_1?x=1")).toBe("/itens/tmdb_movie_1?x=1");
  });

  it.each([undefined, null, "", "https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)"])(
    "bloqueia redirecionamento aberto: %p",
    (next) => {
      expect(destinoSeguro(next)).toBe("/painel");
    }
  );

  it("usa o padrao informado", () => {
    expect(destinoSeguro(null, "/catalogo")).toBe("/catalogo");
  });
});
