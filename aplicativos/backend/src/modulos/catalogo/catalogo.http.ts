import { CacheEmMemoria } from "./cache-memoria";
import { Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import { normalizarTitulo } from "./catalogo.fontes";
import { IgdbService } from "./igdb.service";

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 1000;
const FETCH_TIMEOUT_MS = 8000;
const TMDB = "https://api.themoviedb.org/3";
const RAWG = "https://api.rawg.io/api";
const OPEN_LIBRARY = "https://openlibrary.org";
const OMDB = "https://www.omdbapi.com";
const STEAMGRIDDB = "https://www.steamgriddb.com/api/v2";

function dicaDeErro(status: number) {
  if (status === 401 || status === 403) {
    return " (chave de API invalida; no TMDB use a \"API Key\" v3, nao o token de leitura v4)";
  }
  return status === 429 ? " (limite de requisicoes da API atingido)" : "";
}

// Acesso as APIs externas do catalogo, com cache em memoria. Fontes sem chave
// configurada respondem null, e o catalogo segue sem os itens delas.
export class ClienteCatalogo {
  private readonly cache = new CacheEmMemoria(CACHE_TTL_MS, CACHE_MAX_ENTRIES);

  constructor(
    private readonly igdb: IgdbService,
    private readonly logger: Logger
  ) {}

  comCache<T>(chave: string, carregar: () => Promise<T>): Promise<T> {
    return this.cache.obter(chave, carregar);
  }

  async fetchJson<T>(url: string): Promise<T | null> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { "User-Agent": "Trak (https://github.com/Kazeyhaya/Trak)" }
      });
      if (!response.ok) {
        // 404 e normal (item inexistente); os demais indicam chave invalida, limite ou queda.
        if (response.status !== 404) {
          this.logger.warn(`${new URL(url).host} respondeu ${response.status}${dicaDeErro(response.status)}`);
        }
        return null;
      }
      return (await response.json()) as T;
    } catch (error) {
      this.logger.warn(`Falha ao acessar ${new URL(url).host}: ${(error as Error).message}`);
      return null;
    }
  }

  tmdb<T>(path: string, params: Record<string, string> = {}) {
    const apiKey = process.env.TMDB_API_KEY?.trim();
    if (!apiKey) {
      return Promise.resolve(null);
    }
    const language = params.language || "pt-BR";
    const query = new URLSearchParams({ api_key: apiKey, language, ...params });
    return this.comCache(`tmdb:${language}:${path}?${new URLSearchParams(params)}`, () =>
      this.fetchJson<T>(`${TMDB}${path}?${query}`)
    );
  }

  rawg<T>(path: string, params: Record<string, string> = {}) {
    const apiKey = process.env.RAWG_API_KEY?.trim();
    if (!apiKey) {
      return Promise.resolve(null);
    }
    const query = new URLSearchParams({ key: apiKey, ...params });
    return this.comCache(`rawg:${path}?${new URLSearchParams(params)}`, () =>
      this.fetchJson<T>(`${RAWG}${path}?${query}`)
    );
  }

  openLibrary<T>(path: string, params: Record<string, string> = {}) {
    const query = new URLSearchParams(params);
    return this.comCache(`ol:${path}?${query}`, () => this.fetchJson<T>(`${OPEN_LIBRARY}${path}?${query}`));
  }

  omdb<T>(params: Record<string, string>) {
    const apiKey = process.env.OMDB_API_KEY?.trim();
    if (!apiKey) {
      return Promise.resolve(null);
    }
    const query = new URLSearchParams({ apikey: apiKey, ...params });
    return this.comCache(`omdb:${new URLSearchParams(params)}`, () => this.fetchJson<T>(`${OMDB}/?${query}`));
  }

  async traduzirParaPtBr(texto: string | null): Promise<string | null> {
    if (!texto) {
      return null;
    }
    // A chave usa o texto inteiro: sinopses com o mesmo inicio nao podem dividir traducao.
    return this.comCache(`tr:${createHash("sha1").update(texto).digest("hex")}`, async () => {
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt-BR&dt=t&q=${encodeURIComponent(texto)}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!response.ok) {
          return texto;
        }
        const data = (await response.json()) as unknown[];
        const partes = Array.isArray(data?.[0]) ? (data[0] as Array<[string]>) : [];
        const traduzido = partes.map((p) => p?.[0] ?? "").join("").trim();
        return traduzido || texto;
      } catch {
        return texto;
      }
    });
  }

  async capaJogoVertical(nomeJogo: string): Promise<string | null> {
    if (!nomeJogo?.trim()) {
      return null;
    }

    // A capa oficial da IGDB vem primeiro; o SteamGridDB so entra se ela faltar.
    if (this.igdb.isConfigurado()) {
      const capaIgdb = await this.igdb.buscarCapaPorNome(nomeJogo);
      if (capaIgdb) {
        return capaIgdb;
      }
    }

    return this.capaSteamGridDb(nomeJogo);
  }

  async capaSteamGridDb(nomeJogo: string): Promise<string | null> {
    const apiKey = process.env.STEAMGRIDDB_API_KEY?.trim();
    if (!apiKey || !nomeJogo.trim()) {
      return null;
    }
    const chave = `sgdb:${normalizarTitulo(nomeJogo)}`;
    return this.comCache(chave, async () => {
      try {
        const headers = {
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "Trak (https://github.com/Kazeyhaya/Trak)"
        };
        const buscaRes = await fetch(
          `${STEAMGRIDDB}/search/autocomplete/${encodeURIComponent(nomeJogo.trim())}`,
          { signal: AbortSignal.timeout(3500), headers }
        );
        if (!buscaRes.ok) {
          return null;
        }
        const busca = (await buscaRes.json()) as { data?: Array<{ id: number; name: string }> };
        const alvo = normalizarTitulo(nomeJogo);
        const escolhido =
          busca.data?.find((g) => normalizarTitulo(g.name) === alvo) ?? busca.data?.[0];
        if (!escolhido?.id) {
          return null;
        }

        const gridsRes = await fetch(
          `${STEAMGRIDDB}/grids/game/${escolhido.id}?dimensions=600x900&types=static`,
          { signal: AbortSignal.timeout(3500), headers }
        );
        if (!gridsRes.ok) {
          return null;
        }
        const grids = (await gridsRes.json()) as { data?: Array<{ url?: string }> };
        return grids.data?.[0]?.url ?? null;
      } catch {
        return null;
      }
    });
  }

  // Consulta a Google Books API com langRestrict=pt para sinopses ricas em portugues.
  async sinopseGoogleBooks(titulo: string, idioma = "pt-BR"): Promise<string | null> {
    const cleanTitle = titulo.trim();
    if (!cleanTitle) {
      return null;
    }
    const lang = idioma === "en-US" ? "en" : "pt";
    const chave = `gbooks:synopsis:${lang}:${normalizarTitulo(cleanTitle)}`;
    return this.comCache(chave, async () => {
      try {
        const query = new URLSearchParams({
          q: `intitle:${cleanTitle}`,
          langRestrict: lang,
          printType: "books",
          maxResults: "1"
        });
        const res = await this.fetchJson<{
          items?: Array<{
            volumeInfo?: {
              description?: string;
            };
          }>;
        }>(`https://www.googleapis.com/books/v1/volumes?${query}`);
        const desc = res?.items?.[0]?.volumeInfo?.description?.trim();
        if (!desc) {
          return null;
        }
        return desc.replace(/<[^>]+>/g, "").trim() || null;
      } catch {
        return null;
      }
    });
  }
}
