import { MINUTOS_POR_PAGINA } from "../catalogo.fontes";
import { ClienteCatalogo } from "../catalogo.http";
import { ExtrasCatalogo, ItemCatalogo, NotaExterna, ProvedorOndeAssistir } from "../catalogo.types";
import { GoogleBooksService } from "../google-books.service";
import { HardcoverService } from "../hardcover.service";
import { Fonte, Idioma, lojasDeLivro, NotaTrak, ParseadoDe } from "./fonte";

type IdHardcover = ParseadoDe<"hardcover">;

// Livros da Hardcover (capas de editora em alta resolucao). Sinopse em portugues e capa
// ausente vem do Google Books.
export class FonteHardcover implements Fonte<IdHardcover> {
  constructor(
    private readonly http: ClienteCatalogo,
    private readonly hardcover: HardcoverService,
    private readonly googleBooks: GoogleBooksService
  ) {}

  async item(_p: IdHardcover, id: string, idioma: Idioma) {
    const livro = await this.hardcover.buscarPorId(id);
    if (!livro) {
      return null;
    }

    let synopsis = livro.synopsis;
    if (idioma === "pt-BR") {
      synopsis =
        (await this.http.sinopseGoogleBooks(livro.title, "pt-BR")) ??
        (synopsis ? await this.http.traduzirParaPtBr(synopsis) : null);
    }
    const coverUrl = livro.coverUrl ?? (await this.googleBooks.buscar(livro.title, 1))[0]?.coverUrl ?? null;
    return { ...livro, coverUrl, synopsis };
  }

  async extras(p: IdHardcover, _id: string, notaTrak: Promise<NotaTrak>): Promise<ExtrasCatalogo> {
    const [livro, trakRating] = await Promise.all([this.hardcover.getBookRaw(p.externalId), notaTrak]);

    const externalRatings: NotaExterna[] = [];
    if (livro?.rating && Number.isFinite(livro.rating) && livro.rating > 0) {
      externalRatings.push({ source: "Hardcover", value: `${(Math.round(livro.rating * 10) / 10).toFixed(1)}/5` });
    }

    const generos = (livro?.cached_tags?.Genre ?? []).flatMap((g) => (g.tag?.trim() ? [g.tag.trim()] : []));
    const url = livro?.slug ? `https://hardcover.app/books/${livro.slug}` : null;
    const watchProviders: ProvedorOndeAssistir[] = [
      ...(url ? [{ name: "Hardcover", category: "READ" as const, url }] : []),
      ...lojasDeLivro(livro?.title ?? "")
    ];

    return {
      genres: [...new Set(generos)].slice(0, 5),
      watchProviders,
      watchLink: url,
      trakRating,
      externalRatings,
      pageCount: typeof livro?.pages === "number" && livro.pages > 0 ? livro.pages : null
    };
  }

  async relacionados(p: IdHardcover, id: string) {
    const livro = await this.hardcover.getBookRaw(p.externalId);
    const termo = livro?.cached_tags?.Genre?.[0]?.tag || livro?.title;
    if (!termo) {
      return [];
    }
    return (await this.hardcover.buscar(termo, 8)).filter((item) => item.id !== id);
  }

  async capas(_p: IdHardcover, item: ItemCatalogo) {
    if (!item.title) {
      return [];
    }
    return (await this.hardcover.buscar(item.title, 8)).flatMap((livro) => (livro.coverUrl ? [livro.coverUrl] : []));
  }

  async duracao(p: IdHardcover) {
    const paginas = (await this.hardcover.getBookRaw(p.externalId))?.pages;
    return paginas && paginas > 0 ? Math.round(paginas * MINUTOS_POR_PAGINA) : null;
  }

  async novidade() {
    return null;
  }
}
