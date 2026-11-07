import { criarCursor, emBlocos, fecharPagina, filtroAntesDe, lerCursor, lerTodas } from "./paginas";

describe("lerTodas", () => {
  it("continua pedindo ate uma pagina vir incompleta", async () => {
    const total = 2500;
    const pedidos: Array<[number, number]> = [];
    const linhas = await lerTodas<number>(async (de, ate) => {
      pedidos.push([de, ate]);
      const fim = Math.min(ate + 1, total);
      return { data: Array.from({ length: Math.max(0, fim - de) }, (_, i) => de + i), error: null };
    });
    expect(linhas).toHaveLength(total);
    expect(pedidos).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999]
    ]);
  });

  it("propaga o erro do banco", async () => {
    await expect(lerTodas(async () => ({ data: null, error: { message: "falhou" } }))).rejects.toThrow("falhou");
  });
});

describe("emBlocos", () => {
  it("divide os valores (sem repetir) em blocos de 150 e junta as respostas", async () => {
    const ids = Array.from({ length: 400 }, (_, i) => `id${i}`);
    const blocos: string[][] = [];
    const linhas = await emBlocos<string>([...ids, "id0"], async (bloco) => {
      blocos.push(bloco);
      return { data: bloco, error: null };
    });
    expect(blocos.map((b) => b.length)).toEqual([150, 150, 100]);
    expect(linhas).toHaveLength(400);
  });

  it("nao consulta nada sem valores", async () => {
    const consulta = jest.fn();
    expect(await emBlocos([], consulta)).toEqual([]);
    expect(consulta).not.toHaveBeenCalled();
  });
});

describe("cursor", () => {
  it("ida e volta", () => {
    const texto = criarCursor("2026-11-07T12:00:00.123+00:00", "act_9");
    expect(lerCursor(texto)).toEqual({ em: "2026-11-07T12:00:00.123+00:00", id: "act_9" });
    expect(lerCursor(undefined)).toBeNull();
  });

  it("recusa cursor adulterado ou grande demais", () => {
    expect(() => lerCursor("lixo")).toThrow("Cursor");
    expect(() => lerCursor(criarCursor("nao e data", "x"))).toThrow("Cursor");
    expect(() => lerCursor("a".repeat(400))).toThrow("Cursor");
  });

  it("filtro do PostgREST com os valores entre aspas", () => {
    expect(filtroAntesDe({ em: "2026-11-07T12:00:00+00:00", id: "c1" }, "createdAt", "id")).toBe(
      'createdAt.lt."2026-11-07T12:00:00+00:00",and(createdAt.eq."2026-11-07T12:00:00+00:00",id.lt."c1")'
    );
  });

  it("fecharPagina so devolve cursor quando veio a linha extra", () => {
    const chave = (n: number) => ({ em: `2026-01-0${n}T00:00:00Z`, id: String(n) });
    expect(fecharPagina([3, 2, 1], 3, chave).proximo).toBeNull();
    const pagina = fecharPagina([4, 3, 2, 1], 3, chave);
    expect(pagina.itens).toEqual([4, 3, 2]);
    expect(lerCursor(pagina.proximo)).toEqual(chave(2));
  });
});
