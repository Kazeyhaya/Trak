"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const filters = [
  { label: "Todos", value: "" },
  { label: "Filmes", value: "movie" },
  { label: "Series", value: "series" },
  { label: "Jogos", value: "game" },
  { label: "Livros", value: "book" }
];

function normalizeType(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.toLowerCase();
}

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState("");

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setActiveType(normalizeType(searchParams.get("type")));
  }, [searchParams]);

  function updateUrl(nextQuery: string, nextType: string) {
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

    const nextQueryString = params.toString();
    const targetUrl = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;

    router.replace(targetUrl, { scroll: false });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateUrl(query, activeType);
  }

  return (
    <form className="filter-bar" aria-label="Filtros de catalogo" onSubmit={handleSubmit}>
      <label className="filter-search">
        <span className="sr-only">Buscar no catálogo</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por titulo, fonte ou ano"
        />
      </label>

      <div className="filter-chips" role="list" aria-label="Categorias">
        {filters.map((filter) => {
          const isActive = activeType === filter.value;

          return (
            <button
              key={filter.value || "all"}
              type="button"
              className={`filter-chip${isActive ? " is-active" : ""}`}
              onClick={() => {
                const nextType = filter.value;
                setActiveType(nextType);
                updateUrl(query, nextType);
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </form>
  );
}