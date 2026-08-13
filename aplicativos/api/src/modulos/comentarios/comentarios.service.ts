import {
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import { DenunciarComentarioDto } from "./dto/denunciar-comentario.dto";

@Injectable()
export class ComentariosService {
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

  async listarPorMidia(mediaItemId: string, authUserId: string) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.resolverUserId(authUserId);

    const { data: comentarios, error } = await supabase
      .from("Comment")
      .select("id,userId,mediaItemId,content,createdAt,updatedAt")
      .eq("mediaItemId", mediaItemId)
      .order("createdAt", { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    const comentarioIds = (comentarios ?? []).map((c) => c.id as string);
    const likesCount = new Map<string, number>();
    const likesDoUsuario = new Set<string>();

    if (comentarioIds.length > 0) {
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
    }

    return (comentarios ?? []).map((comentario) => ({
        ...comentario,
        likesCount: likesCount.get(comentario.id as string) ?? 0,
        likedByUser: likesDoUsuario.has(comentario.id as string)
      }));
  }

  async criar(mediaItemId: string, authUserId: string, content: string) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.resolverUserId(authUserId);

    const { data, error } = await supabase
      .from("Comment")
      .insert({
        id: randomUUID(),
        mediaItemId,
        userId,
        content
      })
      .select("id,userId,mediaItemId,content,createdAt,updatedAt")
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return {
      ...data,
      likesCount: 0,
      likedByUser: false
    };
  }

  async curtir(comentarioId: string, authUserId: string) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.resolverUserId(authUserId);

    const { data: comentario, error: comentarioError } = await supabase
      .from("Comment")
      .select("id")
      .eq("id", comentarioId)
      .maybeSingle();

    if (comentarioError) {
      throw new InternalServerErrorException(comentarioError.message);
    }

    if (!comentario) {
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
        ignoreDuplicates: false
      }
    );

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return this.contarCurtidas(comentarioId);
  }

  async descurtir(comentarioId: string, authUserId: string) {
    const supabase = this.supabaseService.getClient();
    const userId = await this.resolverUserId(authUserId);

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
    const reporterUserId = await this.resolverUserId(authUserId);

    const { data: comentario, error: comentarioError } = await supabase
      .from("Comment")
      .select("id")
      .eq("id", comentarioId)
      .maybeSingle();

    if (comentarioError) {
      throw new InternalServerErrorException(comentarioError.message);
    }

    if (!comentario) {
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
        details: payload.details
      })
      .select("id,commentId,reporterUserId,reason,details,status,createdAt")
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }
}
