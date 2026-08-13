import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { SupabaseService } from "../../comum/supabase/supabase.service";

@Injectable()
export class FavoritosService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private async resolverUserId(authUserId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from("User")
      .select("id")
      .eq("authUserId", authUserId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    if (data?.id) {
      return data.id as string;
    }

    return authUserId;
  }

  async listar(authUserId: string) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.resolverUserId(authUserId);

    const { data: favoritos, error } = await supabase
      .from("Favorite")
      .select("mediaItemId,createdAt")
      .eq("userId", userId)
      .order("createdAt", { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    const mediaIds = (favoritos ?? []).map((f) => f.mediaItemId as string);

    if (mediaIds.length === 0) {
      return [];
    }

    const { data: itens, error: itensError } = await supabase
      .from("MediaItem")
      .select("id,externalId,source,type,title,coverUrl,synopsis,releaseYear")
      .in("id", mediaIds);

    if (itensError) {
      throw new InternalServerErrorException(itensError.message);
    }

    const mapa = new Map((itens ?? []).map((item) => [item.id as string, item]));

    return favoritos?.map((fav) => ({
      mediaItemId: fav.mediaItemId,
      createdAt: fav.createdAt,
      item: mapa.get(fav.mediaItemId as string) ?? null
    }));
  }

  async adicionar(authUserId: string, mediaItemId: string) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.resolverUserId(authUserId);

    const { error } = await supabase.from("Favorite").upsert(
      {
        id: randomUUID(),
        userId,
        mediaItemId
      },
      {
        onConflict: "userId,mediaItemId",
        ignoreDuplicates: false
      }
    );

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return { ok: true };
  }

  async remover(authUserId: string, mediaItemId: string) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.resolverUserId(authUserId);

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
