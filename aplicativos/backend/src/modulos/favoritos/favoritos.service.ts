import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { emBlocos, lerTodas } from "../../comum/paginas";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import { CatalogoService } from "../catalogo/catalogo.service";
import { AtividadesService } from "../social/atividades.service";

@Injectable()
export class FavoritosService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly catalogoService: CatalogoService,
    private readonly atividadesService: AtividadesService
  ) {}

  async listar(authUserId: string) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.supabaseService.resolverUserId(authUserId);

    const favoritos = await lerTodas<{ mediaItemId: string; createdAt: string }>((de, ate) =>
      supabase
        .from("Favorite")
        .select("mediaItemId,createdAt")
        .eq("userId", userId)
        .order("createdAt", { ascending: false })
        .order("mediaItemId", { ascending: false })
        .range(de, ate)
    );

    const ids = favoritos.map((f) => f.mediaItemId);
    const [itens, capas] = await Promise.all([
      this.catalogoService.buscarSalvos(ids),
      emBlocos<{ mediaItemId?: string; customCoverUrl?: string | null }>(ids, (bloco) =>
        supabase.from("UserMedia").select("mediaItemId,customCoverUrl").eq("userId", userId).in("mediaItemId", bloco)
      )
    ]);

    const capasPersonalizadas = new Map<string, string>();
    for (const row of capas) {
      if (row.mediaItemId && row.customCoverUrl) {
        capasPersonalizadas.set(row.mediaItemId, row.customCoverUrl);
      }
    }

    return favoritos.map((fav) => {
      const id = fav.mediaItemId;
      const itemBase = itens.get(id) ?? null;
      const customCover = capasPersonalizadas.get(id);
      return {
        mediaItemId: fav.mediaItemId,
        createdAt: fav.createdAt,
        item: itemBase && customCover ? { ...itemBase, coverUrl: customCover } : itemBase
      };
    });
  }

  async verificar(authUserId: string, mediaItemId: string) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.supabaseService.resolverUserId(authUserId);

    const { data, error } = await supabase
      .from("Favorite")
      .select("id")
      .eq("userId", userId)
      .eq("mediaItemId", mediaItemId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return { isFavorite: Boolean(data) };
  }

  async adicionar(authUserId: string, mediaItemId: string) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.supabaseService.resolverUserId(authUserId);

    await this.catalogoService.garantirNoBanco(mediaItemId);

    // ignoreDuplicates evita trocar o id de um favorito que ja existe.
    const { data, error } = await supabase.from("Favorite").upsert(
      {
        id: randomUUID(),
        userId,
        mediaItemId
      },
      {
        onConflict: "userId,mediaItemId",
        ignoreDuplicates: true
      }
    ).select("id");

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    // Com ignoreDuplicates, so retorna linha quando o favorito e novo.
    if (data && data.length > 0) {
      await this.atividadesService.registrar(userId, "FAVORITE", mediaItemId);
    }

    return { ok: true };
  }

  async reordenar(authUserId: string, mediaItemIds: string[]) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.supabaseService.resolverUserId(authUserId);
    const unicos = [...new Set(mediaItemIds)];

    if (unicos.length === 0) {
      return { ok: true };
    }

    const { data: atuais, error: erroAtuais } = await supabase
      .from("Favorite")
      .select("mediaItemId")
      .eq("userId", userId);

    if (erroAtuais) {
      throw new InternalServerErrorException(erroAtuais.message);
    }

    const permitidos = new Set((atuais ?? []).map((f) => f.mediaItemId as string));
    const ordenados = unicos.filter((id) => permitidos.has(id));

    if (ordenados.length === 0) {
      return { ok: true };
    }

    const baseMs = Date.now();

    // Favorite e ordenado por createdAt DESC; o primeiro da lista recebe o timestamp mais recente.
    // Tenta primeiro via RPC transacional trak_reordenar_favoritos (sem delete+insert).
    const { error: rpcError } = await supabase.rpc("trak_reordenar_favoritos", {
      p_user_id: userId,
      p_media_item_ids: ordenados
    });

    if (rpcError) {
      // Fallback seguro: se a RPC ainda não estiver criada, atualiza createdAt diretamente
      // SEM apagar nenhum registro (evita perda de dados).
      await Promise.all(
        ordenados.map(async (mediaItemId, index) => {
          const novoTimestamp = new Date(baseMs - index * 1000).toISOString();
          const { error: updError } = await supabase
            .from("Favorite")
            .update({ createdAt: novoTimestamp })
            .eq("userId", userId)
            .eq("mediaItemId", mediaItemId);
          if (updError) {
            throw new InternalServerErrorException(updError.message);
          }
        })
      );
    }

    return { ok: true };
  }

  async remover(authUserId: string, mediaItemId: string) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.supabaseService.resolverUserId(authUserId);

    const [{ error }, { error: actError }] = await Promise.all([
      supabase.from("Favorite").delete().eq("userId", userId).eq("mediaItemId", mediaItemId),
      supabase
        .from("Activity")
        .delete()
        .eq("userId", userId)
        .eq("mediaItemId", mediaItemId)
        .eq("type", "FAVORITE")
    ]);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    if (actError) {
      throw new InternalServerErrorException(actError.message);
    }

    return { ok: true };
  }
}
