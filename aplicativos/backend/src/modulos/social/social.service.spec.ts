import { SupabaseService } from "../../comum/supabase/supabase.service";
import { criarSupabaseServiceMock, Operacao, Resposta, valorDoFiltro } from "../../testes/supabase.mock";
import { CatalogoService } from "../catalogo/catalogo.service";
import { idadeEm, SocialService, usernameExato } from "./social.service";

function montar(responder: (op: Operacao) => Resposta) {
  const supabase = criarSupabaseServiceMock(responder);
  const catalogo = { buscarSalvos: jest.fn(async () => new Map()), duracoes: jest.fn(async () => new Map()) };
  const service = new SocialService(
    supabase.service as unknown as SupabaseService,
    catalogo as unknown as CatalogoService
  );
  return { service, chamadas: supabase.chamadas };
}

// Igual ao montar, expondo o cliente (para conferir supabase.auth.admin).
function montarComCliente(responder: (op: Operacao) => Resposta) {
  const supabase = criarSupabaseServiceMock(responder);
  const service = new SocialService(
    supabase.service as unknown as SupabaseService,
    {} as unknown as CatalogoService
  );
  return { service, chamadas: supabase.chamadas, supabase: supabase.client };
}

const linhaUser = { id: "u1", username: "ana_1", displayName: null, bio: null, isPublic: true, createdAt: "2026" };

describe("usernameExato", () => {
  it("escapa os curingas do LIKE para a busca ser exata", () => {
    expect(usernameExato("ana_1")).toBe("ana\\_1");
    expect(usernameExato("a%b")).toBe("a\\%b");
    expect(usernameExato("x\\y")).toBe("x\\\\y");
    expect(usernameExato("simples")).toBe("simples");
  });
});

