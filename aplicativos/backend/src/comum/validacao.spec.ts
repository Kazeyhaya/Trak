import "reflect-metadata";
import { ArgumentMetadata, BadRequestException, ValidationPipe } from "@nestjs/common";
import { CriarComentarioDto } from "../modulos/comentarios/dto/criar-comentario.dto";
import { ImportarLetterboxdDto } from "../modulos/importacao/dto/importar.dto";
import { ModerarDenunciaDto } from "../modulos/moderacao/dto/moderar-denuncia.dto";
import { SalvarPerfilDto } from "../modulos/social/dto/salvar-perfil.dto";
import { AvaliarEpisodioDto } from "../modulos/tracking/dto/avaliar-episodio.dto";
import { MarcarEpisodiosDto } from "../modulos/tracking/dto/marcar-episodios.dto";
import { SalvarTrackingDto } from "../modulos/tracking/dto/salvar-tracking.dto";

// Mesma configuracao do main.ts.
const pipe = new ValidationPipe({ whitelist: true, transform: true });

function validar<T>(metatype: new () => T, valor: unknown): Promise<T> {
  return pipe.transform(valor, { type: "body", metatype } as ArgumentMetadata);
}

async function erros(metatype: new () => unknown, valor: unknown): Promise<{ message: string[] }> {
  try {
    await validar(metatype, valor);
    return { message: [] };
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    return (error as BadRequestException).getResponse() as { message: string[] };
  }
}

