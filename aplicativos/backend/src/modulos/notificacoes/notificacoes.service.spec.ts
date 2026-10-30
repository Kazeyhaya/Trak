import { SupabaseService } from "../../comum/supabase/supabase.service";
import { criarSupabaseServiceMock, Operacao, Resposta } from "../../testes/supabase.mock";
import { NotificacoesService } from "./notificacoes.service";

function montar(responder: (op: Operacao) => Resposta) {
  const supabase = criarSupabaseServiceMock(responder);
  const service = new NotificacoesService(supabase.service as unknown as SupabaseService);
  return { service, chamadas: supabase.chamadas };
}

describe("NotificacoesService", () => {
  it("criar grava notificacao na tabela Notification", async () => {
    const { service, chamadas } = montar(() => ({
      data: { id: "n1", userId: "u2", actorId: "u1", type: "FOLLOW", title: "Novo seguidor", link: "/u/u1", read: false }
    }));

    const notif = await service.criar({
      userId: "u2",
      actorId: "u1",
      type: "FOLLOW",
      title: "Novo seguidor",
      link: "/u/u1"
    });

    expect(notif).toBeDefined();
    expect(chamadas[0].table).toBe("Notification");
    expect(chamadas[0].action).toBe("insert");
    expect(chamadas[0].payload).toMatchObject({
      userId: "u2",
      actorId: "u1",
      type: "FOLLOW",
      title: "Novo seguidor",
      read: false
    });
  });

  it("criar ignora quando o usuario executa acao sobre si mesmo", async () => {
    const { service, chamadas } = montar(() => ({ data: null }));

    const res = await service.criar({
      userId: "u1",
      actorId: "u1",
      type: "COMMENT",
      title: "Auto comentario",
      link: "/itens/1"
    });

    expect(res).toBeNull();
    expect(chamadas.length).toBe(0);
  });

  it("listar enriquece notificacoes com dados dos atores da tabela User", async () => {
    const { service } = montar((op) => {
      if (op.table === "Notification") {
        return {
          data: [
            {
              id: "n1",
              userId: "u1",
              actorId: "u2",
              type: "FOLLOW",
              title: "Ana seguiu você",
              link: "/u/ana",
              read: false,
              data: {},
              createdAt: "2026-01-01"
            }
          ]
        };
      }
      if (op.table === "User") {
        return {
          data: [
            { id: "u2", username: "ana", displayName: "Ana", avatarUrl: "https://example.com/avatar.jpg" }
          ]
        };
      }
      return { data: [] };
    });

    const lista = await service.listar("u1");

    expect(lista).toHaveLength(1);
    expect(lista[0].actor).toEqual({
      username: "ana",
      displayName: "Ana",
      avatarUrl: "https://example.com/avatar.jpg"
    });
    expect(lista[0].read).toBe(false);
  });

  it("contarNaoLidas retorna a contagem de notificacoes nao lidas", async () => {
    const { service } = montar(() => ({ data: [], count: 3 }));

    const res = await service.contarNaoLidas("u1");

    expect(res).toEqual({ count: 3 });
  });

  it("marcarLida atualiza read para true", async () => {
    const { service, chamadas } = montar(() => ({ data: null }));

    const res = await service.marcarLida("n1", "u1");

    expect(res).toEqual({ ok: true });
    const update = chamadas.find((c) => c.action === "update");
    expect(update).toBeDefined();
    expect(update?.payload).toEqual({ read: true });
  });

  it("marcarTodasLidas atualiza todas as notificacoes pendentes", async () => {
    const { service, chamadas } = montar(() => ({ data: null }));

    const res = await service.marcarTodasLidas("u1");

    expect(res).toEqual({ ok: true });
    const update = chamadas.find((c) => c.action === "update");
    expect(update).toBeDefined();
    expect(update?.payload).toEqual({ read: true });
  });
});
