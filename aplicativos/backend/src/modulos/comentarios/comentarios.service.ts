import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import { CatalogoService } from "../catalogo/catalogo.service";
import { AtividadesService } from "../social/atividades.service";

export const CONTEUDO_REMOVIDO = "[comentário removido]";
import { DenunciarComentarioDto } from "./dto/denunciar-comentario.dto";

@Injectable()
export class ComentariosService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly catalogoService: CatalogoService,
    private readonly atividadesService: AtividadesService
  ) {}

  private async autoresPorIds(userIds: string[]) {
    const unicos = [...new Set(userIds)];
    if (unicos.length === 0) {
      return new Map<string, { username: string; displayName: string | null }>();
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from("User")
      .select("id,username,displayName")
      .in("id", unicos);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return new Map(
      (data ?? []).map((u) => [
        u.id as string,
        { username: u.username as string, displayName: (u.displayName as string | null) ?? null }
      ])
    );
  }

  async listarPorMidia(mediaItemId: string, authUserId?: string) {
    const supabase = this.supabaseService.getClient();
    const userId = authUserId ? await this.supabaseService.resolverUserId(authUserId) : null;

    const { data: comentarios, error } = await supabase
      .from("Comment")
      .select("id,userId,mediaItemId,content,createdAt,updatedAt")
      .eq("mediaItemId", mediaItemId)
      .order("createdAt", { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    const visiveis = (comentarios ?? []).filter((c) => c.content !== CONTEUDO_REMOVIDO);
    const comentarioIds = visiveis.map((c) => c.id as string);
    const likesCount = new Map<string, number>();
    const likesDoUsuario = new Set<string>();

    const [autores] = await Promise.all([
      this.autoresPorIds(visiveis.map((c) => c.userId as string)),
      (async () => {
        if (comentarioIds.length === 0) {
          return;
        }
        const { data: likes, error: likesError } = await supabase
          .from("CommentLike")
          .select("commentId,userId")
          .in("commentId", comentarioIds);

        if (likesError) {
          throw new InternalServerErrorException(likesError.message);
        }

        for (const like of likes ?? []) {
          const commentId = like.commentId as string;
          likesCount.set(commentId, (likesCount.get(commentId) ?? 0) + 1);
          if ((like.userId as string) === userId) {
            likesDoUsuario.add(commentId);
          }
        }
      })()
    ]);

    return visiveis.map((comentario) => ({
      ...comentario,
      user: autores.get(comentario.userId as string) ?? null,
      likesCount: likesCount.get(comentario.id as string) ?? 0,
      likedByUser: likesDoUsuario.has(comentario.id as string),
      isOwn: comentario.userId === userId
    }));
  }

  async criar(mediaItemId: string, authUserId: string, content: string) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.supabaseService.resolverUserId(authUserId);

    await this.catalogoService.garantirNoBanco(mediaItemId);

    const { data, error } = await supabase
      .from("Comment")
      .insert({
        id: randomUUID(),
        mediaItemId,
        userId,
        content,
        updatedAt: new Date().toISOString()
      })
      .select("id,userId,mediaItemId,content,createdAt,updatedAt")
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    const [autores] = await Promise.all([
      this.autoresPorIds([userId]),
      this.atividadesService.registrar(userId, "COMMENT", mediaItemId, { commentId: data.id })
    ]);

    return {
      ...data,
      user: autores.get(userId) ?? null,
      likesCount: 0,
      likedByUser: false,
      isOwn: true
    };
  }

  async curtir(comentarioId: string, authUserId: string) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.supabaseService.resolverUserId(authUserId);

    const { data: comentario, error: comentarioError } = await supabase
      .from("Comment")
      .select("id,content")
      .eq("id", comentarioId)
      .maybeSingle();

    if (comentarioError) {
      throw new InternalServerErrorException(comentarioError.message);
    }

    if (!comentario || comentario.content === CONTEUDO_REMOVIDO) {
      throw new NotFoundException("Comentario nao encontrado.");
    }

    const { error } = await supabase.from("CommentLike").upsert(
      {
        id: randomUUID(),
        commentId: comentarioId,
        userId
      },
      {
        onConflict: "commentId,userId",
        ignoreDuplicates: true
      }
    );

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return this.contarCurtidas(comentarioId);
  }

  async descurtir(comentarioId: string, authUserId: string) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.supabaseService.resolverUserId(authUserId);

    const { error } = await supabase
      .from("CommentLike")
      .delete()
      .eq("commentId", comentarioId)
      .eq("userId", userId);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return this.contarCurtidas(comentarioId);
  }

  async remover(comentarioId: string, authUserId: string) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.supabaseService.resolverUserId(authUserId);

    const { data: comentario, error: comentarioError } = await supabase
      .from("Comment")
      .select("id,userId")
      .eq("id", comentarioId)
      .maybeSingle();

    if (comentarioError) {
      throw new InternalServerErrorException(comentarioError.message);
    }

    if (!comentario) {
      throw new NotFoundException("Comentario nao encontrado.");
    }

    if (comentario.userId !== userId) {
      throw new ForbiddenException("Voce so pode apagar seus proprios comentarios.");
    }

    const { error: likesError } = await supabase
      .from("CommentLike")
      .delete()
      .eq("commentId", comentarioId);

    if (likesError) {
      throw new InternalServerErrorException(likesError.message);
    }

    await this.apagarOuOcultar(comentarioId);
    return { ok: true };
  }

  // Apaga o comentario; se o banco impedir (ex.: denuncia vinculada por chave
  // estrangeira), oculta o conteudo para preservar o historico de moderacao.
  async apagarOuOcultar(comentarioId: string) {
    const supabase = this.supabaseService.getClient();
    const { error } = await supabase.from("Comment").delete().eq("id", comentarioId);

    if (error?.code === "23503") {
      const { error: updateError } = await supabase
        .from("Comment")
        .update({ content: CONTEUDO_REMOVIDO, updatedAt: new Date().toISOString() })
        .eq("id", comentarioId);

      if (updateError) {
        throw new InternalServerErrorException(updateError.message);
      }
      return;
    }

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  private async contarCurtidas(comentarioId: string) {
    const supabase = this.supabaseService.getClient();
    const { count, error } = await supabase
      .from("CommentLike")
      .select("id", { count: "exact", head: true })
      .eq("commentId", comentarioId);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return {
      commentId: comentarioId,
      likesCount: count ?? 0
    };
  }

  async denunciar(
    comentarioId: string,
    authUserId: string,
    payload: DenunciarComentarioDto
  ) {
    const supabase = this.supabaseService.getClient();
    const reporterUserId = await this.supabaseService.resolverUserId(authUserId);

    const { data: comentario, error: comentarioError } = await supabase
      .from("Comment")
      .select("id,content")
      .eq("id", comentarioId)
      .maybeSingle();

    if (comentarioError) {
      throw new InternalServerErrorException(comentarioError.message);
    }

    if (!comentario || comentario.content === CONTEUDO_REMOVIDO) {
      throw new NotFoundException("Comentario nao encontrado.");
    }

    const { data: existente, error: existenteError } = await supabase
      .from("CommentReport")
      .select("id,commentId,reporterUserId,reason,details,status,createdAt")
      .eq("commentId", comentarioId)
      .eq("reporterUserId", reporterUserId)
      .maybeSingle();

    if (existenteError) {
      throw new InternalServerErrorException(existenteError.message);
    }

    if (existente) {
      return existente;
    }

    const { data, error } = await supabase
      .from("CommentReport")
      .insert({
        id: randomUUID(),
        commentId: comentarioId,
        reporterUserId,
        reason: payload.reason,
        details: payload.details,
        updatedAt: new Date().toISOString()
      })
      .select("id,commentId,reporterUserId,reason,details,status,createdAt")
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }
}
