import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { SupabaseService } from "../../comum/supabase/supabase.service";

export type TipoNotificacao = "FOLLOW" | "COMMENT" | "REPLY" | "MEDIA_UPDATE";

export interface CriarNotificacaoInput {
  userId: string;
  actorId?: string | null;
  type: TipoNotificacao;
  title: string;
  body?: string | null;
  mediaItemId?: string | null;
  link: string;
  data?: Record<string, unknown>;
}

export interface NotificacaoItem {
  id: string;
  userId: string;
  actorId?: string | null;
  type: TipoNotificacao;
  title: string;
  body?: string | null;
  mediaItemId?: string | null;
  link: string;
  read: boolean;
  data: Record<string, unknown>;
  createdAt: string;
  actor?: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

@Injectable()
export class NotificacoesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async criar(input: CriarNotificacaoInput) {
    // Não notifica ações do próprio usuário sobre si mesmo
    if (input.actorId && input.actorId === input.userId) {
      return null;
    }

    const payload = {
      id: randomUUID(),
      userId: input.userId,
      actorId: input.actorId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      mediaItemId: input.mediaItemId ?? null,
      link: input.link,
      read: false,
      data: input.data ?? {}
    };

    const { data, error } = await this.db
      .from("Notification")
      .insert(payload)
      .select("id,userId,actorId,type,title,body,mediaItemId,link,read,data,createdAt")
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async listar(authUserId: string, limite = 30): Promise<NotificacaoItem[]> {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    const limiteSeguro = Math.max(1, Math.min(100, Number(limite) || 30));

    const { data, error } = await this.db
      .from("Notification")
      .select("id,userId,actorId,type,title,body,mediaItemId,link,read,data,createdAt")
      .eq("userId", userId)
      .order("createdAt", { ascending: false })
      .limit(limiteSeguro);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    const notificacoes = (data ?? []) as NotificacaoItem[];
    const actorIds = [...new Set(notificacoes.map((n) => n.actorId).filter(Boolean) as string[])];

    const atoresMap = new Map<string, { username: string; displayName: string | null; avatarUrl: string | null }>();

    if (actorIds.length > 0) {
      const { data: usuarios, error: usuariosErro } = await this.db
        .from("User")
        .select("id,username,displayName,avatarUrl")
        .in("id", actorIds);

      if (!usuariosErro && usuarios) {
        for (const u of usuarios) {
          atoresMap.set(u.id as string, {
            username: u.username as string,
            displayName: (u.displayName as string | null) ?? null,
            avatarUrl: (u.avatarUrl as string | null) ?? null
          });
        }
      }
    }

    return notificacoes.map((item) => ({
      ...item,
      actor: item.actorId ? atoresMap.get(item.actorId) ?? null : null
    }));
  }

  async contarNaoLidas(authUserId: string): Promise<{ count: number }> {
    const userId = await this.supabaseService.resolverUserId(authUserId);

    const { count, error } = await this.db
      .from("Notification")
      .select("id", { count: "exact", head: true })
      .eq("userId", userId)
      .eq("read", false);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return { count: count ?? 0 };
  }

  async marcarLida(id: string, authUserId: string): Promise<{ ok: boolean }> {
    const userId = await this.supabaseService.resolverUserId(authUserId);

    const { error } = await this.db
      .from("Notification")
      .update({ read: true })
      .eq("id", id)
      .eq("userId", userId);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return { ok: true };
  }

  async marcarTodasLidas(authUserId: string): Promise<{ ok: boolean }> {
    const userId = await this.supabaseService.resolverUserId(authUserId);

    const { error } = await this.db
      .from("Notification")
      .update({ read: true })
      .eq("userId", userId)
      .eq("read", false);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return { ok: true };
  }
}
