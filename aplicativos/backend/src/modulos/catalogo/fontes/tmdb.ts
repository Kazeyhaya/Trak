import { NotFoundException } from "@nestjs/common";
import { detectarSubtipoTmdb, mapearTmdb, parsearId, TmdbItem, urlProvedorStreaming } from "../catalogo.fontes";
import { ClienteCatalogo } from "../catalogo.http";
import { MembroElenco, montarPersonagens } from "../catalogo.personagens";
import {
  Episodio,
  ExtrasCatalogo,
  ItemCatalogo,
  NotaExterna,
  Novidade,
  PersonagemEpisodio,
  ProvedorOndeAssistir,
  SeriesInfo,
  Temporada
} from "../catalogo.types";
import { dentroDe, Fonte, Idioma, NotaTrak, ParseadoDe } from "./fonte";

type IdTmdb = ParseadoDe<"tmdb">;

type TmdbEpisodio = {
  episode_number: number;
  season_number: number;
  name: string;
  air_date: string | null;
  overview?: string;
  runtime?: number | null;
};

type TmdbTv = TmdbItem & {
  status?: string;
  number_of_episodes?: number;
  seasons?: Array<{ season_number: number; name: string; episode_count: number; air_date: string | null }>;
  next_episode_to_air?: TmdbEpisodio | null;
  last_episode_to_air?: TmdbEpisodio | null;
};

type ProvedoresTmdb = {
  link?: string;
  flatrate?: Array<{ provider_name: string }>;
  ads?: Array<{ provider_name: string }>;
  free?: Array<{ provider_name: string }>;
  rent?: Array<{ provider_name: string }>;
  buy?: Array<{ provider_name: string }>;
};

const caminho = (p: IdTmdb) => (p.type === "MOVIE" ? "movie" : "tv");

// Filmes e series. Temporadas, episodios e elenco so existem aqui.
export class FonteTmdb implements Fonte<IdTmdb> {
  constructor(private readonly http: ClienteCatalogo) {}

  async item(p: IdTmdb, _id: string, idioma: Idioma) {
    const item = await this.http.tmdb<TmdbItem>(`/${caminho(p)}/${p.externalId}`, { language: idioma });
    return item ? mapearTmdb(item, p.type) : null;
  }

  async extras(p: IdTmdb, id: string, notaTrak: Promise<NotaTrak>): Promise<ExtrasCatalogo> {
    const [item, providersData, externalIds] = await Promise.all([
      this.http.tmdb<TmdbItem>(`/${caminho(p)}/${p.externalId}`),
      this.http.tmdb<{ results?: Record<string, ProvedoresTmdb> }>(`/${caminho(p)}/${p.externalId}/watch/providers`),
      p.type === "SERIES"
        ? this.http.tmdb<{ imdb_id?: string | null }>(`/tv/${p.externalId}/external_ids`)
        : Promise.resolve(null)
    ]);

    const imdbId = item?.imdb_id ?? externalIds?.imdb_id ?? null;
    const [omdbRatings, trakRating] = await Promise.all([
      imdbId ? this.notasOmdb(imdbId) : Promise.resolve([]),
      notaTrak
    ]);

    const externalRatings: NotaExterna[] = [...omdbRatings];
    if (item?.vote_average && item.vote_average > 0) {
      externalRatings.push({ source: "TMDB", value: `${item.vote_average.toFixed(1)}/10` });
    }

    const br = providersData?.results?.BR ?? providersData?.results?.US;
    const tituloMidia = item?.title ?? item?.name ?? "";
    const vistos = new Set<string>();
    const watchProviders: ProvedorOndeAssistir[] = [];
    const adicionar = (lista: Array<{ provider_name: string }> | undefined, category: ProvedorOndeAssistir["category"]) => {
      for (const provedor of lista ?? []) {
        if (!vistos.has(provedor.provider_name)) {
          vistos.add(provedor.provider_name);
          watchProviders.push({
            name: provedor.provider_name,
            category,
            url: urlProvedorStreaming(provedor.provider_name, tituloMidia, br?.link ?? null)
          });
        }
      }
    };
    adicionar(br?.flatrate, "STREAMING");
    adicionar(br?.free, "STREAMING");
    adicionar(br?.ads, "STREAMING");
    adicionar(br?.rent, "RENT");
    adicionar(br?.buy, "BUY");

    const seriesInfo = p.type === "SERIES" ? await this.infoEpisodiosSerie(id) : null;

    return {
      genres: (item?.genres ?? []).map((g) => g.name),
      watchProviders,
      watchLink: watchProviders[0]?.url ?? br?.link ?? null,
      trakRating,
      externalRatings,
      seriesInfo
    };
  }

