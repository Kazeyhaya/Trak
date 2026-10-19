import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import { CatalogoService } from "../catalogo/catalogo.service";
import { ComentariosService } from "../comentarios/comentarios.service";
import { ModerarDenunciaDto, StatusDenuncia } from "./dto/moderar-denuncia.dto";

const CAMPOS = "id,commentId,reporterUserId,reason,details,status,createdAt";

type Denuncia = {
  id: string;
  commentId: string;
  reporterUserId: string;
  reason: string;
  details: string | null;
  status: StatusDenuncia;
  createdAt: string;
};

function falha(error: { message: string } | null) {
  if (error) {
    throw new InternalServerErrorException(error.message);
  }
}

@Injectable()
export class ModeracaoService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly catalogoService: CatalogoService,
    private readonly comentariosService: ComentariosService
  ) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async listar(status?: StatusDenuncia) {
    let consulta = this.db.from("CommentReport").select(CAMPOS).order("createdAt", { ascending: true }).limit(100);
    if (status) {
      consulta = consulta.eq("status", status);
    }
    const { data, error } = await consulta;
    falha(error);

    const denuncias = (data ?? []) as Denuncia[];
    const { data: comentarios, error: comentariosError } = denuncias.length
      ? await this.db
          .from("Comment")
          .select("id,userId,mediaItemId,content,createdAt")
          .in("id", [...new Set(denuncias.map((d) => d.commentId))])
      : { data: [], error: null };
    falha(comentariosError);

    const porId = new Map((comentarios ?? []).map((c) => [c.id as string, c]));
    const itens = await this.catalogoService.buscarSalvos((comentarios ?? []).map((c) => c.mediaItemId as string));
    // Quantas denuncias cada comentario recebeu (ajuda a priorizar).
    const contagem = denuncias.reduce<Record<string, number>>((acc, d) => {
      acc[d.commentId] = (acc[d.commentId] ?? 0) + 1;
      return acc;
    }, {});

    return denuncias.map((denuncia) => {
      const comentario = porId.get(denuncia.commentId);
      return {
        ...denuncia,
        reportsForComment: contagem[denuncia.commentId],
        comment: comentario ?? null,
        item: comentario ? (itens.get(comentario.mediaItemId as string) ?? null) : null
      };
    });
  }

  async moderar(id: string, payload: ModerarDenunciaDto) {
    const { data: denuncia, error } = await this.db.from("CommentReport").select(CAMPOS).eq("id", id).maybeSingle();
    falha(error);

    if (!denuncia) {
      throw new NotFoundException("Denuncia nao encontrada.");
    }

    // Atualiza o status antes de remover o comentario, caso a remocao apague a denuncia em cascata.
    const { data: atualizada, error: updateError } = await this.db
      .from("CommentReport")
      .update({ status: payload.status, updatedAt: new Date().toISOString() })
      .eq("id", id)
      .select(CAMPOS)
      .single();
    falha(updateError);

    if (payload.removerComentario) {
      // Fecha as outras denuncias do mesmo comentario.
      const { error: outrasError } = await this.db
        .from("CommentReport")
        .update({ status: "RESOLVED", updatedAt: new Date().toISOString() })
        .eq("commentId", denuncia.commentId)
        .in("status", ["OPEN", "REVIEWING"]);
      falha(outrasError);

      const { error: likesError } = await this.db.from("CommentLike").delete().eq("commentId", denuncia.commentId);
      falha(likesError);
      await this.comentariosService.apagarOuOcultar(denuncia.commentId as string);
    }

    return atualizada;
  }
}
