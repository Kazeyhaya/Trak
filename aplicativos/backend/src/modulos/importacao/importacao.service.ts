import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationShutdown,
  ServiceUnavailableException
} from "@nestjs/common";
import { falha } from "../../comum/erros";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import { montarId } from "../catalogo/catalogo.fontes";
import { CatalogoService } from "../catalogo/catalogo.service";
import { ItemCatalogo } from "../catalogo/catalogo.types";
import { StatusTracking } from "../tracking/dto/salvar-tracking.dto";
import { TrackingService } from "../tracking/tracking.service";
import {
  importacaoCompleta,
  interpretarPerfilSteam,
  itensTrakt,
  jogosSteam,
  linhasLetterboxd,
  ListaLetterboxd
} from "./importacao.parsers";
import { gravarMetaLegado } from "../../comum/meta-legado";

const MAX_ITENS = 500;
const CONCORRENCIA = 4;
const SALVAR_PROGRESSO_A_CADA = 10;
const TAREFA_PARADA_MS = 10 * 60_000;
const TAREFA_INTERROMPIDA = "A importacao foi interrompida. Pode tentar de novo.";
const IMPORTACAO_FALHOU = "A importacao parou no meio. O que ja foi salvo continua na sua estante; pode tentar de novo.";
const CAMPOS_TAREFA = "id,fonte,chave,status,total,processados,resultado,erro,createdAt,updatedAt";

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

export type FonteImportacao = "letterboxd" | "trakt" | "steam";

