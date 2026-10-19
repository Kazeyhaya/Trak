import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import { montarId } from "../catalogo/catalogo.fontes";
import { CatalogoService } from "../catalogo/catalogo.service";
import { ItemCatalogo } from "../catalogo/catalogo.types";
import { StatusTracking } from "../tracking/dto/salvar-tracking.dto";
import { TrackingService } from "../tracking/tracking.service";
import {
  interpretarPerfilSteam,
  itensTrakt,
  jogosSteam,
  linhasLetterboxd,
  ListaLetterboxd
} from "./importacao.parsers";

const MAX_ITENS = 500;
const CONCORRENCIA = 4;

type Candidato = {
  titulo: string;
  status: StatusTracking;
  rating: number | null;
  resolver: () => Promise<ItemCatalogo | null>;
  episodios?: Array<{ season: number; episode: number }>;
};

export type ResultadoImportacao = {
  total: number;
  imported: number;
  skipped: number;
  notFound: string[];
};

// Executa tarefas com concorrencia limitada, preservando a ordem.
async function emLotes<T, R>(itens: T[], limite: number, tarefa: (item: T) => Promise<R>) {
  const resultados: R[] = new Array(itens.length);
  let proximo = 0;

  async function trabalhador() {
    while (proximo < itens.length) {
      const indice = proximo++;
      resultados[indice] = await tarefa(itens[indice]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return resultados;
}

@Injectable()
export class ImportacaoService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly catalogoService: CatalogoService,
    private readonly trackingService: TrackingService
  ) {}

  private async importar(authUserId: string, candidatos: Candidato[]): Promise<ResultadoImportacao> {
    if (candidatos.length === 0) {
      throw new BadRequestException("Nenhum item encontrado no arquivo.");
    }

    const userId = await this.supabaseService.resolverUserId(authUserId);
    const existentes = new Set((await this.trackingService.listarDoUsuario(userId)).map((r) => r.mediaItemId));
    const lote = candidatos.slice(0, MAX_ITENS);
    const resultado: ResultadoImportacao = { total: candidatos.length, imported: 0, skipped: 0, notFound: [] };

    await emLotes(lote, CONCORRENCIA, async (candidato) => {
      const item = await candidato.resolver().catch(() => null);

      if (!item) {
        resultado.notFound.push(candidato.titulo);
        return;
      }
      // Nao sobrescreve o que o usuario ja registrou no Trak.
      if (existentes.has(item.id)) {
        resultado.skipped++;
        return;
      }
      existentes.add(item.id);

      await this.trackingService.salvarParaUsuario(
        userId,
        item.id,
        { status: candidato.status, ...(candidato.rating ? { rating: candidato.rating } : {}) },
        { registrarAtividade: false, item }
      );
      if (candidato.episodios?.length) {
        await this.trackingService.importarEpisodios(userId, item.id, candidato.episodios);
      }
      resultado.imported++;
    });

    resultado.skipped += Math.max(0, candidatos.length - MAX_ITENS);
    resultado.notFound = resultado.notFound.slice(0, 50);
    return resultado;
  }

  letterboxd(authUserId: string, csv: string, lista: ListaLetterboxd) {
    let linhas;
    try {
      linhas = linhasLetterboxd(csv, lista);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    return this.importar(
      authUserId,
      linhas.map((linha) => ({
        titulo: linha.ano ? `${linha.titulo} (${linha.ano})` : linha.titulo,
        status: linha.status,
        rating: linha.rating,
        resolver: () => this.catalogoService.buscarFilmePorTitulo(linha.titulo, linha.ano)
      }))
    );
  }

  trakt(authUserId: string, json: string) {
    let itens;
    try {
      itens = itensTrakt(JSON.parse(json));
    } catch (error) {
      throw new BadRequestException(
        error instanceof SyntaxError ? "O arquivo do Trakt nao e um JSON valido." : (error as Error).message
      );
    }

    return this.importar(
      authUserId,
      itens.map((item) => ({
        titulo: item.titulo,
        status: item.status,
        rating: item.rating,
        episodios: item.episodios,
        resolver: () => this.catalogoService.buscarPorId(montarId("tmdb", item.tipo, item.tmdbId))
      }))
    );
  }

  async steam(authUserId: string, entrada: string) {
    const apiKey = process.env.STEAM_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException("Importacao da Steam indisponivel: configure STEAM_API_KEY.");
    }

    const perfil = interpretarPerfilSteam(entrada);
    if (!perfil) {
      throw new BadRequestException("Informe o SteamID64 ou a URL do seu perfil da Steam.");
    }

    const steamId = perfil.tipo === "id" ? perfil.valor : await this.resolverVanity(apiKey, perfil.valor);
    const resposta = await this.steamApi(
      `/IPlayerService/GetOwnedGames/v1/?key=${encodeURIComponent(apiKey)}&steamid=${steamId}&include_appinfo=1`
    );
    const jogos = jogosSteam(resposta);

    if (jogos.length === 0) {
      throw new BadRequestException(
        "Nenhum jogo encontrado. Verifique se os detalhes de jogos do perfil estao publicos na Steam."
      );
    }

    return this.importar(
      authUserId,
      jogos.map((jogo) => ({
        titulo: jogo.nome,
        status: jogo.minutos > 0 ? "WATCHING" : "WANT",
        rating: null,
        resolver: () => this.catalogoService.buscarJogoPorNome(jogo.nome)
      }))
    );
  }

  private async resolverVanity(apiKey: string, nome: string) {
    const resposta = (await this.steamApi(
      `/ISteamUser/ResolveVanityURL/v1/?key=${encodeURIComponent(apiKey)}&vanityurl=${encodeURIComponent(nome)}`
    )) as { response?: { success?: number; steamid?: string } };

    if (resposta?.response?.success !== 1 || !resposta.response.steamid) {
      throw new BadRequestException("Perfil da Steam nao encontrado.");
    }
    return resposta.response.steamid;
  }

  private async steamApi(path: string): Promise<unknown> {
    try {
      const response = await fetch(`https://api.steampowered.com${path}`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        throw new Error(String(response.status));
      }
      return await response.json();
    } catch {
      throw new ServiceUnavailableException("Nao foi possivel falar com a Steam agora.");
    }
  }
}
