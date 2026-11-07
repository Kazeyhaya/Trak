import { describe, expect, it } from "vitest";
import { resolveProviderUrl } from "./provedores";

describe("resolveProviderUrl", () => {
  it("preserva links profundos de lojas e servicos", () => {
    const steamUrl = "https://store.steampowered.com/app/1091500/Cyberpunk_2077/";
    expect(resolveProviderUrl("Steam", "Cyberpunk 2077", steamUrl)).toBe(steamUrl);

    const gogUrl = "https://www.gog.com/en/game/the_witcher_3_wild_hunt";
    expect(resolveProviderUrl("GOG", "The Witcher 3", gogUrl)).toBe(gogUrl);
  });

  it("ignora links do TMDB e URLs vazias ou de dominio raiz e gera link de busca", () => {
    expect(
      resolveProviderUrl("Netflix", "Stranger Things", "https://www.themoviedb.org/watch/123")
    ).toBe("https://www.netflix.com/search?q=Stranger%20Things");

    expect(resolveProviderUrl("Netflix", "Stranger Things", "https://netflix.com/")).toBe(
      "https://www.netflix.com/search?q=Stranger%20Things"
    );
  });

  it("monta URLs de busca para os principais servicos de streaming", () => {
    expect(resolveProviderUrl("Prime Video", "The Boys")).toBe(
      "https://www.primevideo.com/search?phrase=The%20Boys"
    );
    expect(resolveProviderUrl("Apple TV", "Severance")).toBe(
      "https://tv.apple.com/br/search?term=Severance"
    );
    expect(resolveProviderUrl("Disney Plus", "Andor")).toBe("https://www.disneyplus.com/pt-br");
    expect(resolveProviderUrl("Max", "Succession")).toBe("https://play.max.com/search?q=Succession");
    expect(resolveProviderUrl("Globoplay", "Pantanal")).toBe(
      "https://globoplay.globo.com/busca/?q=Pantanal"
    );
    expect(resolveProviderUrl("Crunchyroll", "Chainsaw Man")).toBe(
      "https://www.crunchyroll.com/pt-br/search?q=Chainsaw%20Man"
    );
  });

  it("monta URLs de busca para plataformas de jogos", () => {
    expect(resolveProviderUrl("Steam", "Hollow Knight")).toBe(
      "https://store.steampowered.com/search/?term=Hollow%20Knight"
    );
    expect(resolveProviderUrl("PlayStation Store", "Bloodborne")).toBe(
      "https://store.playstation.com/pt-br/search/Bloodborne"
    );
    expect(resolveProviderUrl("Xbox", "Halo")).toBe(
      "https://www.xbox.com/pt-br/Search/Results?q=Halo"
    );
    expect(resolveProviderUrl("Nintendo", "Zelda")).toBe(
      "https://www.nintendo.com/pt-br/search/#q=Zelda"
    );
  });

  it("gera busca no Google como fallback para provedores desconhecidos", () => {
    expect(resolveProviderUrl("Provedor Local", "Obra Especial")).toBe(
      "https://www.google.com/search?q=Obra%20Especial%20Provedor%20Local"
    );
  });
});