export type TarefaImportacao = {
  id: string;
  fonte: FonteImportacao;
  chave: string;
  status: "PROCESSANDO" | "CONCLUIDA" | "FALHOU";
  total: number;
  processados: number;
  resultado: ResultadoImportacao | null;
  erro: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ImportacaoService implements OnApplicationShutdown {
  private readonly logger = new Logger(ImportacaoService.name);
  // Processamentos disparados e ainda nao terminados.
  private readonly execucoes = new Set<Promise<void>>();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly catalogoService: CatalogoService,
    private readonly trackingService: TrackingService
  ) {}

  private async lerFontesImportadas(userId: string): Promise<{
    fontes: string[];
    metaLegado: Record<string, unknown>;
  }> {
    const db = this.supabaseService.getClient();
    const { data: userRow, error } = await db
      .from("User")
      .select("importedSources")
      .eq("id", userId)
      .maybeSingle();

    if (!error && userRow && Array.isArray((userRow as { importedSources?: unknown }).importedSources)) {
      return {
        fontes: (userRow as { importedSources: string[] }).importedSources,
        metaLegado: {}
      };
    }

    const { data: metaLinha } = await db.from("Activity").select("id,data").eq("id", userId).maybeSingle();
    const metaAtual =
      metaLinha && !Array.isArray(metaLinha) ? ((metaLinha as { data?: Record<string, unknown> }).data ?? {}) : {};
    const fontes = Array.isArray(metaAtual.importedSources) ? (metaAtual.importedSources as string[]) : [];
    return { fontes, metaLegado: metaAtual };
  }

  private async registrarFonteImportada(
    userId: string,
    fonte: FonteImportacao,
    chave: string,
    atuais: string[],
    metaLegado: Record<string, unknown>
  ) {
    const db = this.supabaseService.getClient();
    const novasFontes = [...new Set([...atuais, fonte, chave])];
    const todasImportadas = importacaoCompleta(novasFontes);

    const { error } = await db
      .from("User")
      .update({ importedSources: novasFontes, updatedAt: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      const meta = {
        ...metaLegado,
        kind: "PROFILE_META",
        importedSources: novasFontes,
        hasImported: todasImportadas
      };
      await gravarMetaLegado(db, userId, meta);
    }
  }

  // Valida e cria a tarefa; os itens sao processados depois, em segundo plano. Arquivo
  // vazio, lista ja importada ou outra importacao igual em andamento dao erro na hora.
  // `chave` identifica o que ja foi importado: no Letterboxd cada lista (watched,
  // ratings...) e um arquivo separado, entao a chave inclui a lista.
  private async iniciar(
    authUserId: string,
    fonte: FonteImportacao,
    candidatos: Candidato[],
    chave: string = fonte
  ): Promise<TarefaImportacao> {
    if (candidatos.length === 0) {
      throw new BadRequestException("Nenhum item encontrado no arquivo.");
    }

    const userId = await this.supabaseService.resolverUserId(authUserId);
    const { fontes, metaLegado } = await this.lerFontesImportadas(userId);

    if (fontes.includes(chave)) {
      throw new BadRequestException(`A importacao de ${chave} ja foi realizada para esta conta.`);
    }

    const db = this.supabaseService.getClient();
    // Tarefa sem progresso ha 10 minutos ficou orfa (a API reiniciou no meio): libera a lista.
    await db
      .from("ImportJob")
      .update({ status: "FALHOU", erro: TAREFA_INTERROMPIDA, updatedAt: new Date().toISOString() })
      .eq("userId", userId)
      .eq("chave", chave)
      .eq("status", "PROCESSANDO")
      .lt("updatedAt", new Date(Date.now() - TAREFA_PARADA_MS).toISOString());

    const lote = candidatos.slice(0, MAX_ITENS);
    const { data, error } = await db
      .from("ImportJob")
      .insert({ userId, fonte, chave, total: lote.length })
      .select(CAMPOS_TAREFA)
      .single();
    if (error?.code === "23505") {
      throw new ConflictException("Ja existe uma importacao desta lista em andamento.");
    }
    falha(error);
    const tarefa = data as unknown as TarefaImportacao;

    const execucao: Promise<void> = this.processar(tarefa.id, userId, fonte, chave, candidatos, fontes, metaLegado)
      .catch(async (erro) => {
        this.logger.error(`Importacao ${tarefa.id} falhou: ${(erro as Error).message}`);
        await this.atualizarTarefa(tarefa.id, { status: "FALHOU", erro: IMPORTACAO_FALHOU }).catch(() => undefined);
      })
      .finally(() => this.execucoes.delete(execucao));
    this.execucoes.add(execucao);
    return tarefa;
  }

  private async processar(
    tarefaId: string,
    userId: string,
    fonte: FonteImportacao,
    chave: string,
    candidatos: Candidato[],
    fontes: string[],
    metaLegado: Record<string, unknown>
  ) {
    const existentes = new Map(
      (await this.trackingService.listarDoUsuario(userId)).map((r) => [r.mediaItemId, r.rating] as const)
    );
    const lote = candidatos.slice(0, MAX_ITENS);
    const resultado: ResultadoImportacao = { total: candidatos.length, imported: 0, skipped: 0, notFound: [] };
    let processados = 0;

    await emLotes(lote, CONCORRENCIA, async (candidato) => {
      await this.importarItem(userId, candidato, existentes, resultado);
      processados++;
      if (processados % SALVAR_PROGRESSO_A_CADA === 0) {
        await this.atualizarTarefa(tarefaId, { processados });
      }
    });

    // So marca a fonte como concluida se ao menos um item foi reconhecido,
    // para nao bloquear o usuario caso envie um arquivo vazio ou incorreto.
    if (resultado.imported > 0 || resultado.skipped > 0) {
      await this.registrarFonteImportada(userId, fonte, chave, fontes, metaLegado);
    }

    resultado.skipped += Math.max(0, candidatos.length - MAX_ITENS);
    resultado.notFound = resultado.notFound.slice(0, 50);
    await this.atualizarTarefa(tarefaId, { status: "CONCLUIDA", processados: lote.length, resultado });
  }

  private async importarItem(
    userId: string,
    candidato: Candidato,
    existentes: Map<string, number | null>,
    resultado: ResultadoImportacao
  ) {
    const item = await candidato.resolver().catch(() => null);
    if (!item) {
      resultado.notFound.push(candidato.titulo);
      return;
    }
    // Nao sobrescreve o que o usuario ja registrou no Trak; so preenche a nota que faltava
    // (ex.: ratings.csv enviado depois do watched.csv).
    if (existentes.has(item.id)) {
      if (candidato.rating && !existentes.get(item.id)) {
        await this.trackingService.salvarParaUsuario(
          userId,
          item.id,
          { rating: candidato.rating },
          { registrarAtividade: false, item }
        );
        existentes.set(item.id, candidato.rating);
        resultado.imported++;
      } else {
        resultado.skipped++;
      }
      return;
    }
    existentes.set(item.id, candidato.rating);

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
  }

  private async atualizarTarefa(id: string, campos: Partial<Omit<TarefaImportacao, "id">>) {
    const { error } = await this.supabaseService
      .getClient()
      .from("ImportJob")
      .update({ ...campos, updatedAt: new Date().toISOString() })
      .eq("id", id);
    falha(error);
  }

  async tarefa(authUserId: string, id: string): Promise<TarefaImportacao> {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    const { data, error } = await this.supabaseService
      .getClient()
      .from("ImportJob")
      .select(CAMPOS_TAREFA)
      .eq("id", id)
      .eq("userId", userId)
      .maybeSingle();
    falha(error);
    if (!data) {
      throw new NotFoundException("Importacao nao encontrada.");
    }
    return data as unknown as TarefaImportacao;
  }

  // As 5 importacoes mais recentes: o site usa para retomar o acompanhamento ao recarregar.
  async tarefas(authUserId: string): Promise<TarefaImportacao[]> {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    const { data, error } = await this.supabaseService
      .getClient()
      .from("ImportJob")
      .select(CAMPOS_TAREFA)
      .eq("userId", userId)
      .order("createdAt", { ascending: false })
      .limit(5);
    falha(error);
    return (data ?? []) as unknown as TarefaImportacao[];
  }

  // Ao desligar (deploy, reinicio), espera as importacoes em andamento por ate 20s.
  async onApplicationShutdown() {
    if (this.execucoes.size > 0) {
      await Promise.race([Promise.allSettled([...this.execucoes]), new Promise((fim) => setTimeout(fim, 20_000))]);
    }
  }

  // Para testes: espera o processamento disparado em segundo plano.
  aguardarExecucoes() {
    return Promise.allSettled([...this.execucoes]);
  }

  letterboxd(authUserId: string, csv: string, lista: ListaLetterboxd) {
    let linhas;
    try {
      linhas = linhasLetterboxd(csv, lista);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    return this.iniciar(
      authUserId,
      "letterboxd",
      linhas.map((linha) => ({
        titulo: linha.ano ? `${linha.titulo} (${linha.ano})` : linha.titulo,
        status: linha.status,
        rating: linha.rating,
        resolver: () => this.catalogoService.buscarFilmePorTitulo(linha.titulo, linha.ano)
      })),
      `letterboxd:${lista}`
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

    return this.iniciar(
      authUserId,
      "trakt",
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

    return this.iniciar(
      authUserId,
      "steam",
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
