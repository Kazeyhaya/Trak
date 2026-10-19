import { ItemCatalogo } from "../catalogo/catalogo.types";
import { escolherSementes, ranquear } from "./recomendacoes.regras";

const item = (id: string): ItemCatalogo => ({
  id,
  externalId: id,
  source: "tmdb",
  type: "MOVIE",
  title: id,
  coverUrl: null,
  synopsis: null,
  releaseYear: null
});

describe("escolherSementes", () => {
  const registros = [
    { mediaItemId: "a", status: "COMPLETED", rating: 5 },
    { mediaItemId: "b", status: "COMPLETED", rating: 2 },
    { mediaItemId: "c", status: "DROPPED", rating: null },
    { mediaItemId: "d", status: "WANT", rating: null },
    { mediaItemId: "e", status: "WATCHING", rating: null },
    { mediaItemId: "f", status: "COMPLETED", rating: null }
  ];

  it("prioriza notas altas e favoritos e descarta abandonados e notas baixas", () => {
    const sementes = escolherSementes(registros, new Set(["e"])).map((s) => s.mediaItemId);
    expect(sementes).toEqual(["a", "e", "f"]);
  });

  it("respeita o limite", () => {
    expect(escolherSementes(registros, new Set(), 1)).toHaveLength(1);
  });
});

describe("ranquear", () => {
  it("soma pontos de itens recomendados por varias sementes e remove os ja acompanhados", () => {
    const resultado = ranquear(
      [
        { semente: "Matrix", itens: [item("x"), item("y"), item("ja")] },
        { semente: "Duna", itens: [item("y"), item("z")] }
      ],
      new Set(["ja"])
    );

    expect(resultado.map((r) => r.id)).toEqual(["y", "x", "z"]);
    expect(resultado[0].reason).toBe("Porque você curtiu Matrix");
    expect(resultado.find((r) => r.id === "ja")).toBeUndefined();
  });

  it("respeita o limite", () => {
    expect(ranquear([{ semente: "s", itens: [item("1"), item("2"), item("3")] }], new Set(), 2)).toHaveLength(2);
  });
});