describe("SocialService (perfil na tabela User)", () => {
  it("meuPerfil le de User e devolve userId", async () => {
    const { service, chamadas } = montar(() => ({ data: linhaUser }));

    const resultado = await service.meuPerfil({ id: "u1", email: "a@a.com" });

    expect(chamadas[0].table).toBe("User");
    expect(resultado.profile).toMatchObject({ userId: "u1", username: "ana_1", isPublic: true });
  });

  it("salvarPerfil atualiza a linha existente com updatedAt", async () => {
    const { service, chamadas } = montar((op) => (op.action === "update" ? { data: linhaUser } : { data: null }));

    await service.salvarPerfil("u1", { username: "ana_1", bio: "oi" });

    const update = chamadas.find((c) => c.action === "update")!;
    expect(update.table).toBe("User");
    expect(update.payload).toMatchObject({ username: "ana_1", bio: "oi" });
    expect(update.payload).toHaveProperty("updatedAt");
    expect(chamadas.some((c) => c.action === "insert")).toBe(false);
  });

  it("salvarPerfil cria a linha quando ela ainda nao existe", async () => {
    const { service, chamadas } = montar((op) => (op.action === "insert" ? { data: linhaUser } : { data: null }));

    await service.salvarPerfil("u1", { username: "ana_1" });

    expect(chamadas.find((c) => c.action === "insert")!.payload).toMatchObject({
      id: "u1",
      authUserId: "u1",
      username: "ana_1"
    });
  });

  it("username em uso vira 409", async () => {
    const { service } = montar(() => ({ error: { message: "duplicate", code: "23505" } }));
    await expect(service.salvarPerfil("u1", { username: "ana_1" })).rejects.toMatchObject({ status: 409 });
  });

  it("estatisticas do perfil leem UserMedia e convertem IN_PROGRESS", async () => {
    const { service } = montar((op) => {
      if (op.table === "User") {
        return { data: linhaUser };
      }
      if (op.table === "UserMedia") {
        return {
          data: [
            { status: "IN_PROGRESS", personalRating: 4 },
            { status: "COMPLETED", personalRating: 5 },
            { status: "IN_PROGRESS", personalRating: null }
          ]
        };
      }
      return { data: [], count: 0 };
    });

    const perfil = await service.perfilPublico("ANA_1");

    expect(perfil.stats).toEqual({ total: 3, byStatus: { WATCHING: 2, COMPLETED: 1 }, averageRating: 4.5 });
  });

  it("listarSeguidores retorna lista com dados de quem segue o usuario", async () => {
    const { service } = montar((op) => {
      if (op.table === "User") {
        if (op.filtros.some(([m]) => m === "in")) {
          return { data: [{ id: "u2", username: "pedro", displayName: "Pedro", bio: "Oi", isPublic: true, createdAt: "2026" }] };
        }
        return { data: linhaUser };
      }
      if (op.table === "Follow") {
        return { data: [{ followerId: "u2", createdAt: "2026-01-01" }] };
      }
      return { data: [], count: 0 };
    });

    const seguidores = await service.listarSeguidores("ana_1");
    expect(seguidores.proximo).toBeNull();
    expect(seguidores.items).toEqual([
      expect.objectContaining({
        userId: "u2",
        username: "pedro",
        displayName: "Pedro",
        isFollowing: false,
        followsYou: false,
        isMe: false
      })
    ]);
  });

  it("listarSeguindo retorna lista de quem o usuario segue", async () => {
    const { service } = montar((op) => {
      if (op.table === "User") {
        if (op.filtros.some(([m]) => m === "in")) {
          return { data: [{ id: "u3", username: "lucas", displayName: "Lucas", bio: null, isPublic: true, createdAt: "2026" }] };
        }
        return { data: linhaUser };
      }
      if (op.table === "Follow") {
        return { data: [{ followingId: "u3", createdAt: "2026-01-01" }] };
      }
      return { data: [], count: 0 };
    });

    const seguindo = await service.listarSeguindo("ana_1");
    expect(seguindo.proximo).toBeNull();
    expect(seguindo.items).toEqual([
      expect.objectContaining({
        userId: "u3",
        username: "lucas",
        displayName: "Lucas",
        isFollowing: false,
        followsYou: false,
        isMe: false
      })
    ]);
  });

  it("perfilPublico encontra usuario com underscore e diferenca de caixa (ex: joe_joestar vs Joe_Joestar)", async () => {
    const userJoe = {
      id: "u_joe",
      username: "joe_joestar",
      displayName: "Joe Joestar",
      bio: "É preciso imaginar Sísifo feliz",
      isPublic: true,
      createdAt: "2026"
    };

    const { service } = montar((op) => {
      if (op.table === "User") {
        return { data: [userJoe] };
      }
      return { data: [], count: 0 };
    });

    const resultado = await service.perfilPublico("Joe_Joestar");
    expect(resultado.profile).toMatchObject({
      username: "joe_joestar",
      displayName: "Joe Joestar",
      bio: "É preciso imaginar Sísifo feliz"
    });
  });

  it("perfilPublico decodifica usernames codificados em URL (ex: joe%5Fjoestar)", async () => {
    const userJoe = {
      id: "u_joe",
      username: "joe_joestar",
      displayName: "Joe Joestar",
      bio: "É preciso imaginar Sísifo feliz",
      isPublic: true,
      createdAt: "2026"
    };

    const { service } = montar((op) => {
      if (op.table === "User") {
        return { data: [userJoe] };
      }
      return { data: [], count: 0 };
    });

    const resultado = await service.perfilPublico("joe%5Fjoestar");
    expect(resultado.profile.username).toBe("joe_joestar");
  });

  it("perfilPublico lanca NotFoundException quando usuario nao existe", async () => {
    const { service } = montar(() => ({ data: [] }));
    await expect(service.perfilPublico("inexistente")).rejects.toMatchObject({
      status: 404
    });
  });

  describe("feed", () => {
    it("marca inMyLibrary como true para atividades proprias e itens ja salvos na estante", async () => {
      const atividadesMock = [
        { id: "act1", userId: "u1", type: "STATUS", mediaItemId: "item_proprio", data: { status: "WANT" }, createdAt: "2026-10-31" },
        { id: "act2", userId: "u2", type: "STATUS", mediaItemId: "item_amigo_salvo", data: { status: "WANT" }, createdAt: "2026-10-31" },
        { id: "act3", userId: "u2", type: "STATUS", mediaItemId: "item_amigo_novo", data: { status: "WANT" }, createdAt: "2026-10-31" }
      ];

      const { service } = montar((op) => {
        if (op.table === "Follow") {
          return { data: null, count: 1 };
        }
        if (op.action === "rpc" && op.table === "trak_feed") {
          return { data: atividadesMock };
        }
        if (op.table === "User") {
          return {
            data: [
              { id: "u1", username: "alex", displayName: "Alex", isPublic: true },
              { id: "u2", username: "amigo", displayName: "Amigo", isPublic: true }
            ]
          };
        }
        if (op.table === "UserMedia") {
          const userIdEq = valorDoFiltro(op, "userId");
          if (userIdEq === "u1") {
            return { data: [{ mediaItemId: "item_proprio" }, { mediaItemId: "item_amigo_salvo" }] };
          }
          return {
            data: [
              { userId: "u1", mediaItemId: "item_proprio" },
              { userId: "u2", mediaItemId: "item_amigo_salvo" },
              { userId: "u2", mediaItemId: "item_amigo_novo" }
            ]
          };
        }
        return { data: [] };
      });

      const feed = await service.feed("u1");

      expect(feed.items).toHaveLength(3);
      // Item próprio sempre marcado como inMyLibrary
      expect(feed.items[0]).toMatchObject({ id: "act1", inMyLibrary: true });
      // Item do amigo que u1 tem na estante
      expect(feed.items[1]).toMatchObject({ id: "act2", inMyLibrary: true });
      // Item do amigo que u1 NÃO tem na estante
      expect(feed.items[2]).toMatchObject({ id: "act3", inMyLibrary: false });
      expect(feed.followingCount).toBe(1);
      expect(feed.proximo).toBeNull();
    });

    it("pagina pelo cursor: devolve 30 atividades e o cursor da ultima", async () => {
      const atividades = Array.from({ length: 31 }, (_, i) => ({
        id: `act${String(i).padStart(2, "0")}`,
        userId: "u1",
        type: "STATUS",
        mediaItemId: `m${i}`,
        data: { status: "WANT" },
        createdAt: new Date(Date.UTC(2026, 9, 31, 12, 0, 60 - i)).toISOString()
      }));
      const { service, chamadas } = montar((op) => {
        if (op.action === "rpc" && op.table === "trak_feed") {
          return { data: atividades };
        }
        if (op.table === "UserMedia") {
          return { data: atividades.map((a) => ({ userId: "u1", mediaItemId: a.mediaItemId })) };
        }
        if (op.table === "User") {
          return { data: [{ id: "u1", username: "alex", displayName: "Alex", isPublic: true }] };
        }
        return { data: null, count: 0 };
      });

      const primeira = await service.feed("u1");
      expect(primeira.items).toHaveLength(30);
      expect(primeira.proximo).toEqual(expect.any(String));

      await service.feed("u1", primeira.proximo as string);
      const segundaChamada = chamadas.filter((c) => c.table === "trak_feed")[1];
      expect(segundaChamada.payload).toMatchObject({
        usuario: "u1",
        antes_em: atividades[29].createdAt,
        antes_id: "act29",
        limite: 31
      });
    });

    it("recusa cursor invalido com 400", async () => {
      const { service } = montar(() => ({ data: [] }));
      await expect(service.feed("u1", "nao-e-um-cursor")).rejects.toMatchObject({ status: 400 });
    });
  });
});


