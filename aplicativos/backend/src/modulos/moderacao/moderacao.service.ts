import { Injectable, NotFoundException } from "@nestjs/common";
import { falha } from "../../comum/erros";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import { CatalogoService } from "../catalogo/catalogo.service";
import { ComentariosService, CONTEUDO_REMOVIDO } from "../comentarios/comentarios.service";
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
    // Filtrando por status, a lista e uma fila (mais antiga primeiro). Sem filtro, mostra as
    // mais recentes: em ordem crescente, denuncias novas sumiriam atras das 100 primeiras.
    let consulta = this.db
      .from("CommentReport")
      .select(CAMPOS)
      .order("createdAt", { ascending: Boolean(status) })
      .limit(100);
    if (status) {
      consulta = consulta.eq("status", status);
    }
    const { data, error } = await consulta;
    falha(error);

    const denuncias = (data ?? []) as Denuncia[];
    const { data: comentarios, error: comentariosError } = denuncias.length
      ? await this.db
          .from("Comment")
          .select("id,userId,mediaItemId,content,originalContent,createdAt")
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
      const linha = porId.get(denuncia.commentId);
      // O moderador ve o texto denunciado mesmo depois de ocultado; `removed` indica que saiu do ar.
      const comentario = linha
        ? {
            id: linha.id,
            userId: linha.userId,
            mediaItemId: linha.mediaItemId,
            createdAt: linha.createdAt,
            content: (linha.originalContent as string | null) ?? linha.content,
            removed: linha.content === CONTEUDO_REMOVIDO
          }
        : null;
      return {
        ...denuncia,
        reportsForComment: contagem[denuncia.commentId],
        comment: comentario,
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
