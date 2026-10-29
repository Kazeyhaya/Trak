import { HardcoverService, mapHardcoverBook } from "./hardcover.service";

describe("HardcoverService", () => {
  let service: HardcoverService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, HARDCOVER_API_KEY: "test_hardcover_token" };
    service = new HardcoverService();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe("mapHardcoverBook", () => {
    it("deve mapear livro com cached_image corretamente", () => {
      const item = mapHardcoverBook({
        id: 1803823,
        title: "As 48 Leis do Poder",
        description: "<p>Sinopse de teste.</p>",
        release_year: 1998,
        cached_image: {
          url: "https://assets.hardcover.app/edition/cover.jpg"
        }
      });

      expect(item).toEqual({
        id: "media_hardcover_1803823",
        externalId: "1803823",
        source: "hardcover",
        type: "BOOK",
        title: "As 48 Leis do Poder",
        coverUrl: "https://assets.hardcover.app/edition/cover.jpg",
        synopsis: "Sinopse de teste.",
        releaseYear: 1998
      });
    });

    it("deve mapear hit de busca com image.url e id em string", () => {
      const item = mapHardcoverBook({
        id: "328491",
        title: "Harry Potter",
        description: "A boy wizard.",
        release_year: 1997,
        image: {
          url: "https://assets.hardcover.app/external/hp.jpg"
        }
      });

      expect(item.id).toBe("media_hardcover_328491");
      expect(item.externalId).toBe("328491");
      expect(item.coverUrl).toBe("https://assets.hardcover.app/external/hp.jpg");
      expect(item.title).toBe("Harry Potter");
    });
  });

  describe("searchBooks", () => {
    it("retorna lista vazia se HARDCOVER_API_KEY nao estiver configurada", async () => {
      delete process.env.HARDCOVER_API_KEY;
      const res = await service.searchBooks("qualquer livro");
      expect(res).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("chama endpoint GraphQL com query e headers corretos", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            search: {
              results: {
                hits: [
                  {
                    document: {
                      id: "123",
                      title: "O Hobbit",
                      release_year: 1937,
                      image: { url: "https://assets.hardcover.app/hobbit.jpg" },
                      description: "Uma aventura na Terra Media."
                    }
                  }
                ]
              }
            }
          }
        })
      });

      const res = await service.searchBooks("Hobbit", 10);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe("media_hardcover_123");
      expect(res[0].title).toBe("O Hobbit");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.hardcover.app/v1/graphql",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer test_hardcover_token"
          })
        })
      );
    });

    it("deve delegar para getPopularBooks se a query for vazia", async () => {
      jest.spyOn(service, "getPopularBooks").mockResolvedValueOnce([
        {
          id: "media_hardcover_999",
          externalId: "999",
          source: "hardcover",
          type: "BOOK",
          title: "Livro Popular",
          coverUrl: null,
          synopsis: null,
          releaseYear: 2020
        }
      ]);

      const res = await service.searchBooks("   ", 10);
      expect(service.getPopularBooks).toHaveBeenCalledWith(10);
      expect(res).toHaveLength(1);
    });

    it("retorna vazio se o backend responder status de erro", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const res = await service.searchBooks("teste");
      expect(res).toEqual([]);
    });
  });

  describe("getBookById", () => {
    it("deve carregar e mapear livro buscando por books_by_pk", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            books_by_pk: {
              id: 1803823,
              title: "As 48 Leis do Poder",
              description: "Poder e estrategia.",
              release_year: 1998,
              pages: 460,
              rating: 5,
              cached_image: {
                url: "https://assets.hardcover.app/power.jpg"
              }
            }
          }
        })
      });

      const res = await service.getBookById("media_hardcover_1803823");
      expect(res).not.toBeNull();
      expect(res?.id).toBe("media_hardcover_1803823");
      expect(res?.title).toBe("As 48 Leis do Poder");
      expect(res?.coverUrl).toBe("https://assets.hardcover.app/power.jpg");
    });

    it("retorna null se o livro nao existir", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            books_by_pk: null
          }
        })
      });

      const res = await service.getBookById(9999999);
      expect(res).toBeNull();
    });
  });
});
