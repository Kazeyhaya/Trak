import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import { CatalogoService } from "../catalogo/catalogo.service";
import { SalvarTrackingDto } from "./dto/salvar-tracking.dto";

const CAMPOS = "id,mediaItemId,status,progress,favorite,updatedAt";

@Injectable()
export class TrackingService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly catalogoService: CatalogoService
  ) {}

  async listar(authUserId: string) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.supabaseService.resolverUserId(authUserId);

    const { data, error } = await supabase
      .from("TrackingItem")
      .select(CAMPOS)
      .eq("userId", userId)
      .order("updatedAt", { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    const itens = await this.catalogoService.buscarSalvos((data ?? []).map((t) => t.mediaItemId as string));

    return (data ?? []).map((tracking) => ({
      ...tracking,
      item: itens.get(tracking.mediaItemId as string) ?? null
    }));
  }

  async buscar(authUserId: string, mediaItemId: string) {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    return this.buscarRegistro(userId, mediaItemId);
  }

  private async buscarRegistro(userId: string, mediaItemId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("TrackingItem")
      .select(CAMPOS)
      .eq("userId", userId)
      .eq("mediaItemId", mediaItemId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async salvar(authUserId: string, mediaItemId: string, payload: SalvarTrackingDto) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.supabaseService.resolverUserId(authUserId);
    const existente = await this.buscarRegistro(userId, mediaItemId);
    const updatedAt = new Date().toISOString();

    // Atualizacao parcial: campos nao enviados mantem o valor salvo.
    if (existente) {
      const alteracoes = Object.fromEntries(
        Object.entries(payload).filter(([, valor]) => valor !== undefined)
      );
      const { data, error } = await supabase
        .from("TrackingItem")
        .update({ ...alteracoes, updatedAt })
        .eq("id", existente.id)
        .select(CAMPOS)
        .single();

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      return data;
    }

    await this.catalogoService.garantirNoBanco(mediaItemId);

    const { data, error } = await supabase
      .from("TrackingItem")
      .insert({
        id: randomUUID(),
        userId,
        mediaItemId,
        status: payload.status ?? "WANT",
        progress: payload.progress ?? 0,
        favorite: payload.favorite ?? false,
        updatedAt
      })
      .select(CAMPOS)
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async remover(authUserId: string, mediaItemId: string) {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    const { error } = await this.supabaseService
      .getClient()
      .from("TrackingItem")
      .delete()
      .eq("userId", userId)
      .eq("mediaItemId", mediaItemId);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return { ok: true };
  }
}
