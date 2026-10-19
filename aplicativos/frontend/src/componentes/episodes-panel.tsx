"use client";

import { useEffect, useMemo, useState } from "react";

import { SectionHeading } from "./section-heading";
import {
  Episode,
  errorMessage,
  getEpisodes,
  getSeasons,
  getWatchedEpisodes,
  markEpisodes,
  Season,
  TrackingEntry,
  WatchedEpisode
} from "../lib/api";

type EpisodesPanelProps = {
  mediaItemId: string;
  onTrackingChange: (tracking: TrackingEntry) => void;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" });

function jaExibido(airDate: string | null) {
  return Boolean(airDate) && new Date(`${airDate}T00:00:00Z`).getTime() <= Date.now();
}

export function EpisodesPanel({ mediaItemId, onTrackingChange }: EpisodesPanelProps) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [watched, setWatched] = useState<WatchedEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getSeasons(mediaItemId), getWatchedEpisodes(mediaItemId)])
      .then(([seasonList, watchedList]) => {
        if (!active) {
          return;
        }
        setSeasons(seasonList);
        setWatched(watchedList);
        // Abre a primeira temporada que ainda nao foi terminada.
        const vistos = (n: number) => watchedList.filter((w) => w.season === n).length;
        const proxima = seasonList.find((s) => s.seasonNumber > 0 && vistos(s.seasonNumber) < s.episodeCount);
        setSelected((proxima ?? seasonList[0])?.seasonNumber ?? null);
      })
      .catch((err) => active && setError(errorMessage(err, "Não foi possível carregar as temporadas.")));
    return () => {
      active = false;
    };
  }, [mediaItemId]);

  useEffect(() => {
    if (selected === null) {
      return;
    }
    let active = true;
    // Carregamento disparado pela troca de temporada.
    Promise.resolve()
      .then(() => active && setLoadingEpisodes(true))
      .then(() => getEpisodes(mediaItemId, selected))
      .then((list) => active && setEpisodes(list))
      .catch((err) => active && setError(errorMessage(err)))
      .finally(() => active && setLoadingEpisodes(false));
    return () => {
      active = false;
    };
  }, [mediaItemId, selected]);

  const watchedInSeason = useMemo(
    () => new Set(watched.filter((w) => w.season === selected).map((w) => w.episode)),
    [watched, selected]
  );

  async function toggle(episodeNumbers: number[], value: boolean) {
    if (selected === null || episodeNumbers.length === 0) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await markEpisodes(mediaItemId, selected, episodeNumbers, value);
      setWatched(result.episodes);
      onTrackingChange(result.tracking);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (seasons.length === 0 && !error) {
    return null;
  }

  const aired = episodes.filter((e) => jaExibido(e.airDate)).map((e) => e.episodeNumber);
  const allWatched = aired.length > 0 && aired.every((n) => watchedInSeason.has(n));

  return (
    <section className="content-panel">
      <SectionHeading
        eyebrow="Episódios"
        title="Progresso por episódio"
        description="Marque o que você já assistiu. O progresso e o status são atualizados automaticamente."
      />

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <div className="status-chips" role="tablist" aria-label="Temporadas">
        {seasons.map((season) => {
          const count = watched.filter((w) => w.season === season.seasonNumber).length;
          return (
            <button
              key={season.seasonNumber}
              type="button"
              role="tab"
              aria-selected={selected === season.seasonNumber}
              className={`filter-chip${selected === season.seasonNumber ? " is-active" : ""}`}
              onClick={() => setSelected(season.seasonNumber)}
            >
              {season.seasonNumber === 0 ? "Especiais" : `T${season.seasonNumber}`} · {count}/{season.episodeCount}
            </button>
          );
        })}
      </div>

      <div className="episode-toolbar">
        <button
          type="button"
          className="secondary-button"
          disabled={saving || loadingEpisodes || aired.length === 0}
          onClick={() => toggle(aired, !allWatched)}
        >
          {allWatched ? "Desmarcar temporada" : "Marcar temporada como vista"}
        </button>
      </div>

      {loadingEpisodes ? (
        <p className="panel-note">Carregando episódios…</p>
      ) : (
        <ol className="episode-list">
          {episodes.map((episode) => {
            const isWatched = watchedInSeason.has(episode.episodeNumber);
            const disponivel = jaExibido(episode.airDate);
            return (
              <li key={episode.episodeNumber} className={isWatched ? "is-watched" : undefined}>
                <label>
                  <input
                    type="checkbox"
                    checked={isWatched}
                    disabled={saving || !disponivel}
                    onChange={(event) => toggle([episode.episodeNumber], event.target.checked)}
                  />
                  <span className="episode-number">{episode.episodeNumber}</span>
                  <span className="episode-name">{episode.name}</span>
                  <span className="episode-date">
                    {episode.airDate ? dateFormatter.format(new Date(`${episode.airDate}T00:00:00Z`)) : "Sem data"}
                    {!disponivel && " · em breve"}
                  </span>
                </label>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