  // Notas do IMDb, Rotten Tomatoes e Metacritic via OMDb (opcional, exige OMDB_API_KEY).
  private async notasOmdb(imdbId: string): Promise<NotaExterna[]> {
    const data = await this.http.omdb<{
      imdbRating?: string;
      Metascore?: string;
      Ratings?: Array<{ Source: string; Value: string }>;
    }>({ i: imdbId });

    if (!data) {
      return [];
    }

    const notas: NotaExterna[] = [];
    if (data.imdbRating && data.imdbRating !== "N/A") {
      notas.push({ source: "IMDb", value: `${data.imdbRating}/10` });
    }
    const rt = data.Ratings?.find((r) => r.Source === "Rotten Tomatoes");
    if (rt?.Value && rt.Value !== "N/A") {
      notas.push({ source: "Rotten Tomatoes", value: rt.Value });
    }
    const mc = data.Ratings?.find((r) => r.Source === "Metacritic")?.Value;
    if (mc && mc !== "N/A") {
      notas.push({ source: "Metacritic", value: mc });
    } else if (data.Metascore && data.Metascore !== "N/A") {
      notas.push({ source: "Metacritic", value: `${data.Metascore}/100` });
    }
    return notas;
  }

  async relacionados(p: IdTmdb) {
    const data = await this.http.tmdb<{ results: TmdbItem[] }>(`/${caminho(p)}/${p.externalId}/recommendations`);
    return (data?.results ?? []).slice(0, 8).map((item) => mapearTmdb(item, p.type));
  }

  async capas(p: IdTmdb) {
    const data = await this.http.tmdb<{ posters?: Array<{ file_path: string }> }>(
      `/${caminho(p)}/${p.externalId}/images`,
      { include_image_language: "pt,en,null" }
    );
    return (data?.posters ?? [])
      .slice(0, 30)
      .flatMap((poster) => (poster.file_path ? [`https://image.tmdb.org/t/p/w780${poster.file_path}`] : []));
  }

  async duracao(p: IdTmdb, id: string) {
    if (p.type === "MOVIE") {
      const filme = await this.http.tmdb<TmdbItem>(`/movie/${p.externalId}`);
      return filme?.runtime && filme.runtime > 0 ? filme.runtime : null;
    }

    const tv = await this.http.tmdb<TmdbTv>(`/tv/${p.externalId}`);
    if (!tv) {
      return null;
    }
    const porEpisodio = tv.episode_run_time?.find((m) => m > 0) ?? tv.last_episode_to_air?.runtime ?? null;
    const episodios = await this.totalEpisodiosExibidos(id).catch(() => tv.number_of_episodes ?? 0);
    return porEpisodio && episodios > 0 ? porEpisodio * episodios : null;
  }

  async novidade(p: IdTmdb, agora: Date): Promise<Novidade | null> {
    if (p.type === "MOVIE") {
      const filme = await this.http.tmdb<TmdbItem>(`/movie/${p.externalId}`);
      return filme?.release_date && dentroDe(filme.release_date, agora, 7, 60)
        ? { kind: "UPCOMING_RELEASE", date: filme.release_date, label: "Estreia nos cinemas" }
        : null;
    }

    const tv = await this.http.tmdb<TmdbTv>(`/tv/${p.externalId}`);
    const proximo = tv?.next_episode_to_air;
    const ultimo = tv?.last_episode_to_air;

    if (proximo?.air_date && dentroDe(proximo.air_date, agora, 0, 30)) {
      return {
        kind: "UPCOMING_EPISODE",
        date: proximo.air_date,
        label: `T${proximo.season_number}E${proximo.episode_number} estreia em breve`
      };
    }
    if (ultimo?.air_date && dentroDe(ultimo.air_date, agora, 7, 0)) {
      return {
        kind: "NEW_EPISODE",
        date: ultimo.air_date,
        label: `Novo episódio: T${ultimo.season_number}E${ultimo.episode_number}`
      };
    }
    return null;
  }

  // Series

  private async tvDetalhe(id: string) {
    const parsed = parsearId(id);
    if (parsed?.source !== "tmdb" || parsed.type !== "SERIES") {
      throw new NotFoundException("Temporadas so existem para series.");
    }
    const tv = await this.http.tmdb<TmdbTv>(`/tv/${parsed.externalId}`);
    if (!tv) {
      throw new NotFoundException("Serie nao encontrada.");
    }
    return { tv, externalId: parsed.externalId };
  }

  async listarTemporadas(id: string): Promise<Temporada[]> {
    const { tv } = await this.tvDetalhe(id);

    return (
      (tv.seasons ?? [])
        .filter((season) => season.episode_count > 0)
        .map((season) => ({
          seasonNumber: season.season_number,
          name: season.name,
          episodeCount: season.episode_count,
          airDate: season.air_date
        }))
        // Especiais (temporada 0) por ultimo.
        .sort((a, b) => (a.seasonNumber || 1000) - (b.seasonNumber || 1000))
    );
  }

