import { mapearRawg, normalizarTitulo, RawgItem, urlLojaJogo } from "../catalogo.fontes";
import { ClienteCatalogo } from "../catalogo.http";
import { ExtrasCatalogo, ItemCatalogo, NotaExterna, Novidade, ProvedorOndeAssistir } from "../catalogo.types";
import { IgdbService } from "../igdb.service";
import { dentroDe, Fonte, Idioma, NotaTrak, ParseadoDe } from "./fonte";

type IdRawg = ParseadoDe<"rawg">;

// Jogos do RAWG. A capa do RAWG e horizontal: quando a IGDB ou a SteamGridDB estao
// configuradas, a capa vertical vem delas.
export class FonteRawg implements Fonte<IdRawg> {
  constructor(
    private readonly http: ClienteCatalogo,
    private readonly igdb: IgdbService
  ) {}

  async item(p: IdRawg, _id: string, idioma: Idioma) {
    const jogo = await this.http.rawg<RawgItem>(`/games/${p.externalId}`);
    if (!jogo) {
      return null;
    }
    const mapeado = mapearRawg(jogo);
    const [synopsis, capaVertical] = await Promise.all([
      idioma === "pt-BR" ? this.http.traduzirParaPtBr(mapeado.synopsis) : mapeado.synopsis,
      this.http.capaJogoVertical(mapeado.title)
    ]);
    return { ...mapeado, coverUrl: capaVertical ?? mapeado.coverUrl, synopsis };
  }

  async extras(p: IdRawg, _id: string, notaTrak: Promise<NotaTrak>): Promise<ExtrasCatalogo> {
    const [jogo, lojasData, trakRating] = await Promise.all([
      this.http.rawg<RawgItem>(`/games/${p.externalId}`),
      this.http.rawg<{ results?: Array<{ url?: string; store_id?: number }> }>(`/games/${p.externalId}/stores`),
      notaTrak
    ]);

    const externalRatings: NotaExterna[] = [];
    if (jogo?.metacritic) {
      externalRatings.push({ source: "Metacritic", value: `${jogo.metacritic}/100` });
    }
    if (jogo?.rating && jogo.rating > 0) {
      externalRatings.push({ source: "RAWG", value: `${jogo.rating.toFixed(1)}/5` });
    }

    // O detalhe do jogo lista as lojas; o link direto de cada uma vem de /stores.
    const urlPorLoja = new Map<number, string>();
    for (const loja of lojasData?.results ?? []) {
      if (loja.store_id && loja.url) {
        urlPorLoja.set(loja.store_id, loja.url);
      }
    }

    const titulo = jogo?.name ?? "";
    const watchProviders: ProvedorOndeAssistir[] = (jogo?.stores ?? []).flatMap((s) => {
      if (!s.store?.name) {
        return [];
      }
      const urlDireta = (s.store.id ? urlPorLoja.get(s.store.id) : undefined) || s.url || null;
      return [
        {
          name: s.store.name,
          category: "STORE" as const,
          url: urlLojaJogo(s.store.name, titulo, urlDireta, s.store.domain)
        }
      ];
    });

    return {
      genres: (jogo?.genres ?? []).map((g) => g.name),
      watchProviders,
      watchLink: watchProviders[0]?.url ?? null,
      trakRating,
      externalRatings
    };
  }

  async relacionados(p: IdRawg) {
    const jogo = await this.http.rawg<{ genres?: Array<{ slug: string }> }>(`/games/${p.externalId}`);
    const genero = jogo?.genres?.[0]?.slug;
    if (!genero) {
      return [];
    }
    const data = await this.http.rawg<{ results: RawgItem[] }>("/games", {
      genres: genero,
      ordering: "-rating",
      page_size: "8"
    });
    return (data?.results ?? []).map((jogo) => ({ ...mapearRawg(jogo), synopsis: null }));
  }

  // Capas verticais da IGDB; sem nenhuma, as capturas de tela do RAWG.
  async capas(p: IdRawg, item: ItemCatalogo) {
    const verticais =
      item.title && this.igdb.isConfigurado() ? await this.igdb.buscarCapasAlternativas(item.title) : [];
    if (verticais.some((capa) => capa !== item.coverUrl)) {
      return verticais;
    }
    const capturas = await this.http.rawg<{ results?: Array<{ image: string }> }>(
      `/games/${p.externalId}/screenshots`
    );
    return [...verticais, ...(capturas?.results ?? []).slice(0, 8).flatMap((c) => (c.image ? [c.image] : []))];
  }

  async duracao(p: IdRawg) {
    const jogo = await this.http.rawg<RawgItem>(`/games/${p.externalId}`);
    return jogo?.playtime && jogo.playtime > 0 ? jogo.playtime * 60 : null;
  }

  async novidade(p: IdRawg, agora: Date): Promise<Novidade | null> {
    const jogo = await this.http.rawg<RawgItem>(`/games/${p.externalId}`);
    return jogo?.released && dentroDe(jogo.released, agora, 7, 60)
      ? { kind: "UPCOMING_RELEASE", date: jogo.released, label: "Lançamento do jogo" }
      : null;
  }

  // Importacao da Steam: o nome exato vence; senao, o primeiro resultado.
  async buscarPorNome(nome: string): Promise<ItemCatalogo | null> {
    const data = await this.http.rawg<{ results: RawgItem[] }>("/games", {
      search: nome,
      search_precise: "true",
      page_size: "5"
    });
    const alvo = normalizarTitulo(nome);
    const resultados = data?.results ?? [];
    const melhor = resultados.find((jogo) => normalizarTitulo(jogo.name) === alvo) ?? resultados[0];
    return melhor ? { ...mapearRawg(melhor), synopsis: null } : null;
  }
}