describe("conteudo +18 no perfil", () => {
  it("idadeEm conta o aniversario do ano", () => {
    const hoje = new Date(Date.UTC(2026, 10, 6));
    expect(idadeEm("2008-11-06", hoje)).toBe(18);
    expect(idadeEm("2008-11-07", hoje)).toBe(17);
    expect(idadeEm("1990-01-01", hoje)).toBe(36);
  });

  it("recusa liberar conteudo +18 para menor de idade", async () => {
    const { service } = montar((op) => (op.table === "User" ? { data: { id: "u1", birthDate: null } } : { data: null }));
    const anoMenor = new Date().getUTCFullYear() - 15;
    await expect(
      service.salvarPerfil("u1", { username: "ana", birthDate: `${anoMenor}-01-01`, adultContent: true })
    ).rejects.toThrow("Conteúdo +18 só pode ser liberado para maiores de 18 anos.");
  });

  it("libera para maior de idade e registra o consentimento", async () => {
    const { service, chamadas } = montar((op) =>
      op.table === "User" ? { data: { id: "u1", username: "ana", birthDate: "1990-05-10" } } : { data: null }
    );

    await service.salvarPerfil("u1", { username: "ana", birthDate: "1990-05-10", adultContent: true });

    const update = chamadas.find((c) => c.table === "User" && c.action === "update")!;
    expect(update.payload).toMatchObject({ birthDate: "1990-05-10", adultContent: true });
    expect(update.payload).toHaveProperty("adultConsentAt");
  });
});