describe("SalvarTrackingDto", () => {
  it("mantem os campos validos e descarta os desconhecidos", async () => {
    const dto = await validar(SalvarTrackingDto, {
      status: "DROPPED",
      progress: 40,
      rating: 4,
      notes: "  bom  ",
      hack: true
    });
    expect(dto).toMatchObject({ status: "DROPPED", progress: 40, rating: 4, notes: "bom" });
    expect(dto).not.toHaveProperty("hack");
  });

  it("aceita null para limpar avaliacao e nota", async () => {
    const dto = await validar(SalvarTrackingDto, { rating: null, notes: "   " });
    expect(dto.rating).toBeNull();
    expect(dto.notes).toBeNull();
  });

  it("aceita notas fracionadas (ex: 4.5 e 0.5)", async () => {
    const dto1 = await validar(SalvarTrackingDto, { rating: 4.5 });
    expect(dto1.rating).toBe(4.5);
    const dto2 = await validar(SalvarTrackingDto, { rating: 0.5 });
    expect(dto2.rating).toBe(0.5);
  });

  it("aceita paginas lidas e total da edicao dentro do limite", async () => {
    const dto = await validar(SalvarTrackingDto, { pagesRead: 0, totalPages: 50000 });
    expect(dto).toMatchObject({ pagesRead: 0, totalPages: 50000 });
  });

  it("aceita URLs HTTPS validas para capa e avatar de personagem", async () => {
    const dto = await validar(SalvarTrackingDto, {
      customCoverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.png",
      favoriteCharacterAvatar: "https://image.tmdb.org/t/p/w185/char.jpg"
    });
    expect(dto.customCoverUrl).toBe("https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.png");
    expect(dto.favoriteCharacterAvatar).toBe("https://image.tmdb.org/t/p/w185/char.jpg");
  });

  it.each([
    { customCoverUrl: "javascript:alert(1)" },
    { customCoverUrl: "http://inseguro.com/foto.jpg" },
    { customCoverUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA" },
    { favoriteCharacterAvatar: "javascript:void(0)" },
    { favoriteCharacterAvatar: "http://site.com/avatar.png" },
    { status: "X" },
    { progress: 101 },
    { progress: 1.5 },
    { rating: 0 },
    { rating: 0.4 },
    { rating: 6 },
    { rating: 4.55 },
    { notes: "a".repeat(1001) },
    { pagesRead: -1 },
    { pagesRead: 50001 },
    { totalPages: 50001 },
    { totalPages: 1e21 },
    { pagesRead: 10.5 }
  ])(
    "rejeita entrada invalida #%#",
    async (valor) => {
      expect((await erros(SalvarTrackingDto, valor)).message.length).toBeGreaterThan(0);
    }
  );
});

describe("MarcarEpisodiosDto", () => {
  it("aceita uma lista de episodios", async () => {
    const dto = await validar(MarcarEpisodiosDto, { season: 1, episodes: [1, 2], watched: true });
    expect(dto.episodes).toEqual([1, 2]);
  });

  it.each([
    { season: 1, episodes: [], watched: true },
    { season: 1, episodes: [0], watched: true },
    { season: -1, episodes: [1], watched: true },
    { season: 1, episodes: [1] }
  ])("rejeita %p", async (valor) => {
    expect((await erros(MarcarEpisodiosDto, valor)).message.length).toBeGreaterThan(0);
  });
});

describe("AvaliarEpisodioDto", () => {
  it("aceita avaliacao fracionada e personagem que roubou a cena", async () => {
    const dto = await validar(AvaliarEpisodioDto, {
      season: 1,
      episode: 3,
      rating: 4.5,
      highlightCharacterId: "123",
      highlightCharacterName: "Bill",
      highlightCharacterAvatar: "https://image.tmdb.org/t/p/w185/bill.jpg"
    });
    expect(dto).toMatchObject({
      season: 1,
      episode: 3,
      rating: 4.5,
      highlightCharacterName: "Bill",
      highlightCharacterAvatar: "https://image.tmdb.org/t/p/w185/bill.jpg"
    });
  });

  it("rejeita episodio negativo ou nota fora da faixa", async () => {
    expect((await erros(AvaliarEpisodioDto, { season: 1, episode: 0 })).message.length).toBeGreaterThan(0);
    expect((await erros(AvaliarEpisodioDto, { season: 1, episode: 1, rating: 6 })).message.length).toBeGreaterThan(0);
  });

  it("rejeita URL insegura no avatar de personagem de episodio", async () => {
    expect((await erros(AvaliarEpisodioDto, { season: 1, episode: 1, highlightCharacterAvatar: "javascript:alert(1)" })).message.length).toBeGreaterThan(0);
    expect((await erros(AvaliarEpisodioDto, { season: 1, episode: 1, highlightCharacterAvatar: "http://inseguro.com/foto.jpg" })).message.length).toBeGreaterThan(0);
  });
});

describe("SalvarPerfilDto", () => {
  it("normaliza o nome de usuario para minusculas e aceita idioma valido", async () => {
    const dto = await validar(SalvarPerfilDto, { username: "  Ana_123 ", bio: " oi ", language: "en-US" });
    expect(dto).toMatchObject({ username: "ana_123", bio: "oi", language: "en-US" });
  });

  it("aceita avatar em HTTPS ou Data URI JPEG/PNG", async () => {
    const dtoHttps = await validar(SalvarPerfilDto, { avatarUrl: "https://gravatar.com/avatar/123" });
    expect(dtoHttps.avatarUrl).toBe("https://gravatar.com/avatar/123");

    const dataUri = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    const dtoData = await validar(SalvarPerfilDto, { avatarUrl: dataUri });
    expect(dtoData.avatarUrl).toBe(dataUri);
  });

  it("aceita banner em HTTPS mas recusa banner em Data URI", async () => {
    const dtoBanner = await validar(SalvarPerfilDto, { bannerUrl: "https://images.unsplash.com/photo-1" });
    expect(dtoBanner.bannerUrl).toBe("https://images.unsplash.com/photo-1");

    expect((await erros(SalvarPerfilDto, { bannerUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg==" })).message.length).toBeGreaterThan(0);
  });

  it("rejeita esquemas perigosos para avatar e banner (ex: javascript:, SVG)", async () => {
    expect((await erros(SalvarPerfilDto, { avatarUrl: "javascript:alert(1)" })).message.length).toBeGreaterThan(0);
    expect((await erros(SalvarPerfilDto, { avatarUrl: "data:image/svg+xml;base64,PHN2Zz4=" })).message.length).toBeGreaterThan(0);
    expect((await erros(SalvarPerfilDto, { bannerUrl: "javascript:alert(1)" })).message.length).toBeGreaterThan(0);
    expect((await erros(SalvarPerfilDto, { avatarUrl: "http://site.com/foto.png" })).message.length).toBeGreaterThan(0);
  });

  it.each(["ab", "nome com espaco", "a".repeat(21), "acentuação"])("rejeita username %p", async (username) => {
    expect((await erros(SalvarPerfilDto, { username })).message.length).toBeGreaterThan(0);
  });

  it.each(["es", "fr", "pt", "en", "pt_BR"])("rejeita idioma invalido %p", async (language) => {
    expect((await erros(SalvarPerfilDto, { username: "ana_123", language })).message.length).toBeGreaterThan(0);
  });
});

describe("outros DTOs", () => {
  it("comentario so com espacos e rejeitado", async () => {
    expect((await erros(CriarComentarioDto, { mediaItemId: "x", content: "   " })).message.length).toBeGreaterThan(0);
  });

  it("lista do Letterboxd precisa ser conhecida", async () => {
    expect((await erros(ImportarLetterboxdDto, { csv: "a", lista: "outra" })).message.length).toBeGreaterThan(0);
    await expect(validar(ImportarLetterboxdDto, { csv: "a", lista: "watchlist" })).resolves.toBeDefined();
  });

  it("moderacao aceita apenas status conhecidos", async () => {
    expect((await erros(ModerarDenunciaDto, { status: "APAGAR" })).message.length).toBeGreaterThan(0);
    await expect(validar(ModerarDenunciaDto, { status: "RESOLVED", removerComentario: true })).resolves.toBeDefined();
  });
});
