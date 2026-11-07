import { SupabaseService } from "../../comum/supabase/supabase.service";
import { criarSupabaseServiceMock, Operacao, Resposta } from "../../testes/supabase.mock";
import { CatalogoService } from "../catalogo/catalogo.service";
import { TrackingService } from "../tracking/tracking.service";
import { ImportacaoService } from "./importacao.service";

function csvWatched(titulos: string[]) {
  return ["Date,Name,Year,Letterboxd URI", ...titulos.map((t, i) => `2024-01-0${(i % 9) + 1},${t},2000,x`)].join("\n");
}

function montar(opcoes: { responder?: (op: Operacao) => Resposta | undefined; naEstante?: string[]; estanteFalha?: boolean } = {}) {
  const supabase = criarSupabaseServiceMock((op) => {
    const resposta = opcoes.responder?.(op);
    if (resposta) {
      return resposta;
    }
    if (op.table === "User" && op.action === "select") {
      return { data: { importedSources: [] } };
    }
    if (op.table === "ImportJob" && op.action === "insert") {
      const payload = op.payload as { total: number };
      return { data: { id: "tarefa-1", status: "PROCESSANDO", total: payload.total, processados: 0 } };
    }
    return { data: null };
  });
  const catalogo = {
    // "Inexistente" nao e encontrado no catalogo.
    buscarFilmePorTitulo: jest.fn(async (titulo: string) =>
      titulo === "Inexistente" ? null : { id: `tmdb_movie_${titulo}`, title: titulo }
    )
  };
  const tracking = {
    listarDoUsuario: jest.fn(async () => {
      if (opcoes.estanteFalha) {
        throw new Error("banco fora do ar");
      }
      return (opcoes.naEstante ?? []).map((id) => ({ mediaItemId: id, rating: null }));
    }),
    salvarParaUsuario: jest.fn(async () => ({})),
    importarEpisodios: jest.fn(async () => undefined)
  };
  const service = new ImportacaoService(
    supabase.service as unknown as SupabaseService,
    catalogo as unknown as CatalogoService,
    tracking as unknown as TrackingService
  );
  const atualizacoesDaTarefa = () =>
    supabase.chamadas
      .filter((c) => c.table === "ImportJob" && c.action === "update" && c.filtros.some(([, col]) => col === "id"))
      .map((c) => c.payload as Record<string, unknown>);
  return { service, tracking, chamadas: supabase.chamadas, atualizacoesDaTarefa };
}

describe("ImportacaoService (em segundo plano)", () => {
  it("responde na hora com a tarefa e processa os itens depois", async () => {
    const { service, tracking, chamadas, atualizacoesDaTarefa } = montar({ naEstante: ["tmdb_movie_Duna"] });

    const tarefa = await service.letterboxd("u1", csvWatched(["Matrix", "Duna", "Inexistente"]), "watched");
    expect(tarefa).toMatchObject({ id: "tarefa-1", status: "PROCESSANDO", total: 3 });

    await service.aguardarExecucoes();

    expect(tracking.salvarParaUsuario).toHaveBeenCalledTimes(1);
    expect(tracking.salvarParaUsuario).toHaveBeenCalledWith(
      "u1",
      "tmdb_movie_Matrix",
      { status: "COMPLETED" },
      expect.objectContaining({ registrarAtividade: false })
    );
    const final = atualizacoesDaTarefa().at(-1);
    expect(final).toMatchObject({
      status: "CONCLUIDA",
      processados: 3,
      resultado: { total: 3, imported: 1, skipped: 1, notFound: ["Inexistente (2000)"] }
    });
    const fonteRegistrada = chamadas.find((c) => c.table === "User" && c.action === "update");
    expect((fonteRegistrada?.payload as { importedSources: string[] }).importedSources).toEqual(
      expect.arrayContaining(["letterboxd", "letterboxd:watched"])
    );
  });

  it("salva o progresso a cada 10 itens", async () => {
    const { service, atualizacoesDaTarefa } = montar();
    const titulos = Array.from({ length: 25 }, (_, i) => `Filme ${i}`);

    await service.letterboxd("u1", csvWatched(titulos), "watched");
    await service.aguardarExecucoes();

    const progresso = atualizacoesDaTarefa().map((p) => p.processados);
    expect(progresso).toEqual([10, 20, 25]);
  });

  it("recusa lista ja importada antes de criar a tarefa", async () => {
    const { service, chamadas } = montar({
      responder: (op) =>
        op.table === "User" && op.action === "select" ? { data: { importedSources: ["letterboxd:watched"] } } : undefined
    });

    await expect(service.letterboxd("u1", csvWatched(["Matrix"]), "watched")).rejects.toMatchObject({ status: 400 });
    expect(chamadas.some((c) => c.table === "ImportJob" && c.action === "insert")).toBe(false);
  });

  it("recusa com 409 quando a mesma lista ja esta sendo importada", async () => {
    const { service } = montar({
      responder: (op) =>
        op.table === "ImportJob" && op.action === "insert"
          ? { error: { message: "duplicate key value", code: "23505" } }
          : undefined
    });

    await expect(service.letterboxd("u1", csvWatched(["Matrix"]), "watched")).rejects.toMatchObject({ status: 409 });
  });

  it("libera tarefa parada ha mais de 10 minutos antes de criar outra", async () => {
    const { service, chamadas } = montar();
    await service.letterboxd("u1", csvWatched(["Matrix"]), "watched");
    await service.aguardarExecucoes();

    const liberacao = chamadas.find(
      (c) => c.table === "ImportJob" && c.action === "update" && c.filtros.some(([metodo]) => metodo === "lt")
    );
    expect(liberacao?.payload).toMatchObject({ status: "FALHOU" });
    expect(liberacao?.filtros).toEqual(expect.arrayContaining([["eq", "status", "PROCESSANDO"]]));
  });

  it("marca a tarefa como falha se o processamento quebrar no meio", async () => {
    const { service, atualizacoesDaTarefa } = montar({ estanteFalha: true });

    const tarefa = await service.letterboxd("u1", csvWatched(["Matrix"]), "watched");
    expect(tarefa.status).toBe("PROCESSANDO");
    await service.aguardarExecucoes();

    expect(atualizacoesDaTarefa().at(-1)).toMatchObject({ status: "FALHOU", erro: expect.stringContaining("parou no meio") });
  });
});
