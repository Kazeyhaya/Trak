import { Injectable, Logger } from "@nestjs/common";
import { normalizarTitulo } from "./catalogo.fontes";
import { ItemCatalogo } from "./catalogo.types";
import { ProvedorCatalogo } from "./provedor-catalogo.interface";

export interface IgdbCover {
  id: number;
  image_id: string;
  url?: string;
  width?: number;
  height?: number;
}

export interface IgdbGame {
  id: number;
  name: string;
  summary?: string;
  first_release_date?: number;
  cover?: IgdbCover | null;
  rating?: number;
  rating_count?: number;
  // Tipo do jogo (0 principal, 1 DLC, 3 coletanea, 5 mod, 8 remake, 9 remaster, 11 porte...).
  game_type?: number;
  // Preenchido em edicoes (Gold Edition, Wii Edition...): aponta para o jogo original.
  version_parent?: number | null;
  genres?: Array<{ id: number; name: string }>;
  websites?: Array<{ id: number; category: number; url: string }>;
}

export interface TwitchTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Converte o image_id da IGDB em uma URL direta com alta resolução.
 * Opções de tamanho oficiais:
 * - 720p: 1280x720 (ótimo para landscape/backdrop)
 * - 1080p: 1920x1080
 * - cover_big: 264x374 (formato vertical 2:3 padrão)
 * - cover_big_2x: 528x748 (formato vertical 2:3 nítido para Retina/mobile/desktop)
 */
export function formatarUrlCapaIgdb(
  imageId: string,
  tamanho: "cover_big" | "cover_big_2x" | "720p" | "1080p" = "cover_big_2x"
): string {
  if (!imageId) return "";
  return `https://images.igdb.com/igdb/image/upload/t_${tamanho}/${imageId}.jpg`;
}

// Tipos que nao sao um jogo proprio para acompanhar: DLC, coletanea, mod, episodio,
// temporada, porte, fork, pacote e atualizacao. Remakes e remasters continuam.
const TIPOS_FORA_DA_BUSCA = new Set([1, 3, 5, 6, 7, 11, 12, 13, 14]);

// A IGDB lista cada edicao, porte e coletanea como um jogo. Fica um item por jogo:
// sem edicoes e tipos derivados, e sem repetir titulo + ano.
export function semDuplicatas(jogos: IgdbGame[]): IgdbGame[] {
  const vistos = new Set<string>();
  return jogos.filter((jogo) => {
    if (jogo.version_parent || (jogo.game_type !== undefined && TIPOS_FORA_DA_BUSCA.has(jogo.game_type))) {
      return false;
    }
    const ano = jogo.first_release_date ? new Date(jogo.first_release_date * 1000).getUTCFullYear() : "";
    const chave = `${normalizarTitulo(jogo.name ?? "")}:${ano}`;
    if (vistos.has(chave)) {
      return false;
    }
    vistos.add(chave);
    return true;
  });
}

export function mapIgdbGame(game: IgdbGame): ItemCatalogo {
  let releaseYear: number | null = null;
  if (typeof game.first_release_date === "number" && game.first_release_date > 0) {
    const year = new Date(game.first_release_date * 1000).getUTCFullYear();
    if (Number.isFinite(year) && year > 1950) {
      releaseYear = year;
    }
  }

  const coverUrl = game.cover?.image_id
    ? formatarUrlCapaIgdb(game.cover.image_id, "cover_big_2x")
    : null;

  return {
    id: `igdb_game_${game.id}`,
    externalId: String(game.id),
    source: "igdb",
    type: "GAME",
    title: game.name?.trim() || "Sem título",
    coverUrl,
    synopsis: game.summary?.trim() || null,
    releaseYear
  };
}

@Injectable()
export class IgdbService implements ProvedorCatalogo {
  private readonly logger = new Logger(IgdbService.name);
  private readonly baseUrl = "https://api.igdb.com/v4";
  private readonly authUrl = "https://id.twitch.tv/oauth2/token";

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private readonly cache = new Map<string, { expiresAt: number; value: unknown }>();
  private readonly cacheTtlMs = 15 * 60 * 1000; // 15 minutos

