import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { SupabaseService } from "../../comum/supabase/supabase.service";

@Injectable()
export class TrackingService {
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

    return data?.id ? (data.id as string) : authUserId;
  }

  async listar(authUserId: string) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.resolverUserId(authUserId);

    const { data, error } = await supabase
      .from("TrackingItem")
      .select("id,mediaItemId,status,progress,favorite,updatedAt")
      .eq("userId", userId)
      .order("updatedAt", { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data ?? [];
  }

  async salvar(authUserId: string, mediaItemId: string, payload: { status?: string; progress?: number; favorite?: boolean }) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.resolverUserId(authUserId);

    const nextPayload = {
      id: randomUUID(),
      userId,
      mediaItemId,
      status: payload.status ?? "WANT",
      progress: payload.progress ?? 0,
      favorite: payload.favorite ?? false,
      updatedAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("TrackingItem")
      .upsert(nextPayload, {
        onConflict: "userId,mediaItemId",
        ignoreDuplicates: false
      })
      .select("id,mediaItemId,status,progress,favorite,updatedAt")
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }
}
