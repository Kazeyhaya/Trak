import { SupabaseService } from "../../comum/supabase/supabase.service";
import { criarSupabaseServiceMock, Operacao, Resposta } from "../../testes/supabase.mock";
import { CatalogoService } from "../catalogo/catalogo.service";
import { AtividadesService } from "../social/atividades.service";
import { FavoritosService } from "./favoritos.service";

describe("FavoritosService", () => {
  function montar(responder: (op: Operacao) => Resposta) {
    const supabase = criarSupabaseServiceMock(responder);
    const catalogo = {
      buscarSalvos: jest.fn(async () => new Map()),
      garantirNoBanco: jest.fn(async () => {})
    };
    const atividades = {
      registrar: jest.fn(async () => {})
    };
    const service = new FavoritosService(
      supabase.service as unknown as SupabaseService,
      catalogo as unknown as CatalogoService,
      atividades as unknown as AtividadesService
    );
    return { service, chamadas: supabase.chamadas, catalogo, atividades };
  }

  describe("reordenar", () => {
    it("chama a RPC trak_reordenar_favoritos transacionalmente sem delete+insert", async () => {
      const { service, chamadas } = montar((op) => {
        if (op.table === "Favorite" && op.action === "select") {
          return { data: [{ mediaItemId: "m1" }, { mediaItemId: "m2" }] };
        }
        if (op.action === "rpc" && op.table === "trak_reordenar_favoritos") {
          return { data: null, error: null };
        }
        return { data: null };
      });

      const resultado = await service.reordenar("u1", ["m2", "m1"]);

      expect(resultado).toEqual({ ok: true });
      const rpcChamada = chamadas.find((c) => c.action === "rpc" && c.table === "trak_reordenar_favoritos");
      expect(rpcChamada).toBeDefined();
      expect(rpcChamada?.payload).toEqual({
        p_user_id: "u1",
        p_media_item_ids: ["m2", "m1"]
      });
      // Verifica que NÃO houve delete nem insert
      expect(chamadas.some((c) => c.action === "delete")).toBe(false);
      expect(chamadas.some((c) => c.action === "insert")).toBe(false);
    });

    it("se a RPC falhar, executa fallback seguro com UPDATE sem apagar nada", async () => {
      const { service, chamadas } = montar((op) => {
        if (op.table === "Favorite" && op.action === "select") {
          return { data: [{ mediaItemId: "m1" }, { mediaItemId: "m2" }] };
        }
        if (op.action === "rpc" && op.table === "trak_reordenar_favoritos") {
          return { error: { message: "function trak_reordenar_favoritos does not exist" } };
        }
        if (op.table === "Favorite" && op.action === "update") {
          return { data: null, error: null };
        }
        return { data: null };
      });

      const resultado = await service.reordenar("u1", ["m2", "m1"]);

      expect(resultado).toEqual({ ok: true });
      const updates = chamadas.filter((c) => c.table === "Favorite" && c.action === "update");
      expect(updates).toHaveLength(2);
      expect(updates[0].payload).toHaveProperty("createdAt");
      // Verifica que mesmo no fallback NENHUM delete é executado
      expect(chamadas.some((c) => c.action === "delete")).toBe(false);
    });
  });

  describe("adicionar", () => {
    it("garante obra no catalogo, faz upsert e registra atividade para favoritos novos", async () => {
      const { service, chamadas, catalogo, atividades } = montar((op) => {
        if (op.table === "Favorite" && op.action === "upsert") {
          return { data: [{ id: "fav-1" }] };
        }
        return { data: null };
      });

      await service.adicionar("u1", "m1");

      expect(catalogo.garantirNoBanco).toHaveBeenCalledWith("m1");
      const upsert = chamadas.find((c) => c.table === "Favorite" && c.action === "upsert");
      expect(upsert).toBeDefined();
      expect(upsert?.payload).toMatchObject({ userId: "u1", mediaItemId: "m1" });
      expect(atividades.registrar).toHaveBeenCalledWith("u1", "FAVORITE", "m1");
    });
  });

  describe("verificar", () => {
    it("retorna isFavorite: true quando linha existe", async () => {
      const { service } = montar(() => ({ data: { id: "fav-1" } }));
      const res = await service.verificar("u1", "m1");
      expect(res).toEqual({ isFavorite: true });
    });

    it("retorna isFavorite: false quando linha nao existe", async () => {
      const { service } = montar(() => ({ data: null }));
      const res = await service.verificar("u1", "m1");
      expect(res).toEqual({ isFavorite: false });
    });
  });

  describe("remover", () => {
    it("remove de Favorite e Activity ao mesmo tempo", async () => {
      const { service, chamadas } = montar(() => ({ data: null, error: null }));
      await service.remover("u1", "m1");

      const deletes = chamadas.filter((c) => c.action === "delete");
      expect(deletes.some((d) => d.table === "Favorite")).toBe(true);
      expect(deletes.some((d) => d.table === "Activity")).toBe(true);
    });
  });
});
