import "reflect-metadata";
import { ArgumentMetadata, BadRequestException, ValidationPipe } from "@nestjs/common";
import { CriarComentarioDto } from "../modulos/comentarios/dto/criar-comentario.dto";
import { ImportarLetterboxdDto } from "../modulos/importacao/dto/importar.dto";
import { ModerarDenunciaDto } from "../modulos/moderacao/dto/moderar-denuncia.dto";
import { SalvarPerfilDto } from "../modulos/social/dto/salvar-perfil.dto";
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

  it.each([{ status: "X" }, { progress: 101 }, { progress: 1.5 }, { rating: 0 }, { rating: 6 }, { notes: "a".repeat(2001) }])(
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

describe("SalvarPerfilDto", () => {
  it("normaliza o nome de usuario para minusculas", async () => {
    const dto = await validar(SalvarPerfilDto, { username: "  Ana_123 ", bio: " oi " });
    expect(dto).toMatchObject({ username: "ana_123", bio: "oi" });
  });

  it.each(["ab", "nome com espaco", "a".repeat(21), "acentuação"])("rejeita username %p", async (username) => {
    expect((await erros(SalvarPerfilDto, { username })).message.length).toBeGreaterThan(0);
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
