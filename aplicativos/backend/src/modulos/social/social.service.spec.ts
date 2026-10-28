import { SupabaseService } from "../../comum/supabase/supabase.service";
import { criarSupabaseServiceMock, Operacao, Resposta } from "../../testes/supabase.mock";
import { CatalogoService } from "../catalogo/catalogo.service";
import { SocialService, usernameExato } from "./social.service";

function montar(responder: (op: Operacao) => Resposta) {
  const supabase = criarSupabaseServiceMock(responder);
  const catalogo = { buscarSalvos: jest.fn(async () => new Map()) };
  const service = new SocialService(
    supabase.service as unknown as SupabaseService,
    catalogo as unknown as CatalogoService
  );
  return { service, chamadas: supabase.chamadas };
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
    expect(seguidores).toEqual([
      expect.objectContaining({
        userId: "u2",
        username: "pedro",
        displayName: "Pedro",
        isFollowing: false,
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
    expect(seguindo).toEqual([
      expect.objectContaining({
        userId: "u3",
        username: "lucas",
        displayName: "Lucas",
        isFollowing: false,
        isMe: false
      })
    ]);
  });
});
