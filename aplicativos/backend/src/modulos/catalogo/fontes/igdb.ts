import { urlLojaJogo } from "../catalogo.fontes";
import { ClienteCatalogo } from "../catalogo.http";
import { ExtrasCatalogo, NotaExterna, ProvedorOndeAssistir } from "../catalogo.types";
import { IgdbService } from "../igdb.service";
import { Fonte, Idioma, NotaTrak, ParseadoDe } from "./fonte";

type IdIgdb = ParseadoDe<"igdb">;

// Jogos da IGDB (Twitch). A IGDB nao informa duracao nem datas de lancamento futuras aqui.
export class FonteIgdb implements Fonte<IdIgdb> {
  constructor(
    private readonly http: ClienteCatalogo,
    private readonly igdb: IgdbService
  ) {}

  async item(_p: IdIgdb, id: string, idioma: Idioma) {
    const jogo = await this.igdb.buscarPorId(id);
    if (!jogo) {
      return null;
    }
    const synopsis = idioma === "pt-BR" ? await this.http.traduzirParaPtBr(jogo.synopsis) : jogo.synopsis;
    return { ...jogo, synopsis };
  }

  async extras(p: IdIgdb, _id: string, notaTrak: Promise<NotaTrak>): Promise<ExtrasCatalogo> {
    const [jogo, trakRating] = await Promise.all([this.igdb.jogo(p.externalId), notaTrak]);

    const externalRatings: NotaExterna[] = [];
    if (jogo?.rating && jogo.rating > 0) {
      externalRatings.push({ source: "IGDB", value: `${Math.round(jogo.rating)}/100` });
    }

    const titulo = jogo?.name ?? "";
    const watchProviders: ProvedorOndeAssistir[] = titulo
      ? [{ name: "Steam", category: "STORE", url: urlLojaJogo("Steam", titulo, null) }]
      : [];

    return {
      genres: (jogo?.genres ?? []).map((g) => g.name),
      watchProviders,
      watchLink: watchProviders[0]?.url ?? null,
      trakRating,
      externalRatings
    };
  }

  // Jogos do mesmo genero (ou de nome parecido, quando nao ha genero).
  async relacionados(p: IdIgdb, id: string) {
    const jogo = await this.igdb.jogo(p.externalId);
    const termo = jogo?.genres?.[0]?.name || jogo?.name;
    if (!termo) {
      return [];
    }
    return (await this.igdb.buscar(termo, 8)).filter((item) => item.id !== id);
  }

  async capas(_p: IdIgdb, item: { title: string }) {
    return item.title && this.igdb.isConfigurado() ? this.igdb.buscarCapasAlternativas(item.title) : [];
  }

  async duracao() {
    return null;
  }

  async novidade() {
    return null;
  }
}