describe("configuracoes: salvamento por secao e exclusao de conta", () => {
  it("salva so os campos enviados, sem exigir o nome de usuario de quem ja tem perfil", async () => {
    const { service, chamadas } = montar((op) =>
      op.table === "User" ? { data: { id: "u1", username: "ana", bio: "nova bio" } } : { data: null }
    );

    await service.salvarPerfil("u1", { bio: "nova bio" });

    const update = chamadas.find((c) => c.table === "User" && c.action === "update")!;
    expect(Object.keys(update.payload as object).sort()).toEqual(["bio", "updatedAt"]);
  });

  it("na primeira gravacao exige o nome de usuario", async () => {
    const { service } = montar(() => ({ data: null }));
    await expect(service.salvarPerfil("u1", { bio: "oi" })).rejects.toThrow("Escolha um nome de usuário primeiro.");
  });

  it("excluir conta apaga os dados no banco e depois o login", async () => {
    const { service, chamadas, supabase } = montarComCliente(() => ({ data: null }));

    await expect(service.excluirConta("u1")).resolves.toEqual({ ok: true });

    expect(chamadas.find((c) => c.action === "rpc")).toMatchObject({
      table: "trak_excluir_usuario",
      payload: { usuario: "u1" }
    });
    expect(supabase.auth.admin.deleteUser).toHaveBeenCalledWith("u1");
  });

  it("se o banco falhar, o login nao e apagado", async () => {
    const { service, supabase } = montarComCliente((op) =>
      op.action === "rpc" ? { error: { message: "falhou" } } : { data: null }
    );

    await expect(service.excluirConta("u1")).rejects.toThrow("falhou");
    expect(supabase.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("perfilPublico escapa curingas % e _ para impedir busca de qualquer usuario", async () => {
    const { service, chamadas } = montar(() => ({ data: [] }));

    await expect(service.perfilPublico("%")).rejects.toMatchObject({ status: 404 });

    const ilikeFiltro = chamadas[0].filtros.find(([m]) => m === "ilike");
    expect(ilikeFiltro).toEqual(["ilike", "username", "\\%"]);
  });

  it("buscarPerfis escapa curingas _", async () => {
    const { service, chamadas } = montar(() => ({ data: [] }));

    await service.buscarPerfis("ana_1");

    const ilikeFiltro = chamadas[0].filtros.find(([m]) => m === "ilike");
    expect(ilikeFiltro).toEqual(["ilike", "username", "%ana\\_1%"]);
  });

  it("salvarPerfil legado usa trak_salvar_meta via RPC e nao delete+insert", async () => {
    let tentativa = 0;
    const { service, chamadas } = montar((op) => {
      if (op.table === "User" && op.action === "update") {
        tentativa++;
        if (tentativa === 1) {
          return { error: { message: "column avatarUrl does not exist", code: "42703" } };
        }
        return { data: linhaUser, error: null };
      }
      if (op.action === "rpc" && op.table === "trak_salvar_meta") {
        return { data: null, error: null };
      }
      return { data: null };
    });

    await service.salvarPerfil("u1", { avatarUrl: "https://example.com/foto.jpg" });

    const rpcChamada = chamadas.find((c) => c.action === "rpc" && c.table === "trak_salvar_meta");
    expect(rpcChamada).toBeDefined();
    expect(chamadas.some((c) => c.action === "delete" && c.table === "Activity")).toBe(false);
  });
});

