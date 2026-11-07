import { BadRequestException, Injectable } from "@nestjs/common";
import { falha } from "../../comum/erros";
import { randomUUID } from "node:crypto";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import { parsearId } from "../catalogo/catalogo.fontes";
import { CatalogoService } from "../catalogo/catalogo.service";
import { ItemCatalogo } from "../catalogo/catalogo.types";
import { AtividadesService } from "../social/atividades.service";
import { AvaliarEpisodioDto } from "./dto/avaliar-episodio.dto";
import { DefinirVezesEpisodioDto } from "./dto/definir-vezes-episodio.dto";
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

function exigirSerie(mediaItemId: string) {
  const parsed = parsearId(mediaItemId);
  if (parsed?.source !== "tmdb" || parsed.type !== "SERIES") {
    throw new BadRequestException("Episodios so existem para series.");
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

    return registros.map((tracking) => {
      const itemBase = itens.get(tracking.mediaItemId) ?? null;
      const item =
        itemBase && tracking.customCoverUrl ? { ...itemBase, coverUrl: tracking.customCoverUrl } : itemBase;
      return {
        ...tracking,
        item
      };
    });
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

    if (payload.status === "COMPLETED") {
      const infoSerie = await this.catalogoService.infoEpisodiosSerie(mediaItemId).catch(() => null);
      if (infoSerie?.isOngoing) {
        throw new BadRequestException(
          "Esta série ainda está em lançamento e não pode ser marcada como concluída."
        );
      }
    }

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

    if (alteracoes.timesConsumed !== undefined && (alteracoes.status ?? existente?.status) !== "COMPLETED") {
      throw new BadRequestException("Conclua a obra antes de contar outra vez.");
    }

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

      // Se duas requisicoes chegarem ao mesmo tempo, a segunda encontra a linha recem-criada e faz update.
      if (error?.code === "23505") {
        const recemCriada = await this.buscarLinha(userId, mediaItemId);
        if (recemCriada) {
          const { data: dataUpdate, error: errorUpdate } = await this.db
            .from(TABELA_TRACKING)
            .update({ ...paraBanco(alteracoes, recemCriada, agora), updatedAt: agora })
            .eq("id", recemCriada.id)
            .select(CAMPOS_TRACKING)
            .single();
          falha(errorUpdate);
          linha = dataUpdate as LinhaUserMedia;
        } else {
          falha(error);
          linha = data as LinhaUserMedia;
        }
      } else {
        falha(error);
        linha = data as LinhaUserMedia;
      }
    }

    const salvo = deBanco(linha);

    if (alteracoes.rating === null && existente?.rating) {
      const { error: ratingActError } = await this.db
        .from("Activity")
        .delete()
        .eq("userId", userId)
        .eq("mediaItemId", mediaItemId)
        .eq("type", "RATING");
      falha(ratingActError);
    }

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
    const [{ error }, { error: episodiosError }, { error: atividadesError }] = await Promise.all([
      this.db.from(TABELA_TRACKING).delete().eq("userId", userId).eq("mediaItemId", mediaItemId),
      this.db.from("EpisodeProgress").delete().eq("userId", userId).eq("mediaItemId", mediaItemId),
      this.db
        .from("Activity")
        .delete()
        .eq("userId", userId)
        .eq("mediaItemId", mediaItemId)
        .in("type", ["STATUS", "RATING", "EPISODES"])
    ]);
    falha(error);
    falha(episodiosError);
    falha(atividadesError);
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
      .select("season,episode,timesWatched,rating,highlightCharacterId,highlightCharacterName,highlightCharacterAvatar")
      .eq("userId", userId)
      .eq("mediaItemId", mediaItemId)
      .order("season")
      .order("episode");
    falha(error);
    return (data ?? []) as Array<{
      season: number;
      episode: number;
      timesWatched?: number;
      rating?: number | null;
      highlightCharacterId?: string | null;
      highlightCharacterName?: string | null;
      highlightCharacterAvatar?: string | null;
    }>;
  }

  // Grava episodios em lote (importacao) e recalcula o progresso, sem gerar atividade.
  async importarEpisodios(userId: string, mediaItemId: string, episodios: Array<{ season: number; episode: number }>) {
    await this.catalogoService.garantirNoBanco(mediaItemId);
    const unicos = [
      ...new Map(episodios.map((e) => [`${e.season}:${e.episode}`, e])).values()
    ];
    const { error } = await this.db.from("EpisodeProgress").upsert(
      unicos.map((e) => ({ userId, mediaItemId, season: e.season, episode: e.episode })),
      { onConflict: "userId,mediaItemId,season,episode", ignoreDuplicates: true }
    );
    falha(error);

    await this.recalcularProgresso(userId, mediaItemId);
  }

  async marcarEpisodios(authUserId: string, mediaItemId: string, payload: MarcarEpisodiosDto) {
    exigirSerie(mediaItemId);
    const userId = await this.supabaseService.resolverUserId(authUserId);
    await this.catalogoService.garantirNoBanco(mediaItemId);
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

    const { assistidos, tracking } = await this.recalcularProgresso(userId, mediaItemId);
    const assistidosNaTemporada = assistidos.filter((e) => e.season === payload.season);

    // Uma atividade de episodios por obra: a nova substitui a anterior.
    const { error: atividadeError } = await this.db
      .from("Activity")
      .delete()
      .eq("userId", userId)
      .eq("mediaItemId", mediaItemId)
      .eq("type", "EPISODES");
    falha(atividadeError);

    if (payload.watched && assistidosNaTemporada.length > 0) {
      await this.atividadesService.registrar(userId, "EPISODES", mediaItemId, {
        season: payload.season,
        count: assistidosNaTemporada.length
      });
    }

    return { episodes: assistidos, tracking };
  }

  // Nota do episodio e/ou quem roubou a cena. Avaliar tambem marca o episodio como assistido,
  // por isso o progresso da obra e recalculado.
  async avaliarEpisodio(authUserId: string, mediaItemId: string, dto: AvaliarEpisodioDto) {
    exigirSerie(mediaItemId);
    const userId = await this.supabaseService.resolverUserId(authUserId);
    await this.catalogoService.garantirNoBanco(mediaItemId);

    const payloadAtualizacao: Record<string, unknown> = {
      userId,
      mediaItemId,
      season: dto.season,
      episode: dto.episode
    };

    if (dto.rating !== undefined) {
      payloadAtualizacao.rating = dto.rating;
    }
    if (dto.highlightCharacterId !== undefined) {
      payloadAtualizacao.highlightCharacterId = dto.highlightCharacterId;
    }
    if (dto.highlightCharacterName !== undefined) {
      payloadAtualizacao.highlightCharacterName = dto.highlightCharacterName;
    }
    if (dto.highlightCharacterAvatar !== undefined) {
      payloadAtualizacao.highlightCharacterAvatar = dto.highlightCharacterAvatar;
    }

    const { error } = await this.db.from("EpisodeProgress").upsert(payloadAtualizacao, {
      onConflict: "userId,mediaItemId,season,episode"
    });
    falha(error);

    const { assistidos, tracking } = await this.recalcularProgresso(userId, mediaItemId);
    return { episodes: assistidos, tracking };
  }

  // Rever um episodio: grava quantas vezes ele foi assistido. So para episodios ja marcados;
  // desmarcar o episodio continua sendo o jeito de tira-lo de vez.
  async definirVezesEpisodio(authUserId: string, mediaItemId: string, dto: DefinirVezesEpisodioDto) {
    exigirSerie(mediaItemId);
    const userId = await this.supabaseService.resolverUserId(authUserId);
    const { data, error } = await this.db
      .from("EpisodeProgress")
      .update({ timesWatched: dto.times })
      .eq("userId", userId)
      .eq("mediaItemId", mediaItemId)
      .eq("season", dto.season)
      .eq("episode", dto.episode)
      .select("episode");
    falha(error);

    if (!Array.isArray(data) || data.length === 0) {
      throw new BadRequestException("Marque o episodio como assistido antes de contar outra vez.");
    }

    const { assistidos, tracking } = await this.recalcularProgresso(userId, mediaItemId);
    return { episodes: assistidos, tracking };
  }

  // Recalcula progresso e status a partir dos episodios gravados. Sem o total de episodios
  // (TMDB fora do ar, chave ausente), mantem o progresso salvo em vez de zera-lo.
  private async recalcularProgresso(userId: string, mediaItemId: string) {
    const [assistidos, infoSerie, linha] = await Promise.all([
      this.episodiosDoUsuario(userId, mediaItemId),
      this.catalogoService.infoEpisodiosSerie(mediaItemId).catch(() => null),
      this.buscarLinha(userId, mediaItemId)
    ]);
    const atual = linha ? deBanco(linha) : null;
    const total = infoSerie?.totalEpisodes || infoSerie?.airedEpisodes || 0;

    if (total <= 0) {
      const tracking =
        atual ??
        (await this.salvarParaUsuario(userId, mediaItemId, { status: "WATCHING" }, { registrarAtividade: false }));
      return { assistidos, tracking };
    }

    // Especiais (temporada 0) nao contam para o progresso.
    const progresso = calcularProgresso(assistidos.filter((e) => e.season > 0).length, total);
    const tracking = await this.salvarParaUsuario(
      userId,
      mediaItemId,
      { progress: progresso, status: statusAposEpisodios(atual?.status, progresso, infoSerie?.isOngoing ?? false) },
      { registrarAtividade: false }
    );
    return { assistidos, tracking };
  }

  // Quem as pessoas que o usuario segue destacaram nos episodios desta obra.
  // Perfis privados ficam de fora: seguir alguem nao exige aprovacao.
  async destaquesAmigos(authUserId: string, mediaItemId: string, season?: number) {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    const { data: seguindo, error: followErr } = await this.db
      .from("Follow")
      .select("followingId")
      .eq("followerId", userId);
    falha(followErr);

    const seguidosIds = (seguindo ?? []).map((f) => f.followingId as string);
    if (seguidosIds.length === 0) {
      return [];
    }

    const { data: perfis, error: perfisErr } = await this.db
      .from("User")
      .select("id,username,displayName,avatarUrl")
      .in("id", seguidosIds)
      .eq("isPublic", true);
    falha(perfisErr);

    const perfisMap = new Map((perfis ?? []).map((p) => [p.id as string, p]));
    if (perfisMap.size === 0) {
      return [];
    }

    let query = this.db
      .from("EpisodeProgress")
      .select("userId,season,episode,highlightCharacterId,highlightCharacterName,highlightCharacterAvatar")
      .eq("mediaItemId", mediaItemId)
      .in("userId", [...perfisMap.keys()])
      .not("highlightCharacterName", "is", null);

    if (season !== undefined) {
      query = query.eq("season", season);
    }

    const { data: destaques, error: epErr } = await query;
    falha(epErr);

    return (destaques ?? []).flatMap((d) => {
      const perfil = perfisMap.get(d.userId as string);
      if (!perfil) {
        return [];
      }
      return [
        {
          season: d.season as number,
          episode: d.episode as number,
          characterId: d.highlightCharacterId as string | null,
          characterName: d.highlightCharacterName as string,
          characterAvatar: d.highlightCharacterAvatar as string | null,
          user: {
            id: d.userId as string,
            username: perfil.username as string,
            displayName: (perfil.displayName as string | null) ?? null,
            avatarUrl: (perfil.avatarUrl as string | null) ?? null
          }
        }
      ];
    });
  }
}
