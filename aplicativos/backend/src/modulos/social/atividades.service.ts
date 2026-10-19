import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { SupabaseService } from "../../comum/supabase/supabase.service";

export type TipoAtividade = "STATUS" | "RATING" | "COMMENT" | "FAVORITE" | "EPISODES";

@Injectable()
export class AtividadesService {
  private readonly logger = new Logger(AtividadesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // Best-effort: o feed nunca deve impedir a acao principal do usuario.
  async registrar(userId: string, type: TipoAtividade, mediaItemId: string | null, data: Record<string, unknown> = {}) {
    const { error } = await this.supabaseService
      .getClient()
      .from("Activity")
      .insert({ id: randomUUID(), userId, type, mediaItemId, data });

    if (error) {
      this.logger.warn(`Nao foi possivel registrar atividade ${type}: ${error.message}`);
    }
  }
}
