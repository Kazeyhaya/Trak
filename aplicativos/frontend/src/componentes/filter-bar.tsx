"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useI18n } from "../contextos/i18n-context";

const filters = [
  { label: "Todos", value: "" },
  { label: "Filmes", value: "movie" },
  { label: "Séries", value: "series" },
  { label: "Novelas", value: "novela" },
  { label: "Doramas", value: "dorama" },
  { label: "Animes e animações", value: "anime" },
  { label: "Jogos", value: "game" },
  { label: "Livros", value: "book" }
];

const MAX_SEARCH_LENGTH = 50;

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
  novela: [
    { label: "Todos os gêneros", value: "" },
    { label: "Drama", value: "drama" },
    { label: "Romance", value: "romance" },
    { label: "Comédia", value: "comedia" },
    { label: "Mistério", value: "misterio" },
    { label: "Crime", value: "crime" },
    { label: "Família", value: "familia" }
  ],
  dorama: [
    { label: "Todos os gêneros", value: "" },
    { label: "Drama", value: "drama" },
    { label: "Romance", value: "romance" },
    { label: "Comédia", value: "comedia" },
    { label: "Ação e Aventura", value: "acao" },
    { label: "Sci-Fi e Fantasia", value: "fantasia" },
    { label: "Mistério", value: "misterio" },
    { label: "Crime", value: "crime" }
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
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("q") ?? "";
  const urlType = normalizeValue(searchParams.get("type"));
  const urlGenre = normalizeValue(searchParams.get("genre"));

  const [query, setQuery] = useState(urlQuery);
  const [activeType, setActiveType] = useState(urlType);
  const [activeGenre, setActiveGenre] = useState(urlGenre);
  const [isPending, startTransition] = useTransition();

  // Sincroniza se a URL mudar externamente (ex: botao "Limpar busca" ou voltar no historico)
  useEffect(() => {
    queueMicrotask(() => setQuery(urlQuery.slice(0, MAX_SEARCH_LENGTH)));
  }, [urlQuery]);

  useEffect(() => {
    queueMicrotask(() => setActiveType(urlType));
  }, [urlType]);

  useEffect(() => {
    queueMicrotask(() => setActiveGenre(urlGenre));
  }, [urlGenre]);

  const availableGenres = GENRES_BY_TYPE[activeType] ?? GENRES_BY_TYPE[""];

  function updateUrl(nextQuery: string, nextType: string, nextGenre: string) {
    const params = new URLSearchParams(searchParams.toString());
    const cleanQuery = nextQuery.trim().slice(0, MAX_SEARCH_LENGTH);

    if (cleanQuery) {
      params.set("q", cleanQuery);
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

    startTransition(() => {
      router.replace(targetUrl, { scroll: false });
    });
  }

  // Busca em tempo real com debounce enquanto o usuario digita
  useEffect(() => {
    const currentQ = (searchParams.get("q") ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
    const targetQ = query.trim().slice(0, MAX_SEARCH_LENGTH);
    if (targetQ === currentQ) {
      return;
    }

    const timer = setTimeout(() => {
      updateUrl(query, activeType, activeGenre);
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateUrl(query, activeType, activeGenre);
  }

  function handleClear() {
    setQuery("");
    updateUrl("", activeType, activeGenre);
  }

  return (
    <form className="filter-bar" aria-label="Filtros do catálogo" onSubmit={handleSubmit}>
      <label className="filter-search">
        <span className="sr-only">Buscar no catálogo</span>
        <svg
          className="filter-search-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          maxLength={MAX_SEARCH_LENGTH}
          value={query}
          onChange={(event) => setQuery(event.target.value.slice(0, MAX_SEARCH_LENGTH))}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              handleClear();
            }
          }}
          placeholder={t("catalog.searchPlaceholder", "Buscar filmes, séries, jogos e livros")}
        />
        {isPending ? (
          <span className="filter-search-spinner" aria-label="Buscando..." />
        ) : (
          <div className="filter-search-actions">
            {query.length >= 35 && (
              <span
                className="filter-search-counter"
                data-full={query.length >= MAX_SEARCH_LENGTH ? "true" : undefined}
                aria-live="polite"
              >
                {query.length}/{MAX_SEARCH_LENGTH}
              </span>
            )}
            {query ? (
              <button
                type="button"
                className="filter-search-clear"
                aria-label="Limpar busca"
                onClick={handleClear}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            ) : null}
          </div>
        )}
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
