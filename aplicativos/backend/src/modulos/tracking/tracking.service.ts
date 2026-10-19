import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import { CatalogoService } from "../catalogo/catalogo.service";
import { ItemCatalogo } from "../catalogo/catalogo.types";
import { AtividadesService } from "../social/atividades.service";
import { MarcarEpisodiosDto } from "./dto/marcar-episodios.dto";
import { SalvarTrackingDto } from "./dto/salvar-tracking.dto";
import {
  CAMPOS_TRACKING,
  deBanco,
  LinhaUserMedia,
  paraBanco,
  TABELA_TRACKING
} from "./tracking.banco";
import { calcularProgresso, normalizarAlteracao, statusAposEpisodios } from "./tracking.regras";

export type { RegistroTracking } from "./tracking.banco";

type OpcoesSalvar = {
  // A importacao em lote nao gera uma atividade por item.
  registrarAtividade?: boolean;
  item?: ItemCatalogo;
};

function falha(error: { message: string } | null) {
  if (error) {
    throw new InternalServerErrorException(error.message);
  }
}

@Injectable()
export class TrackingService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly catalogoService: CatalogoService,
    private readonly atividadesService: AtividadesService
  ) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async listar(authUserId: string) {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    const registros = await this.listarDoUsuario(userId);
    const itens = await this.catalogoService.buscarSalvos(registros.map((t) => t.mediaItemId));

    return registros.map((tracking) => ({
      ...tracking,
      item: itens.get(tracking.mediaItemId) ?? null
    }));
  }

  async listarDoUsuario(userId: string) {
    const { data, error } = await this.db
      .from(TABELA_TRACKING)
      .select(CAMPOS_TRACKING)
      .eq("userId", userId)
      .order("updatedAt", { ascending: false });
    falha(error);
    return ((data ?? []) as LinhaUserMedia[]).map(deBanco);
  }

  async buscar(authUserId: string, mediaItemId: string) {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    const linha = await this.buscarLinha(userId, mediaItemId);
    return linha ? deBanco(linha) : null;
  }

  private async buscarLinha(userId: string, mediaItemId: string) {
    const { data, error } = await this.db
      .from(TABELA_TRACKING)
      .select(CAMPOS_TRACKING)
      .eq("userId", userId)
      .eq("mediaItemId", mediaItemId)
      .maybeSingle();
    falha(error);
    return data as LinhaUserMedia | null;
  }

  async salvar(authUserId: string, mediaItemId: string, payload: SalvarTrackingDto) {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    return this.salvarParaUsuario(userId, mediaItemId, payload);
  }

  async salvarParaUsuario(
    userId: string,
    mediaItemId: string,
    payload: SalvarTrackingDto,
    { registrarAtividade = true, item }: OpcoesSalvar = {}
  ) {
    const linhaExistente = await this.buscarLinha(userId, mediaItemId);
    const existente = linhaExistente ? deBanco(linhaExistente) : null;
    const agora = new Date().toISOString();
    const alteracoes = normalizarAlteracao(
      Object.fromEntries(Object.entries(payload).filter(([, valor]) => valor !== undefined)) as SalvarTrackingDto
    );

    let linha: LinhaUserMedia;

    // Atualizacao parcial: campos nao enviados mantem o valor salvo.
    if (linhaExistente) {
      const { data, error } = await this.db
        .from(TABELA_TRACKING)
        .update({ ...paraBanco(alteracoes, linhaExistente, agora), updatedAt: agora })
        .eq("id", linhaExistente.id)
        .select(CAMPOS_TRACKING)
        .single();
      falha(error);
      linha = data as LinhaUserMedia;
    } else {
      await this.catalogoService.garantirNoBanco(mediaItemId, item);

      const { data, error } = await this.db
        .from(TABELA_TRACKING)
        .insert({
          id: randomUUID(),
          userId,
          mediaItemId,
          status: "WANT",
          progressCurrent: 0,
          timesConsumed: 0,
          ...paraBanco(alteracoes, null, agora),
          createdAt: agora,
          updatedAt: agora
        })
        .select(CAMPOS_TRACKING)
        .single();
      falha(error);
      linha = data as LinhaUserMedia;
    }

    const salvo = deBanco(linha);

    if (registrarAtividade) {
      if (salvo.status !== existente?.status) {
        await this.atividadesService.registrar(userId, "STATUS", mediaItemId, { status: salvo.status });
      }
      if (alteracoes.rating && alteracoes.rating !== existente?.rating) {
        await this.atividadesService.registrar(userId, "RATING", mediaItemId, { rating: alteracoes.rating });
      }
    }

    return salvo;
  }

  async remover(authUserId: string, mediaItemId: string) {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    const [{ error }, { error: episodiosError }] = await Promise.all([
      this.db.from(TABELA_TRACKING).delete().eq("userId", userId).eq("mediaItemId", mediaItemId),
      this.db.from("EpisodeProgress").delete().eq("userId", userId).eq("mediaItemId", mediaItemId)
    ]);
    falha(error);
    falha(episodiosError);
    return { ok: true };
  }

  // Episodios

  async listarEpisodios(authUserId: string, mediaItemId: string) {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    return this.episodiosDoUsuario(userId, mediaItemId);
  }

  private async episodiosDoUsuario(userId: string, mediaItemId: string) {
    const { data, error } = await this.db
      .from("EpisodeProgress")
      .select("season,episode")
      .eq("userId", userId)
      .eq("mediaItemId", mediaItemId)
      .order("season")
      .order("episode");
    falha(error);
    return (data ?? []) as Array<{ season: number; episode: number }>;
  }

  // Grava episodios em lote (importacao) e recalcula o progresso, sem gerar atividade.
  async importarEpisodios(userId: string, mediaItemId: string, episodios: Array<{ season: number; episode: number }>) {
    const { error } = await this.db.from("EpisodeProgress").upsert(
      episodios.map((e) => ({ userId, mediaItemId, season: e.season, episode: e.episode })),
      { onConflict: "userId,mediaItemId,season,episode", ignoreDuplicates: true }
    );
    falha(error);

    const total = await this.catalogoService.totalEpisodiosExibidos(mediaItemId).catch(() => 0);
    const progresso = calcularProgresso(episodios.filter((e) => e.season > 0).length, total);
    await this.salvarParaUsuario(
      userId,
      mediaItemId,
      { progress: progresso, status: statusAposEpisodios("WATCHING", progresso) },
      { registrarAtividade: false }
    );
  }

  async marcarEpisodios(authUserId: string, mediaItemId: string, payload: MarcarEpisodiosDto) {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    // Valida que e uma serie antes de gravar qualquer coisa.
    const total = await this.catalogoService.totalEpisodiosExibidos(mediaItemId);
    const episodios = [...new Set(payload.episodes)];

    if (payload.watched) {
      const { error } = await this.db.from("EpisodeProgress").upsert(
        episodios.map((episode) => ({ userId, mediaItemId, season: payload.season, episode })),
        { onConflict: "userId,mediaItemId,season,episode", ignoreDuplicates: true }
      );
      falha(error);
    } else {
      const { error } = await this.db
        .from("EpisodeProgress")
        .delete()
        .eq("userId", userId)
        .eq("mediaItemId", mediaItemId)
        .eq("season", payload.season)
        .in("episode", episodios);
      falha(error);
    }

    const assistidos = await this.episodiosDoUsuario(userId, mediaItemId);
    // Especiais (temporada 0) nao contam para o progresso.
    const progresso = calcularProgresso(assistidos.filter((e) => e.season > 0).length, total);
    const atual = await this.buscarLinha(userId, mediaItemId);
    const tracking = await this.salvarParaUsuario(
      userId,
      mediaItemId,
      { progress: progresso, status: statusAposEpisodios(atual ? deBanco(atual).status : undefined, progresso) },
      { registrarAtividade: true }
    );

    if (payload.watched) {
      await this.atividadesService.registrar(userId, "EPISODES", mediaItemId, {
        season: payload.season,
        count: episodios.length
      });
    }

    return { episodes: assistidos, tracking };
  }
}