  async listarEpisodios(id: string, temporada: number): Promise<Episodio[]> {
    const { externalId } = await this.tvDetalhe(id);
    const data = await this.http.tmdb<{ episodes: TmdbEpisodio[] }>(`/tv/${externalId}/season/${temporada}`);

    if (!data) {
      throw new NotFoundException("Temporada nao encontrada.");
    }

    return data.episodes.map((episode) => ({
      episodeNumber: episode.episode_number,
      name: episode.name,
      airDate: episode.air_date,
      overview: episode.overview || null,
      runtime: episode.runtime ?? null
    }));
  }

  // Total de episodios ja exibidos, sem contar especiais.
  async totalEpisodiosExibidos(id: string) {
    const { tv } = await this.tvDetalhe(id);
    const ultimo = tv.last_episode_to_air;
    if (!ultimo) {
      return 0;
    }

    return (tv.seasons ?? [])
      .filter((season) => season.season_number > 0)
      .reduce((total, season) => {
        if (season.season_number < ultimo.season_number) {
          return total + season.episode_count;
        }
        if (season.season_number === ultimo.season_number) {
          return total + ultimo.episode_number;
        }
        return total;
      }, 0);
  }

  // Total, exibidos e se a serie ainda esta em lancamento (progresso real e status "Em dia").
  async infoEpisodiosSerie(id: string): Promise<SeriesInfo | null> {
    try {
      const { tv } = await this.tvDetalhe(id);
      const somaTemporadas = (tv.seasons ?? [])
        .filter((season) => season.season_number > 0)
        .reduce((total, season) => total + (season.episode_count || 0), 0);
      const totalEpisodes = tv.number_of_episodes || somaTemporadas || 0;
      const airedEpisodes = await this.totalEpisodiosExibidos(id).catch(() => 0);

      const status = (tv.status ?? "").toLowerCase();
      const encerrada = status === "ended" || status === "canceled";
      const temProximo = Boolean(tv.next_episode_to_air);
      const faltaExibir = totalEpisodes > 0 && airedEpisodes < totalEpisodes;

      return {
        totalEpisodes,
        airedEpisodes,
        isOngoing: !encerrada || temProximo || faltaExibir,
        nextEpisodeAirDate: tv.next_episode_to_air?.air_date ?? null
      };
    } catch {
      return null;
    }
  }

  // Elenco de um episodio, para escolher quem "roubou a cena".
  async creditosEpisodio(id: string, temporada: number, episodio: number): Promise<PersonagemEpisodio[]> {
    const { externalId } = await this.tvDetalhe(id);
    const data = await this.http.tmdb<{ cast?: MembroElenco[]; guest_stars?: MembroElenco[] }>(
      `/tv/${externalId}/season/${temporada}/episode/${episodio}/credits`
    );
    if (!data) {
      return [];
    }
    const obra = await this.item({ source: "tmdb", type: "SERIES", externalId }, id, "pt-BR");
    return montarPersonagens(this.http, obra, [...(data.cast ?? []), ...(data.guest_stars ?? [])], 24);
  }

  // Elenco principal da obra, para o Panteao.
  async creditosObra(p: IdTmdb, id: string): Promise<PersonagemEpisodio[]> {
    const obra = await this.item(p, id, "pt-BR");

    if (p.type === "MOVIE") {
      const data = await this.http.tmdb<{ cast?: MembroElenco[] }>(`/movie/${p.externalId}/credits`);
      return montarPersonagens(this.http, obra, data?.cast ?? [], 30);
    }

    // aggregate_credits junta o elenco de todas as temporadas; o papel fica em roles[].
    const agregado = await this.http.tmdb<{ cast?: Array<MembroElenco & { roles?: Array<{ character?: string }> }> }>(
      `/tv/${p.externalId}/aggregate_credits`
    );
    const membros = agregado?.cast?.length
      ? agregado.cast.map((c) => ({ ...c, character: c.roles?.[0]?.character || c.character }))
      : ((await this.http.tmdb<{ cast?: MembroElenco[] }>(`/tv/${p.externalId}/credits`))?.cast ?? []);
    return montarPersonagens(this.http, obra, membros, 30);
  }

  // Importacao do Letterboxd

  async buscarFilmePorTitulo(titulo: string, ano?: number | null): Promise<ItemCatalogo | null> {
    const params: Record<string, string> = { query: titulo };
    if (ano) {
      params.year = String(ano);
    }
    const data = await this.http.tmdb<{ results: TmdbItem[] }>("/search/movie", params);
    const primeiro = data?.results?.[0];
    return primeiro ? mapearTmdb(primeiro, "MOVIE") : null;
  }

  // Subtipo oficial (anime, novela, dorama...) para itens salvos sem ele.
  // { subtipo } quando o TMDB respondeu (subtipo pode ser null: filme comum); null quando falhou.
  async subtipo(type: "MOVIE" | "SERIES", externalId: string) {
    const item = await this.http.tmdb<TmdbItem>(type === "MOVIE" ? `/movie/${externalId}` : `/tv/${externalId}`);
    return item ? { subtipo: detectarSubtipoTmdb(item, type) } : null;
  }
}
