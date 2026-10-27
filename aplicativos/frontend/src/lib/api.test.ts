import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  ehUsernameProvisorio,
  errorMessage,
  getStatusLabel,
  getTrackingItem,
  markEpisodes,
  request,
  saveTrackingItem,
  TRACKING_STATUSES
} from "./api";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(resposta: Response) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(resposta);
}

describe("getStatusLabel", () => {
  it("tem rotulo para todos os status, inclusive Abandonado", () => {
    for (const status of TRACKING_STATUSES) {
      expect(getStatusLabel(status)).toBeTruthy();
    }
    expect(getStatusLabel("DROPPED")).toBe("Abandonado");
  });

  it("adapta o verbo ao tipo de midia", () => {
    expect(getStatusLabel("WATCHING", "GAME")).toBe("Jogando");
    expect(getStatusLabel("WATCHING", "BOOK")).toBe("Lendo");
    expect(getStatusLabel("WANT", "MOVIE")).toBe("Quero ver");
    expect(getStatusLabel("WANT", "GAME")).toBe("Quero jogar");
    expect(getStatusLabel("WANT", "BOOK")).toBe("Quero ler");
    expect(getStatusLabel("COMPLETED", "BOOK")).toBe("Lido");
    expect(getStatusLabel("COMPLETED", "GAME")).toBe("Zerado");
  });
});

describe("request", () => {
  it("envia JSON e le a resposta", async () => {
    const fetch = mockFetch(new Response(JSON.stringify({ id: "t1", status: "DROPPED" }), { status: 200 }));

    const resultado = await saveTrackingItem("tmdb_movie_1", { status: "DROPPED", rating: null });

    expect(resultado).toEqual({ id: "t1", status: "DROPPED" });
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toMatch(/\/tracking\/items\/tmdb_movie_1$/);
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(String(init?.body))).toEqual({ status: "DROPPED", rating: null });
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
  });

  it("sem sessao nao envia Authorization", async () => {
    const fetch = mockFetch(new Response("{}", { status: 200 }));
    await request("/qualquer");
    expect(new Headers(fetch.mock.calls[0][1]?.headers).has("Authorization")).toBe(false);
  });

  it("corpo vazio vira null (controller do Nest retornando null)", async () => {
    mockFetch(new Response("", { status: 200 }));
    await expect(getTrackingItem("x")).resolves.toBeNull();
  });

  it("codifica ids na URL", async () => {
    const fetch = mockFetch(new Response("{}", { status: 200 }));
    await markEpisodes("a/b", 1, [1], true);
    expect(String(fetch.mock.calls[0][0])).toContain("/tracking/items/a%2Fb/episodios");
  });

  it("junta mensagens de validacao do Nest", async () => {
    mockFetch(new Response(JSON.stringify({ message: ["campo a", "campo b"] }), { status: 400 }));
    await expect(request("/x")).rejects.toMatchObject({ message: "campo a campo b", status: 400 });
  });

  it("falha de rede vira ApiError com status 0", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("failed"));
    await expect(request("/x")).rejects.toMatchObject({ status: 0 });
  });
});

describe("ehUsernameProvisorio", () => {
  it("reconhece o username gerado no cadastro", () => {
    expect(ehUsernameProvisorio("user_1a2b3c4d5e6f")).toBe(true);
    expect(ehUsernameProvisorio("user_ana")).toBe(false);
    expect(ehUsernameProvisorio("ana_1")).toBe(false);
  });
});

describe("errorMessage", () => {
  it("traduz 429 em mensagem amigavel", () => {
    expect(errorMessage(new ApiError("ThrottlerException", 429))).toMatch(/Muitas tentativas/);
  });

  it("nao exibe detalhes internos de erros 5xx", () => {
    expect(errorMessage(new ApiError("Configure SUPABASE_URL", 500))).not.toMatch(/SUPABASE/);
    expect(errorMessage(new ApiError("relation does not exist", 502))).toMatch(/servidor/);
    expect(errorMessage(new ApiError("Importacao da Steam indisponivel", 503))).toMatch(/Steam/);
  });

  it("usa a mensagem da API ou o texto padrao", () => {
    expect(errorMessage(new ApiError("Nome em uso", 409))).toBe("Nome em uso");
    expect(errorMessage(new Error("interno"), "Padrão")).toBe("Padrão");
  });
});
