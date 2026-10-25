"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ActivityList } from "./activity-list";
import { SectionHeading } from "./section-heading";
import { SiteHeader } from "./site-header";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import { useAuth } from "../contextos/auth-context";
import { Activity, ehUsernameProvisorio, errorMessage, getFeed, searchProfiles } from "../lib/api";

export function FeedShell() {
  const { profile } = useAuth();
  const [feed, setFeed] = useState<{ followingCount: number; items: Activity[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ username: string; displayName: string | null }>>([]);

  useEffect(() => {
    getFeed()
      .then(setFeed)
      .catch((err) => setError(errorMessage(err, "Não foi possível carregar o feed.")));
  }, []);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    try {
      setResults(await searchProfiles(query));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <main className="content-shell">
      <SiteHeader />

      <section className="content-hero">
        <div>
          <h1>Feed</h1>
          <p>O que as pessoas que você segue estão assistindo, jogando e lendo.</p>
        </div>
      </section>

      {(!profile || ehUsernameProvisorio(profile.username)) && (
        <UiCard className="tracking-summary">
          <div>
            <strong>Escolha seu nome de usuário</strong>
            <p>É por ele que seus amigos vão encontrar e seguir você.</p>
          </div>
          <UiButton href="/perfil">Editar perfil</UiButton>
        </UiCard>
      )}

      <section className="content-panel">
        <SectionHeading eyebrow="Pessoas" title="Encontre amigos" description="Busque pelo nome de usuário." />
        <form className="filter-bar" onSubmit={handleSearch}>
          <label className="filter-search">
            <span className="sr-only">Buscar pessoas</span>
            <input type="search" maxLength={100} value={query} placeholder="@usuario" onChange={(e) => setQuery(e.target.value)} />
          </label>
          <UiButton type="submit" variant="secondary" disabled={query.trim().length < 2}>
            Buscar
          </UiButton>
        </form>
        {results.length > 0 && (
          <div className="search-results">
            {results.map((person) => (
              <Link key={person.username} className="filter-chip" href={`/u/${person.username}`}>
                {person.displayName ? `${person.displayName} · ` : ""}@{person.username}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="content-panel">
        <SectionHeading eyebrow="Atividade" title="Últimas novidades" description="Suas atividades e as de quem você segue." />
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {!feed && !error && <p className="panel-note">Carregando…</p>}
        {feed && feed.items.length === 0 && (
          <p className="panel-note">
            {feed.followingCount === 0
              ? "Você ainda não segue ninguém. Busque amigos acima para ver o que eles estão acompanhando."
              : "Nada por aqui ainda."}
          </p>
        )}
        {feed && feed.items.length > 0 && <ActivityList items={feed.items} />}
      </section>
    </main>
  );
}
