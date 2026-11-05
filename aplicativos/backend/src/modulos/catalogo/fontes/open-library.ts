import { mapearOpenLibrary, MINUTOS_POR_PAGINA, normalizarTitulo, OpenLibraryDoc } from "../catalogo.fontes";
import { ClienteCatalogo } from "../catalogo.http";
import { ExtrasCatalogo, NotaExterna, ProvedorOndeAssistir } from "../catalogo.types";
import { GoogleBooksService } from "../google-books.service";
import { Fonte, Idioma, lojasDeLivro, medianaDePaginas, NotaTrak, ParseadoDe } from "./fonte";

type IdOpenLibrary = ParseadoDe<"openlibrary">;
type Edicoes = { entries?: Array<{ number_of_pages?: number; covers?: number[] }> };

// Livros da Open Library. A sinopse em portugues, quando existe, vem do Google Books.
export class FonteOpenLibrary implements Fonte<IdOpenLibrary> {
  constructor(
    private readonly http: ClienteCatalogo,
    private readonly googleBooks: GoogleBooksService
  ) {}

  async item(p: IdOpenLibrary, _id: string, idioma: Idioma) {
    const obra = await this.http.openLibrary<OpenLibraryDoc>(`/works/${p.externalId}.json`);
    if (!obra) {
      return null;
    }
    const mapeado = mapearOpenLibrary(obra);
    let synopsis = mapeado.synopsis;
    if (idioma === "pt-BR") {
      synopsis =
        (await this.http.sinopseGoogleBooks(mapeado.title, "pt-BR")) ??
        (synopsis ? await this.http.traduzirParaPtBr(synopsis) : null);
    }
    return { ...mapeado, synopsis };
  }

  async extras(p: IdOpenLibrary, _id: string, notaTrak: Promise<NotaTrak>): Promise<ExtrasCatalogo> {
    const [obra, notas, trakRating, edicoes] = await Promise.all([
      this.http.openLibrary<OpenLibraryDoc>(`/works/${p.externalId}.json`),
      this.http.openLibrary<{ summary?: { average?: number } }>(`/works/${p.externalId}/ratings.json`),
      notaTrak,
      this.http.openLibrary<Edicoes>(`/works/${p.externalId}/editions.json`, { limit: "10" })
    ]);

    const externalRatings: NotaExterna[] = [];
    const media = notas?.summary?.average ?? obra?.ratings_average;
    if (media && media > 0) {
      externalRatings.push({ source: "Open Library", value: `${media.toFixed(1)}/5` });
    }

    const url = `https://openlibrary.org/works/${p.externalId}`;
    const watchProviders: ProvedorOndeAssistir[] = [
      { name: "Open Library", category: "READ", url },
      ...lojasDeLivro(obra?.title ?? "")
    ];

    return {
      genres: (obra?.subjects ?? []).slice(0, 5),
      watchProviders,
      watchLink: url,
      trakRating,
      externalRatings,
      pageCount: medianaDePaginas(edicoes?.entries)
    };
  }

  // Prioriza o Google Books (capas de editora, sinopse em portugues); sem resultado,
  // usa o primeiro assunto da obra na Open Library.
  async relacionados(p: IdOpenLibrary, id: string) {
    const obra = await this.http.openLibrary<{ title?: string; subjects?: string[] }>(`/works/${p.externalId}.json`);
    const termo = obra?.title || obra?.subjects?.[0];
    if (!termo) {
      return [];
    }

    const doGoogle = (await this.googleBooks.buscar(termo, 8)).filter((item) => item.id !== id);
    if (doGoogle.length > 0) {
      return doGoogle;
    }

    const assunto = obra?.subjects?.[0];
    if (!assunto) {
      return [];
    }
    const slug = normalizarTitulo(assunto).replace(/ /g, "_");
    const data = await this.http.openLibrary<{ works: OpenLibraryDoc[] }>(`/subjects/${slug}.json`, { limit: "16" });
    return (data?.works ?? [])
      .map(mapearOpenLibrary)
      .filter((item) => item.coverUrl !== null && item.id !== id)
      .slice(0, 8);
  }

  async capas(p: IdOpenLibrary) {
    const edicoes = await this.http.openLibrary<Edicoes>(`/works/${p.externalId}/editions.json`, { limit: "15" });
    return (edicoes?.entries ?? []).flatMap((edicao) =>
      (edicao.covers ?? []).filter((c) => c > 0).map((c) => `https://covers.openlibrary.org/b/id/${c}-L.jpg`)
    );
  }

  async duracao(p: IdOpenLibrary) {
    const edicoes = await this.http.openLibrary<Edicoes>(`/works/${p.externalId}/editions.json`, { limit: "20" });
    const paginas = medianaDePaginas(edicoes?.entries);
    return paginas ? Math.round(paginas * MINUTOS_POR_PAGINA) : null;
  }

  async novidade() {
    return null;
  }
}