  private obterCredenciais(): { clientId: string; clientSecret: string } | null {
    const clientId = process.env.IGDB_CLIENT_ID?.trim();
    const clientSecret = process.env.IGDB_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      return null;
    }
    return { clientId, clientSecret };
  }

  isConfigurado(): boolean {
    return Boolean(this.obterCredenciais());
  }

  private async comCache<T>(chave: string, carregar: () => Promise<T>): Promise<T> {
    const atual = this.cache.get(chave);
    if (atual && atual.expiresAt > Date.now()) {
      return atual.value as T;
    }

    const value = await carregar();
    if (value !== null && value !== undefined) {
      if (this.cache.size > 500) {
        this.cache.delete(this.cache.keys().next().value as string);
      }
      this.cache.set(chave, { expiresAt: Date.now() + this.cacheTtlMs, value });
    }
    return value;
  }

  /**
   * Obtém ou renova o token App Access Token do Twitch OAuth2 exigido pela IGDB.
   */
  async obterToken(): Promise<string | null> {
    const creds = this.obterCredenciais();
    if (!creds) {
      return null;
    }

    // Se o token ainda for válido (com 60s de margem de segurança)
    if (this.accessToken && this.tokenExpiresAt > Date.now() + 60000) {
      return this.accessToken;
    }

    try {
      const params = new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        grant_type: "client_credentials"
      });

      const response = await fetch(`${this.authUrl}?${params.toString()}`, {
        method: "POST",
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        this.logger.warn(`Falha na autenticação Twitch OAuth2 para IGDB: status ${response.status}`);
        return null;
      }

      const data = (await response.json()) as TwitchTokenResponse;
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
      return this.accessToken;
    } catch (error) {
      this.logger.warn(`Erro ao conectar com Twitch OAuth2: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Executa uma consulta na API da IGDB com body em formato Apicalypse.
   */
  async consulta<T>(endpoint: string, apicalypseQuery: string): Promise<T | null> {
    const creds = this.obterCredenciais();
    if (!creds) {
      return null;
    }

    const token = await this.obterToken();
    if (!token) {
      return null;
    }

    return this.comCache(`${endpoint}:${apicalypseQuery}`, async () => {
      try {
        const response = await fetch(`${this.baseUrl}/${endpoint}`, {
          method: "POST",
          headers: {
            "Client-ID": creds.clientId,
            Authorization: `Bearer ${token}`,
            "Content-Type": "text/plain",
            "User-Agent": "Trak (https://github.com/Kazeyhaya/Trak)"
          },
          body: apicalypseQuery,
          signal: AbortSignal.timeout(6000)
        });

        if (!response.ok) {
          if (response.status !== 404) {
            this.logger.warn(`IGDB ${endpoint} respondeu status ${response.status}`);
          }
          return null;
        }

        return (await response.json()) as T;
      } catch (error) {
        this.logger.warn(`Erro na consulta IGDB ${endpoint}: ${(error as Error).message}`);
        return null;
      }
    });
  }

  /**
   * Busca jogos na IGDB e devolve no formato unificado ItemCatalogo[].
   */
  async buscar(query: string, limit = 20): Promise<ItemCatalogo[]> {
    const maxResults = Math.min(Math.max(1, limit), 50);
    const nomeLimpo = (query ?? "").replace(/[^\w\s-]/gi, "").trim();

    // Pede o dobro: edicoes e derivados saem no filtro, e o limite ainda deve ser atingido.
    const pedidos = Math.min(maxResults * 2, 50);
    const campos = "name,summary,first_release_date,cover.image_id,rating,rating_count";
    const montar = (extras: string, filtro: string) =>
      nomeLimpo
        ? `search "${nomeLimpo}"; fields ${campos}${extras};${filtro ? ` where ${filtro};` : ""} limit ${pedidos};`
        : `fields ${campos}${extras}; where cover != null & rating_count > 20${filtro ? ` & ${filtro}` : ""}; sort rating_count desc; limit ${pedidos};`;

    // Se a IGDB recusar os campos de tipo/edicao, repete a consulta basica.
    const resultado =
      (await this.consulta<IgdbGame[]>("games", montar(",game_type,version_parent", "version_parent = null"))) ??
      (await this.consulta<IgdbGame[]>("games", montar("", "")));
    if (!Array.isArray(resultado) || resultado.length === 0) {
      return [];
    }

    return semDuplicatas(resultado.filter((game) => Boolean(game?.id && game?.name?.trim())))
      .slice(0, maxResults)
      .map(mapIgdbGame);
  }

  /**
   * Busca um jogo específico pelo ID na IGDB (ex: "igdb_game_1020" ou "1020") e devolve ItemCatalogo.
   */
  async buscarPorId(id: string): Promise<ItemCatalogo | null> {
    if (!id?.trim()) {
      return null;
    }
    const cleanId = id.trim().replace(/^igdb_game_/, "");
    const numericId = parseInt(cleanId, 10);
    if (Number.isNaN(numericId) || numericId <= 0) {
      return null;
    }

    const apicalypse = `fields name,summary,first_release_date,cover.image_id,rating,rating_count,genres.name,websites.url,websites.category; where id = ${numericId}; limit 1;`;
    const resultado = await this.consulta<IgdbGame[]>("games", apicalypse);
    const game = resultado?.[0];
    if (!game?.id) {
      return null;
    }

    return mapIgdbGame(game);
  }

  /**
   * Busca os dados brutos de um jogo na IGDB pelo ID numérico.
   */
  async getGameRaw(id: string | number): Promise<IgdbGame | null> {
    const cleanId = String(id).trim().replace(/^igdb_game_/, "");
    const numericId = parseInt(cleanId, 10);
    if (Number.isNaN(numericId) || numericId <= 0) {
      return null;
    }

    const apicalypse = `fields name,summary,first_release_date,cover.image_id,rating,rating_count,genres.name,websites.url,websites.category; where id = ${numericId}; limit 1;`;
    const resultado = await this.consulta<IgdbGame[]>("games", apicalypse);
    return resultado?.[0] ?? null;
  }

  /**
   * Busca a capa vertical de alta qualidade (cover_big_2x) de um jogo pelo nome exato ou aproximado.
   */
  async buscarCapaPorNome(nomeJogo: string): Promise<string | null> {
    if (!nomeJogo || !nomeJogo.trim()) {
      return null;
    }

    const nomeLimpo = nomeJogo.replace(/[^\w\s-]/gi, "").trim();
    if (!nomeLimpo) {
      return null;
    }

    // Busca o jogo trazendo o image_id da capa oficial
    const query = `search "${nomeLimpo}"; fields name,cover.image_id; limit 5;`;
    const resultado = await this.consulta<IgdbGame[]>("games", query);

    if (!resultado || resultado.length === 0) {
      return null;
    }

    // Prioriza jogo que tenha capa disponível
    const jogoComCapa = resultado.find((j) => j.cover?.image_id) ?? resultado[0];
    if (jogoComCapa?.cover?.image_id) {
      return formatarUrlCapaIgdb(jogoComCapa.cover.image_id, "cover_big_2x");
    }

    return null;
  }

  /**
   * Busca detalhes e metadados de um jogo na IGDB pelo nome.
   */
  async buscarJogoPorNome(nomeJogo: string): Promise<IgdbGame | null> {
    if (!nomeJogo || !nomeJogo.trim()) {
      return null;
    }

    const nomeLimpo = nomeJogo.replace(/[^\w\s-]/gi, "").trim();
    const query = `search "${nomeLimpo}"; fields name,summary,first_release_date,rating,rating_count,cover.image_id,genres.name,websites.url,websites.category; limit 1;`;
    const resultado = await this.consulta<IgdbGame[]>("games", query);

    return resultado?.[0] ?? null;
  }

  /**
   * Busca opções de capas verticais oficiais (edições e variantes regionais) para um jogo na IGDB.
   */
  async buscarCapasAlternativas(nomeJogo: string): Promise<string[]> {
    if (!nomeJogo || !nomeJogo.trim()) {
      return [];
    }

    const nomeLimpo = nomeJogo.replace(/[^\w\s-]/gi, "").trim();
    if (!nomeLimpo) {
      return [];
    }

    const query = `search "${nomeLimpo}"; fields name,cover.image_id,game_localizations.cover.image_id; limit 12;`;
    const resultado = await this.consulta<
      Array<{
        id: number;
        cover?: { image_id: string };
        game_localizations?: Array<{ cover?: { image_id: string } }>;
      }>
    >("games", query);

    if (!resultado || resultado.length === 0) {
      return [];
    }

    const capas: string[] = [];
    for (const item of resultado) {
      if (item.cover?.image_id) {
        capas.push(formatarUrlCapaIgdb(item.cover.image_id, "cover_big_2x"));
      }
      if (item.game_localizations?.length) {
        for (const loc of item.game_localizations) {
          if (loc.cover?.image_id) {
            capas.push(formatarUrlCapaIgdb(loc.cover.image_id, "cover_big_2x"));
          }
        }
      }
    }

    return [...new Set(capas)];
  }
}
