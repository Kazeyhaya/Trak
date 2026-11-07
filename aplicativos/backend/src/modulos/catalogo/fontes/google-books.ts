import { MINUTOS_POR_PAGINA, OpenLibraryDoc } from "../catalogo.fontes";
import { ClienteCatalogo } from "../catalogo.http";
import { ExtrasCatalogo, ItemCatalogo, NotaExterna, ProvedorOndeAssistir } from "../catalogo.types";
import { GoogleBooksService } from "../google-books.service";
import { Fonte, lojasDeLivro, NotaTrak, ParseadoDe } from "./fonte";

type IdGoogleBooks = ParseadoDe<"gbooks">;

const DICIONARIO_CATEGORIAS: Record<string, string> = {
  fiction: "Ficção",
  nonfiction: "Não ficção",
  "non-fiction": "Não ficção",
  fantasy: "Fantasia",
  "science fiction": "Ficção Científica",
  dystopian: "Distopia",
  comics: "Quadrinhos",
  "comics & graphic novels": "Quadrinhos",
  "graphic novels": "Graphic Novels",
  manga: "Mangá",
  biography: "Biografia",
  autobiography: "Autobiografia",
  "biography & autobiography": "Biografia",
  history: "História",
  philosophy: "Filosofia",
  psychology: "Psicologia",
  "self-help": "Autoajuda",
  poetry: "Poesia",
  drama: "Drama",
  mystery: "Mistério",
  detective: "Detetive",
  "mystery & detective": "Mistério",
  thriller: "Suspense",
  suspense: "Suspense",
  horror: "Terror",
  romance: "Romance",
  "action & adventure": "Aventura",
  adventure: "Aventura",
  computers: "Computação",
  "business & economics": "Negócios & Economia",
  business: "Negócios",
  economics: "Economia",
  "juvenile fiction": "Ficção Juvenil",
  "young adult fiction": "Ficção Juvenil",
  "young adult": "Jovem Adulto",
  children: "Infantil",
  art: "Arte",
  music: "Música",
  religion: "Religião",
  "social science": "Ciências Sociais",
  science: "Ciência",
  "true crime": "Crime Real",
  epic: "Épico",
  literary: "Literatura"
};

export function traduzirCategoriasGoogleBooks(categories: string[] = []): string[] {
  const resultado: string[] = [];
  const vistos = new Set<string>();

  for (const cat of categories) {
    if (!cat?.trim()) continue;
    // Divide categorias compostas como "Fiction / Fantasy / Epic"
    const partes = cat
      .split("/")
      .map((p) => p.trim())
      .filter((p) => p && p.toLowerCase() !== "general");

    for (const parte of partes) {
      const lower = parte.toLowerCase();
      const traduzido = DICIONARIO_CATEGORIAS[lower] ?? parte;
      if (!vistos.has(traduzido.toLowerCase())) {
        vistos.add(traduzido.toLowerCase());
        resultado.push(traduzido);
      }
    }
  }

  return resultado.slice(0, 5);
}

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
      genres: traduzirCategoriasGoogleBooks(info?.categories ?? []),
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
