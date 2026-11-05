import { MINUTOS_POR_PAGINA, OpenLibraryDoc } from "../catalogo.fontes";
import { ClienteCatalogo } from "../catalogo.http";
import { ExtrasCatalogo, ItemCatalogo, NotaExterna, ProvedorOndeAssistir } from "../catalogo.types";
import { GoogleBooksService } from "../google-books.service";
import { Fonte, lojasDeLivro, NotaTrak, ParseadoDe } from "./fonte";

type IdGoogleBooks = ParseadoDe<"gbooks">;

// Livros do Google Books. Sem capa no volume, tenta a da Open Library pelo titulo.
export class FonteGoogleBooks implements Fonte<IdGoogleBooks> {
  constructor(
    private readonly http: ClienteCatalogo,
    private readonly googleBooks: GoogleBooksService
  ) {}

  async item(_p: IdGoogleBooks, id: string) {
    const livro = await this.googleBooks.buscarPorId(id);
    if (!livro || livro.coverUrl) {
      return livro;
    }
    const busca = await this.http.openLibrary<{ docs?: OpenLibraryDoc[] }>("/search.json", {
      q: livro.title,
      limit: "1",
      fields: "key,cover_i"
    });
    const capa = busca?.docs?.[0]?.cover_i;
    return capa ? { ...livro, coverUrl: `https://covers.openlibrary.org/b/id/${capa}-L.jpg` } : livro;
  }

  async extras(p: IdGoogleBooks, _id: string, notaTrak: Promise<NotaTrak>): Promise<ExtrasCatalogo> {
    const [volume, trakRating] = await Promise.all([this.googleBooks.getVolumeRaw(p.externalId), notaTrak]);
    const info = volume?.volumeInfo;

    const externalRatings: NotaExterna[] = [];
    if (info?.averageRating && info.averageRating > 0) {
      externalRatings.push({ source: "Google Books", value: `${info.averageRating.toFixed(1)}/5` });
    }

    const titulo = info?.title ?? "";
    const url = info?.infoLink ?? `https://www.google.com.br/search?tbm=bks&q=${encodeURIComponent(titulo)}`;
    const watchProviders: ProvedorOndeAssistir[] = [
      { name: "Google Livros", category: "READ", url },
      ...lojasDeLivro(titulo, false)
    ];

    return {
      genres: (info?.categories ?? []).slice(0, 5),
      watchProviders,
      watchLink: url,
      trakRating,
      externalRatings,
      pageCount: typeof info?.pageCount === "number" && info.pageCount > 0 ? info.pageCount : null
    };
  }

  async relacionados(_p: IdGoogleBooks, id: string) {
    const volume = await this.googleBooks.getVolumeRaw(id);
    const termo = volume?.volumeInfo?.categories?.[0] ?? volume?.volumeInfo?.title;
    if (!termo) {
      return [];
    }
    return (await this.googleBooks.buscar(termo, 8)).filter((item) => item.id !== id);
  }

  // Outras edicoes do mesmo titulo.
  async capas(_p: IdGoogleBooks, item: ItemCatalogo) {
    if (!item.title) {
      return [];
    }
    return (await this.googleBooks.buscar(item.title, 8)).flatMap((livro) => (livro.coverUrl ? [livro.coverUrl] : []));
  }

  async duracao(_p: IdGoogleBooks, id: string) {
    const paginas = (await this.googleBooks.getVolumeRaw(id))?.volumeInfo?.pageCount;
    return paginas && paginas > 0 ? Math.round(paginas * MINUTOS_POR_PAGINA) : null;
  }

  async novidade() {
    return null;
  }
}
