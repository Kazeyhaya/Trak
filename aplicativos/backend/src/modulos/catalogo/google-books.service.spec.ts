import { GoogleBooksService } from "./google-books.service";

describe("GoogleBooksService", () => {
  const originalEnv = { ...process.env };
  let service: GoogleBooksService;

  beforeEach(() => {
    service = new GoogleBooksService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  describe("searchBooks", () => {
    it("busca livros com langRestrict=pt e mapeia para CatalogItem", async () => {
      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                id: "vol_123",
                volumeInfo: {
                  title: "Dom Casmurro",
                  description: "<p>Um clássico da literatura brasileira.</p>",
                  publishedDate: "1899",
                  imageLinks: {
                    thumbnail: "http://books.google.com/thumbnail.jpg"
                  }
                }
              }
            ]
          }),
          { status: 200 }
        )
      );

      const items = await service.searchBooks("machado");

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("langRestrict=pt"),
        expect.any(Object)
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("projection=lite"),
        expect.any(Object)
      );

      expect(items).toEqual([
        {
          id: "media_gbooks_vol_123",
          externalId: "vol_123",
          source: "gbooks",
          type: "BOOK",
          title: "Dom Casmurro",
          synopsis: "Um clássico da literatura brasileira.",
          coverUrl: "https://books.google.com/thumbnail.jpg",
          releaseYear: 1899
        }
      ]);
    });

    it("inclui chave de API se GOOGLE_BOOKS_API_KEY estiver configurada", async () => {
      process.env.GOOGLE_BOOKS_API_KEY = "test_key_123";
      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [] }), { status: 200 })
      );

      await service.searchBooks("teste");

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("key=test_key_123"),
        expect.any(Object)
      );
    });

    it("retorna array vazio em caso de erro HTTP ou falha de rede", async () => {
      jest.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network timeout"));

      const items = await service.searchBooks("teste");
      expect(items).toEqual([]);
    });
  });

  describe("getBookById", () => {
    it("aceita ID com prefixo media_gbooks_ e mapeia retorno", async () => {
      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "abc_456",
            volumeInfo: {
              title: "Memórias Póstumas",
              description: "Narrativa póstuma.",
              publishedDate: "1881-01-01",
              imageLinks: {
                thumbnail: "https://books.google.com/capa.jpg"
              }
            }
          }),
          { status: 200 }
        )
      );

      const item = await service.getBookById("media_gbooks_abc_456");

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/volumes/abc_456"),
        expect.any(Object)
      );

      expect(item).toEqual({
        id: "media_gbooks_abc_456",
        externalId: "abc_456",
        source: "gbooks",
        type: "BOOK",
        title: "Memórias Póstumas",
        synopsis: "Narrativa póstuma.",
        coverUrl: "https://books.google.com/capa.jpg",
        releaseYear: 1881
      });
    });

    it("aceita ID sem prefixo media_gbooks_", async () => {
      jest.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "xyz_789",
            volumeInfo: {
              title: "O Alquimista",
              publishedDate: "1988"
            }
          }),
          { status: 200 }
        )
      );

      const item = await service.getBookById("xyz_789");
      expect(item?.id).toBe("media_gbooks_xyz_789");
      expect(item?.externalId).toBe("xyz_789");
      expect(item?.releaseYear).toBe(1988);
    });

    it("retorna null se o livro não for encontrado ou id for vazio", async () => {
      jest.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response("Not Found", { status: 404 })
      );

      const item = await service.getBookById("inexistente");
      expect(item).toBeNull();

      expect(await service.getBookById("")).toBeNull();
    });
  });
});
