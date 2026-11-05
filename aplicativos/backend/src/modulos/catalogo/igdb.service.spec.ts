import { formatarUrlCapaIgdb, IgdbService, semDuplicatas } from "./igdb.service";

describe("IgdbService", () => {
  let service: IgdbService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      IGDB_CLIENT_ID: "mock_client_id",
      IGDB_CLIENT_SECRET: "mock_client_secret"
    };
    service = new IgdbService();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe("formatarUrlCapaIgdb", () => {
    it("deve montar URL no formato cover_big_2x por padrão", () => {
      const url = formatarUrlCapaIgdb("co1r7f");
      expect(url).toBe("https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1r7f.jpg");
    });

    it("deve aceitar tamanhos customizados como 720p ou 1080p", () => {
      const url720 = formatarUrlCapaIgdb("co1r7f", "720p");
      expect(url720).toBe("https://images.igdb.com/igdb/image/upload/t_720p/co1r7f.jpg");
    });

    it("deve retornar string vazia se imageId for vazio", () => {
      expect(formatarUrlCapaIgdb("")).toBe("");
    });
  });

  describe("obterToken", () => {
    it("deve autenticar no Twitch OAuth2 e retornar access_token", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "mock_token_123",
          expires_in: 3600,
          token_type: "bearer"
        })
      });

      const token = await service.obterToken();
      expect(token).toBe("mock_token_123");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("https://id.twitch.tv/oauth2/token"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("deve reutilizar o token em cache se ainda estiver válido", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "cached_token_456",
          expires_in: 3600,
          token_type: "bearer"
        })
      });

      const token1 = await service.obterToken();
      const token2 = await service.obterToken();

      expect(token1).toBe("cached_token_456");
      expect(token2).toBe("cached_token_456");
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("deve retornar null se as credenciais não estiverem configuradas", async () => {
      delete process.env.IGDB_CLIENT_ID;
      delete process.env.IGDB_CLIENT_SECRET;
      const novoServico = new IgdbService();

      const token = await novoServico.obterToken();
      expect(token).toBeNull();
    });
  });

  describe("buscarCapaPorNome", () => {
    it("deve retornar a URL de alta resolução da capa encontrada na IGDB", async () => {
      // 1. Mock do token
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "token_abc",
          expires_in: 3600
        })
      });

      // 2. Mock da busca de jogo na IGDB
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 119171,
            name: "Baldur's Gate 3",
            cover: {
              id: 34567,
              image_id: "co670h"
            }
          }
        ]
      });

      const capaUrl = await service.buscarCapaPorNome("Baldur's Gate 3");
      expect(capaUrl).toBe("https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co670h.jpg");
    });

    it("deve retornar null se o jogo não for encontrado ou não tiver capa", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "token_abc",
          expires_in: 3600
        })
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const capaUrl = await service.buscarCapaPorNome("Jogo Desconhecido 12345");
      expect(capaUrl).toBeNull();
    });
  });

  describe("buscar e buscarPorId", () => {
    it("buscar deve retornar lista padronizada de ItemCatalogo", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "token_abc",
          expires_in: 3600
        })
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 1020,
            name: "Grand Theft Auto V",
            summary: "Open world action game",
            first_release_date: 1379376000,
            cover: { id: 1, image_id: "co2lbd" }
          }
        ]
      });

      const itens = await service.buscar("Grand Theft Auto V", 5);
      expect(itens).toEqual([
        {
          id: "igdb_game_1020",
          externalId: "1020",
          source: "igdb",
          type: "GAME",
          title: "Grand Theft Auto V",
          coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co2lbd.jpg",
          synopsis: "Open world action game",
          releaseYear: 2013
        }
      ]);
    });

    it("buscarPorId deve retornar ItemCatalogo a partir do ID igdb_game_", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "token_abc",
          expires_in: 3600
        })
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 1942,
            name: "The Witcher 3: Wild Hunt",
            summary: "RPG épico",
            first_release_date: 1431993600,
            cover: { id: 2, image_id: "co1wyy" }
          }
        ]
      });

      const item = await service.buscarPorId("igdb_game_1942");
      expect(item).toMatchObject({
        id: "igdb_game_1942",
        externalId: "1942",
        source: "igdb",
        type: "GAME",
        title: "The Witcher 3: Wild Hunt",
        coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1wyy.jpg",
        releaseYear: 2015
      });
    });
  });
});

describe("semDuplicatas", () => {
  const ano = (a: number) => Date.UTC(a, 5, 1) / 1000;

  it("deixa um item por jogo: sem edicoes, coletaneas, mods ou titulo+ano repetido", () => {
    const jogos = [
      { id: 1, name: "Resident Evil 4", first_release_date: ano(2005), game_type: 0 },
      { id: 2, name: "Resident Evil 4", first_release_date: ano(2005), game_type: 0 },
      { id: 3, name: "Resident Evil 4", first_release_date: ano(2023), game_type: 8 },
      { id: 4, name: "Resident Evil 4: Gold Edition", first_release_date: ano(2024), version_parent: 3 },
      { id: 5, name: "Resident Evil 4: Wii Edition", first_release_date: ano(2007), version_parent: 1 },
      { id: 6, name: "Resident Evil 4 and Resident Evil Code: Veronica", first_release_date: ano(2009), game_type: 3 },
      { id: 7, name: "Resident Evil 4 HD Project", first_release_date: ano(2022), game_type: 5 },
      { id: 8, name: "Resident Evil 4: Separate Ways", first_release_date: ano(2023), game_type: 1 }
    ];

    expect(semDuplicatas(jogos).map((j) => j.id)).toEqual([1, 3]);
  });

  it("sem game_type (consulta basica), so tira as repeticoes", () => {
    const jogos = [
      { id: 1, name: "Hades", first_release_date: ano(2020) },
      { id: 2, name: "HADES", first_release_date: ano(2020) },
      { id: 3, name: "Hades II", first_release_date: ano(2025) }
    ];
    expect(semDuplicatas(jogos).map((j) => j.id)).toEqual([1, 3]);
  });
});
