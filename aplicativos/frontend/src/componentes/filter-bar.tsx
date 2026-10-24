"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const filters = [
  { label: "Todos", value: "" },
  { label: "Filmes", value: "movie" },
  { label: "Séries", value: "series" },
  { label: "Animes e animações", value: "anime" },
  { label: "Jogos", value: "game" },
  { label: "Livros", value: "book" }
];

type GenreOption = { label: string; value: string };

const GENRES_BY_TYPE: Record<string, GenreOption[]> = {
  "": [
    { label: "Todos os gêneros", value: "" },
    { label: "Ação", value: "acao" },
    { label: "Aventura", value: "aventura" },
    { label: "Comédia", value: "comedia" },
    { label: "Drama", value: "drama" },
    { label: "Ficção Científica", value: "ficcao" },
    { label: "Fantasia", value: "fantasia" },
    { label: "Terror", value: "terror" },
    { label: "Romance", value: "romance" },
    { label: "Mistério", value: "misterio" },
    { label: "Documentário", value: "documentario" }
  ],
  movie: [
    { label: "Todos os gêneros", value: "" },
    { label: "Ação", value: "acao" },
    { label: "Aventura", value: "aventura" },
    { label: "Comédia", value: "comedia" },
    { label: "Drama", value: "drama" },
    { label: "Ficção Científica", value: "ficcao" },
    { label: "Fantasia", value: "fantasia" },
    { label: "Terror", value: "terror" },
    { label: "Suspense", value: "suspense" },
    { label: "Romance", value: "romance" },
    { label: "Mistério", value: "misterio" },
    { label: "Crime", value: "crime" },
    { label: "Documentário", value: "documentario" },
    { label: "Família", value: "familia" },
    { label: "Guerra", value: "guerra" },
    { label: "História", value: "historia" },
    { label: "Música", value: "musica" },
    { label: "Faroeste", value: "faroeste" }
  ],
  series: [
    { label: "Todos os gêneros", value: "" },
    { label: "Ação e Aventura", value: "acao" },
    { label: "Comédia", value: "comedia" },
    { label: "Drama", value: "drama" },
    { label: "Sci-Fi e Fantasia", value: "ficcao" },
    { label: "Mistério", value: "misterio" },
    { label: "Crime", value: "crime" },
    { label: "Documentário", value: "documentario" },
    { label: "Família", value: "familia" },
    { label: "Guerra e Política", value: "guerra" },
    { label: "Faroeste", value: "faroeste" }
  ],
  anime: [
    { label: "Todos os gêneros", value: "" },
    { label: "Ação e Aventura", value: "acao" },
    { label: "Comédia", value: "comedia" },
    { label: "Drama", value: "drama" },
    { label: "Sci-Fi e Fantasia", value: "fantasia" },
    { label: "Romance", value: "romance" },
    { label: "Mistério e Terror", value: "misterio" },
    { label: "Família", value: "familia" }
  ],
  game: [
    { label: "Todos os gêneros", value: "" },
    { label: "Ação", value: "acao" },
    { label: "Aventura", value: "aventura" },
    { label: "RPG", value: "rpg" },
    { label: "Estratégia", value: "estrategia" },
    { label: "Tiro (Shooter)", value: "tiro" },
    { label: "Plataforma", value: "plataforma" },
    { label: "Corrida", value: "corrida" },
    { label: "Esportes", value: "esportes" },
    { label: "Luta", value: "luta" },
    { label: "Simulação", value: "simulacao" },
    { label: "Puzzle", value: "puzzle" },
    { label: "Indie", value: "indie" }
  ],
  book: [
    { label: "Todos os gêneros", value: "" },
    { label: "Fantasia", value: "fantasia" },
    { label: "Ficção Científica", value: "ficcao" },
    { label: "Romance", value: "romance" },
    { label: "Mistério e Policial", value: "misterio" },
    { label: "Terror", value: "terror" },
    { label: "Suspense (Thriller)", value: "suspense" },
    { label: "Aventura", value: "aventura" },
    { label: "Drama", value: "drama" },
    { label: "Humor", value: "comedia" },
    { label: "História", value: "historia" },
    { label: "Biografia", value: "biografia" },
    { label: "Poesia", value: "poesia" },
    { label: "Infantojuvenil", value: "familia" },
    { label: "Autoajuda", value: "autoajuda" }
  ]
};

function normalizeValue(value?: string | null) {
  return value ? value.toLowerCase() : "";
}

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // O CatalogShell remonta este componente (via key) quando a URL muda.
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [activeType, setActiveType] = useState(normalizeValue(searchParams.get("type")));
  const [activeGenre, setActiveGenre] = useState(normalizeValue(searchParams.get("genre")));

  const availableGenres = GENRES_BY_TYPE[activeType] ?? GENRES_BY_TYPE[""];

  function updateUrl(nextQuery: string, nextType: string, nextGenre: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim());
    } else {
      params.delete("q");
    }

    if (nextType) {
      params.set("type", nextType);
    } else {
      params.delete("type");
    }

    if (nextGenre) {
      params.set("genre", nextGenre);
    } else {
      params.delete("genre");
    }

    const nextQueryString = params.toString();
    const targetUrl = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;

    router.replace(targetUrl, { scroll: false });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateUrl(query, activeType, activeGenre);
  }

  return (
    <form className="filter-bar" aria-label="Filtros do catálogo" onSubmit={handleSubmit}>
      <label className="filter-search">
        <span className="sr-only">Buscar no catálogo</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar filmes, séries, jogos e livros"
        />
      </label>

      <div className="filter-controls-row">
        <div className="filter-group">
          <span className="filter-group-label">Tipo de mídia</span>
          <div className="filter-chips" role="group" aria-label="Categorias">
            {filters.map((filter) => {
              const isActive = activeType === filter.value;

              return (
                <button
                  key={filter.value || "all"}
                  type="button"
                  className={`filter-chip${isActive ? " is-active" : ""}`}
                  aria-pressed={isActive}
                  onClick={() => {
                    const nextType = filter.value;
                    const nextTypeGenres = GENRES_BY_TYPE[nextType] ?? GENRES_BY_TYPE[""];
                    const genreStillValid = nextTypeGenres.some((g) => g.value === activeGenre);
                    const nextGenre = genreStillValid ? activeGenre : "";
                    setActiveType(nextType);
                    setActiveGenre(nextGenre);
                    updateUrl(query, nextType, nextGenre);
                  }}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="filter-group filter-genre-select">
          <span className="filter-group-label">Gênero</span>
          <select
            value={activeGenre}
            aria-label="Filtrar por gênero"
            onChange={(event) => {
              const nextGenre = event.target.value;
              setActiveGenre(nextGenre);
              updateUrl(query, activeType, nextGenre);
            }}
          >
            {availableGenres.map((genre) => (
              <option key={genre.value || "all-genres"} value={genre.value}>
                {genre.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </form>
  );
}
