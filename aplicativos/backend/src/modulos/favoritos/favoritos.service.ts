import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
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

    const { data: favoritos, error } = await supabase
      .from("Favorite")
      .select("mediaItemId,createdAt")
      .eq("userId", userId)
      .order("createdAt", { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    const itens = await this.catalogoService.buscarSalvos(
      (favoritos ?? []).map((f) => f.mediaItemId as string)
    );

    return (favoritos ?? []).map((fav) => ({
      mediaItemId: fav.mediaItemId,
      createdAt: fav.createdAt,
      item: itens.get(fav.mediaItemId as string) ?? null
    }));
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
    const baseMs = Date.now();

    // Favorite e ordenado por createdAt DESC; o primeiro da lista recebe o timestamp mais recente.
    await Promise.all(
      ordenados.map(async (mediaItemId, index) => {
        const novoTimestamp = new Date(baseMs - index * 1000).toISOString();
        const { error: delError } = await supabase
          .from("Favorite")
          .delete()
          .eq("userId", userId)
          .eq("mediaItemId", mediaItemId);
        if (delError) {
          throw new InternalServerErrorException(delError.message);
        }
        const { error: insError } = await supabase.from("Favorite").insert({
          id: randomUUID(),
          userId,
          mediaItemId,
          createdAt: novoTimestamp
        });
        if (insError) {
          throw new InternalServerErrorException(insError.message);
        }
      })
    );

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
