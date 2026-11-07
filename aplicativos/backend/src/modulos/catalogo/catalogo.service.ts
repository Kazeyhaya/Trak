import { Injectable, InternalServerErrorException, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import { ehAdulto, IdParseado, parsearId } from "./catalogo.fontes";
import { ClienteCatalogo } from "./catalogo.http";
import { ListagemCatalogo } from "./catalogo.listagem";
import { ExtrasCatalogo, FonteCatalogo, ItemCatalogo, Novidade } from "./catalogo.types";
import { Fonte } from "./fontes/fonte";
import { FonteGoogleBooks } from "./fontes/google-books";
import { FonteHardcover } from "./fontes/hardcover";
import { FonteIgdb } from "./fontes/igdb";
import { FonteOpenLibrary } from "./fontes/open-library";
import { FonteRawg } from "./fontes/rawg";
import { FonteTmdb } from "./fontes/tmdb";
import { GoogleBooksService } from "./google-books.service";
import { HardcoverService } from "./hardcover.service";
import { IgdbService } from "./igdb.service";

// Porta de entrada do catalogo. Escolhe a fonte pelo prefixo do id (tmdb_, rawg_game_,
// igdb_game_, openlibrary_book_, media_gbooks_, media_hardcover_) e delega; aqui ficam
// so o que e comum a todas: persistencia em MediaItem, nota do Trak e duracoes.
@Injectable()
export class CatalogoService implements OnModuleInit {
  private readonly logger = new Logger(CatalogoService.name);
  private readonly http: ClienteCatalogo;
  private readonly listagem: ListagemCatalogo;
  private readonly tmdb: FonteTmdb;
  private readonly rawg: FonteRawg;
  private readonly fontes: Record<FonteCatalogo, Fonte<never>>;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly googleBooksService: GoogleBooksService,
    private readonly hardcoverService: HardcoverService,
    private readonly igdbService: IgdbService
  ) {
    this.http = new ClienteCatalogo(igdbService, this.logger);
    this.listagem = new ListagemCatalogo(this.http, googleBooksService, hardcoverService, igdbService);
    this.tmdb = new FonteTmdb(this.http);
    this.rawg = new FonteRawg(this.http, igdbService);
    this.fontes = {
      tmdb: this.tmdb,
      rawg: this.rawg,
      igdb: new FonteIgdb(this.http, igdbService),
      openlibrary: new FonteOpenLibrary(this.http, googleBooksService),
      gbooks: new FonteGoogleBooks(this.http, googleBooksService),
      hardcover: new FonteHardcover(this.http, hardcoverService, googleBooksService)
    };
  }

  // A fonte do id, ja com o id interpretado. null quando o id nao segue nenhum padrao.
  private fonte(id: string): { p: IdParseado; fonte: Fonte } | null {
    const p = parsearId(id);
    return p ? { p, fonte: this.fontes[p.source] as unknown as Fonte } : null;
  }

  // Conteudo +18 so entra para quem liberou no perfil (idade confirmada e consentimento).
  async listar(query?: string, tipo?: string, genero?: string, lang?: string, incluirAdulto = false) {
    const itens = await this.listagem.listar(query, tipo, genero, lang);
    return incluirAdulto ? itens : itens.filter((item) => !ehAdulto(item));
  }

  // A pessoa liberou conteudo +18 no perfil? Visitante sem login: nao.
  async permiteAdulto(authUserId?: string) {
    if (!authUserId) {
      return false;
    }
    const userId = await this.supabaseService.resolverUserId(authUserId);
    const { data } = await this.supabaseService
      .getClient()
      .from("User")
      .select("adultContent")
      .eq("id", userId)
      .maybeSingle();
    return data?.adultContent === true;
  }

  // Com a fonte fora do ar (ex.: RAWG respondendo 522), usa o que ja esta salvo em
  // MediaItem: a ficha de quem tem a obra na estante continua abrindo.
  async buscarPorId(id: string, lang?: string): Promise<ItemCatalogo> {
    const alvo = this.fonte(id);
    const item = alvo
      ? await alvo.fonte.item(alvo.p, id, lang === "en-US" ? "en-US" : "pt-BR").catch((error: Error) => {
          this.logger.warn(`Fonte de ${id} falhou: ${error.message}`);
          return null;
        })
      : null;
    const salvo = item || !alvo ? null : (await this.buscarSalvos([id])).get(id);
    if (!item && !salvo) {
      throw new NotFoundException("Item nao encontrado.");
    }
    const encontrado = (item ?? salvo)!;
    // Marca tambem o que so o titulo denuncia, para a ficha avisar antes de abrir.
    return ehAdulto(encontrado) ? { ...encontrado, adult: true } : encontrado;
  }

  async extras(id: string): Promise<ExtrasCatalogo> {
    const alvo = this.fonte(id);
    if (!alvo) {
      throw new NotFoundException("Item nao encontrado.");
    }
    return alvo.fonte.extras(alvo.p, id, this.mediaTrak(id));
  }

  async relacionados(id: string, incluirAdulto = false): Promise<ItemCatalogo[]> {
    const alvo = this.fonte(id);
    const itens = alvo ? await alvo.fonte.relacionados(alvo.p, id) : [];
    return incluirAdulto ? itens : itens.filter((item) => !ehAdulto(item));
  }

  // Capa atual primeiro, depois as alternativas da fonte, sem repetir.
  async capas(id: string): Promise<{ capas: string[] }> {
    const item = await this.buscarPorId(id);
    const alvo = this.fonte(id);
    const alternativas = alvo ? await alvo.fonte.capas(alvo.p, item) : [];
    return { capas: [...new Set([item.coverUrl, ...alternativas].filter((c): c is string => Boolean(c)))] };
  }

  async novidades(id: string, agora = new Date()): Promise<Novidade | null> {
    const alvo = this.fonte(id);
    return alvo ? alvo.fonte.novidade(alvo.p, agora) : null;
  }

  // Duracao estimada da obra inteira, em minutos (null quando a fonte nao informa).
  async duracaoMinutos(id: string): Promise<number | null> {
    const alvo = this.fonte(id);
    return alvo ? alvo.fonte.duracao(alvo.p, id) : null;
  }

  // Series (so TMDB)

  listarTemporadas(id: string) {
    return this.tmdb.listarTemporadas(id);
  }

  listarEpisodios(id: string, temporada: number) {
    return this.tmdb.listarEpisodios(id, temporada);
  }

  creditosEpisodio(id: string, temporada: number, episodio: number) {
    return this.tmdb.creditosEpisodio(id, temporada, episodio);
  }

  async creditosObra(id: string) {
    const p = parsearId(id);
    return p?.source === "tmdb" ? this.tmdb.creditosObra(p, id) : [];
  }

  infoEpisodiosSerie(id: string) {
    return this.tmdb.infoEpisodiosSerie(id);
  }

  // Episodios ja exibidos, sem especiais.
  // Importacao

  buscarFilmePorTitulo(titulo: string, ano?: number | null) {
    return this.tmdb.buscarFilmePorTitulo(titulo, ano);
  }

  buscarJogoPorNome(nome: string) {
    return this.rawg.buscarPorNome(nome);
  }

  // Persistencia e dados do Trak

  // Avisa no log, ao subir a API, quais fontes ficarao sem resultados.
  onModuleInit() {
    for (const [variavel, fonte] of [
      ["TMDB_API_KEY", "filmes e series (TMDB)"],
      ["RAWG_API_KEY", "jogos (RAWG)"],
      ["IGDB_CLIENT_ID", "capas de alta qualidade para jogos (IGDB)"],
      ["HARDCOVER_API_KEY", "dados enriquecidos de livros (Hardcover)"]
    ] as const) {
      if (!process.env[variavel]?.trim()) {
        this.logger.warn(`${variavel} nao configurada: o catalogo ficara sem ${fonte}.`);
      }
    }
  }

  // Media das notas dadas no Trak, calculada no banco (trak_nota_media).
  private async mediaTrak(mediaItemId: string) {
    const { data, error } = await this.supabaseService.getClient().rpc("trak_nota_media", { item: mediaItemId });
    const linha = Array.isArray(data) ? (data[0] as { average: number | string | null; count: number } | undefined) : undefined;
    if (error || !linha?.count) {
      if (error) {
        this.logger.warn(`Nao foi possivel calcular a nota do Trak de ${mediaItemId}: ${error.message}`);
      }
      return { average: null, count: 0 };
    }
    return { average: Number(linha.average), count: linha.count };
  }

  // Duracao de varios itens salvos. Itens ainda sem duracao sao calculados
  // (no maximo `limiteNovos` por chamada) e gravados em MediaItem; quando a
  // fonte nao informa, grava 0 para nao consultar de novo.
  async duracoes(ids: string[], limiteNovos = 15): Promise<Map<string, number>> {
    const unicos = [...new Set(ids)];
    const resultado = new Map<string, number>();
    if (unicos.length === 0) {
      return resultado;
    }

    const db = this.supabaseService.getClient();
    const { data, error } = await db.from("MediaItem").select("id,durationMinutes").in("id", unicos);
    if (error) {
      await Promise.all(
        unicos.slice(0, limiteNovos).map(async (id) => {
          const minutos = (await this.http.comCache(`dur:${id}`, () => this.duracaoMinutos(id)).catch(() => null)) ?? 0;
          resultado.set(id, minutos);
        })
      );
      return resultado;
    }

    const pendentes: string[] = [];
    for (const linha of (data ?? []) as Array<{ id: string; durationMinutes: number | null }>) {
      if (typeof linha.durationMinutes === "number") {
        resultado.set(linha.id, linha.durationMinutes);
      } else {
        pendentes.push(linha.id);
      }
    }

    await Promise.all(
      pendentes.slice(0, limiteNovos).map(async (id) => {
        const minutos = (await this.duracaoMinutos(id).catch(() => null)) ?? 0;
        resultado.set(id, minutos);
        const { error: updateError } = await db.from("MediaItem").update({ durationMinutes: minutos }).eq("id", id);
        if (updateError) {
          this.logger.warn(`Nao foi possivel salvar a duracao de ${id}: ${updateError.message}`);
        }
      })
    );

    return resultado;
  }

  // Garante que o item exista em "MediaItem" antes de ser referenciado por
  // tracking, favoritos ou comentarios.
  async garantirNoBanco(id: string, itemConhecido?: ItemCatalogo) {
    const supabase = this.supabaseService.getClient();

    const { data: existente, error } = await supabase.from("MediaItem").select("id").eq("id", id).maybeSingle();
    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    if (existente) {
      return;
    }

    const item = itemConhecido ?? (await this.buscarPorId(id));
    const agora = new Date().toISOString();
    // pageCount e adult nao sao colunas de MediaItem.
    const { pageCount, adult, ...campos } = item;

    // O item acabou de vir da API, com subtipo e capa ja resolvidos: nao precisa de backfill.
    const { error: insertError } = await supabase
      .from("MediaItem")
      .upsert(
        { ...campos, subtype: campos.subtype ?? null, enrichedAt: agora, createdAt: agora, updatedAt: agora },
        { onConflict: "id", ignoreDuplicates: true }
      );

    if (!insertError) {
      return;
    }

    // A mesma obra ja existe com um id antigo (chave unica externalId+source+type).
    // Une as duas no id canonico; renomear a antiga deixaria trackings orfaos e duplicaria a obra.
    if (insertError.code === "23505") {
      const { data: conflito } = await supabase
        .from("MediaItem")
        .select("id")
        .eq("externalId", campos.externalId)
        .eq("source", campos.source)
        .eq("type", campos.type)
        .maybeSingle();

      if (conflito?.id && conflito.id !== id) {
        const { error: uniaoError } = await supabase.rpc("trak_unir_media_item", {
          legado: conflito.id,
          canonico: id,
          external_id: campos.externalId
        });
        if (!uniaoError) {
          this.logger.log(`MediaItem ${conflito.id} unido em ${id}`);
          return;
        }
        throw new InternalServerErrorException(uniaoError.message);
      }
      if (conflito?.id === id) {
        return;
      }
    }

    throw new InternalServerErrorException(insertError.message);
  }

  // Le itens salvos. Itens antigos ainda nao enriquecidos (sem subtipo do TMDB, jogos com
  // capa horizontal do RAWG) sao completados uma unica vez e marcados com enrichedAt.
  async buscarSalvos(ids: string[], limiteBackfill = 20) {
    const unicos = [...new Set(ids)];
    if (unicos.length === 0) {
      return new Map<string, ItemCatalogo>();
    }

    const db = this.supabaseService.getClient();
    const { data, error } = await db
      .from("MediaItem")
      .select("id,externalId,source,type,subtype,title,coverUrl,synopsis,releaseYear,enrichedAt")
      .in("id", unicos);

    if (error) {
      this.logger.warn(`Nao foi possivel ler MediaItem: ${error.message}`);
    }

    const linhas = (data ?? []) as Array<ItemCatalogo & { enrichedAt?: string | null }>;
    const pendentes = linhas.filter((item) => !item.enrichedAt).slice(0, limiteBackfill);
    await Promise.all(pendentes.map((item) => this.enriquecer(item)));

    return new Map(
      linhas.map(({ enrichedAt: _enrichedAt, ...item }) => {
        void _enrichedAt;
        const coverUrl = item.coverUrl?.includes("media.rawg.io/media/games/")
          ? item.coverUrl.replace("media.rawg.io/media/games/", "media.rawg.io/media/resize/640/-/games/")
          : (item.coverUrl ?? null);
        return [item.id, { ...item, coverUrl, subtype: item.subtype ?? null }];
      })
    );
  }

  // Completa um item salvo (altera o objeto recebido) e grava o resultado com enrichedAt.
  // So deixa de marcar quando a fonte falhou, para tentar de novo numa proxima leitura.
  private async enriquecer(item: ItemCatalogo) {
    const alteracoes: Record<string, unknown> = {};

    if (item.source === "tmdb" && (item.type === "MOVIE" || item.type === "SERIES")) {
      if (!process.env.TMDB_API_KEY?.trim()) {
        return;
      }
      const resposta = await this.tmdb.subtipo(item.type, item.externalId).catch(() => null);
      if (!resposta) {
        return;
      }
      if (resposta.subtipo) {
        item.subtype = resposta.subtipo;
        alteracoes.subtype = resposta.subtipo;
      }
    } else if (item.type === "GAME" && (!item.coverUrl || item.coverUrl.includes("rawg.io"))) {
      if (!this.igdbService.isConfigurado() && !process.env.STEAMGRIDDB_API_KEY?.trim()) {
        return;
      }
      const capa = await this.http.capaJogoVertical(item.title).catch(() => null);
      if (capa && capa !== item.coverUrl) {
        item.coverUrl = capa;
        alteracoes.coverUrl = capa;
      }
    }

    const agora = new Date().toISOString();
    const { error } = await this.supabaseService
      .getClient()
      .from("MediaItem")
      .update({ ...alteracoes, enrichedAt: agora, ...(Object.keys(alteracoes).length ? { updatedAt: agora } : {}) })
      .eq("id", item.id);
    if (error) {
      this.logger.warn(`Nao foi possivel marcar ${item.id} como enriquecido: ${error.message}`);
    }
  }
}
