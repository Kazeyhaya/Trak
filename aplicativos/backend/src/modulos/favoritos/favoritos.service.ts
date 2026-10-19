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

  async remover(authUserId: string, mediaItemId: string) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.supabaseService.resolverUserId(authUserId);

    const { error } = await supabase
      .from("Favorite")
      .delete()
      .eq("userId", userId)
      .eq("mediaItemId", mediaItemId);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return { ok: true };
  }
}
