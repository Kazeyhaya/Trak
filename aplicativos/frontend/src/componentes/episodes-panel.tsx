"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Star } from "lucide-react";

import { EpisodeReviewModal } from "./episode-review-modal";
import { RewatchCounter } from "./rewatch-counter";
import { SectionHeading } from "./section-heading";
import {
  Episode,
  EpisodeCharacter,
  errorMessage,
  FriendEpisodeHighlight,
  getEpisodeCredits,
  getEpisodes,
  getFriendsEpisodeHighlights,
  getSeasons,
  getWatchedEpisodes,
  markEpisodes,
  rateEpisode,
  setEpisodeTimes,
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
  const [error, setError] = useState<string | null>(null);
  const [chunkIndex, setChunkIndex] = useState<number>(0);
  const [reverseOrder, setReverseOrder] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  // Gravacoes vao ao servidor uma de cada vez, na ordem dos cliques. So a resposta da
  // ultima vale: uma resposta antiga sobrescreveria cliques que vieram depois.
  const filaRef = useRef<Promise<unknown>>(Promise.resolve());
  const ultimaRef = useRef(0);

  function gravar(
    tarefa: () => Promise<{ episodes: WatchedEpisode[]; tracking: TrackingEntry }>,
    mensagemErro: string
  ) {
    const numero = ++ultimaRef.current;
    const execucao = filaRef.current.then(tarefa);
    filaRef.current = execucao.catch(() => undefined);
    execucao.then(
      (resultado) => {
        if (numero === ultimaRef.current) {
          setWatched(resultado.episodes);
          onTrackingChange(resultado.tracking);
        }
      },
      async (err) => {
        setError(errorMessage(err, mensagemErro));
        // Volta ao que o servidor tem, em vez de um retrato anterior a outros cliques.
        if (numero === ultimaRef.current) {
          const atuais = await getWatchedEpisodes(mediaItemId).catch(() => null);
          if (atuais) {
            setWatched(atuais);
          }
        }
      }
    );
  }

  // Modal de avaliação do episódio e destaque de quem roubou a cena
  const [reviewModalEpisode, setReviewModalEpisode] = useState<Episode | null>(null);
  const [episodeCredits, setEpisodeCredits] = useState<Record<number, EpisodeCharacter[]>>({});
  const [loadingCredits, setLoadingCredits] = useState<Record<number, boolean>>({});
  const [friendHighlights, setFriendHighlights] = useState<FriendEpisodeHighlight[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      getSeasons(mediaItemId),
      getWatchedEpisodes(mediaItemId),
      getFriendsEpisodeHighlights(mediaItemId).catch(() => [])
    ])
      .then(([seasonList, watchedList, highlights]) => {
        if (!active) {
          return;
        }
        setSeasons(seasonList);
        setWatched(watchedList);
        setFriendHighlights(highlights);
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

  // O bloco de episodios aberto so e escolhido ao trocar de temporada. Marcar um episodio
  // nao deve pular de bloco, entao "watched" entra por ref e nao como dependencia.
  const watchedRef = useRef(watched);
  useEffect(() => {
    watchedRef.current = watched;
  }, [watched]);

  useEffect(() => {
    if (selected === null) {
      return;
    }
    let active = true;
    // Carregamento disparado pela troca de temporada.
    Promise.resolve()
      .then(() => {
        if (!active) return;
        setLoadingEpisodes(true);
        setSearchQuery("");
      })
      .then(() => getEpisodes(mediaItemId, selected))
      .then((list) => {
        if (!active) return;
        setEpisodes(list);
        if (list.length <= 24) {
          setChunkIndex(0);
          return;
        }
        const size = list.length > 200 ? 50 : 25;
        const watchedSet = new Set(
          watchedRef.current.filter((w) => w.season === selected).map((w) => w.episode)
        );
        const firstUnwatchedIdx = list.findIndex(
          (ep) => jaExibido(ep.airDate) && !watchedSet.has(ep.episodeNumber)
        );
        if (firstUnwatchedIdx >= 0) {
          setChunkIndex(Math.floor(firstUnwatchedIdx / size));
        } else {
          setChunkIndex(Math.max(0, Math.ceil(list.length / size) - 1));
        }
      })
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

  const chunkSize = episodes.length > 200 ? 50 : 25;
  const shouldChunk = episodes.length > 24;

  const chunks = useMemo(() => {
    if (!shouldChunk) {
      return [];
    }
    const result: Array<{
      index: number;
      startEp: number;
      endEp: number;
      items: Episode[];
    }> = [];
    for (let i = 0; i < episodes.length; i += chunkSize) {
      const slice = episodes.slice(i, i + chunkSize);
      if (slice.length > 0) {
        result.push({
          index: result.length,
          startEp: slice[0].episodeNumber,
          endEp: slice[slice.length - 1].episodeNumber,
          items: slice
        });
      }
    }
    return result;
  }, [episodes, shouldChunk, chunkSize]);

  function toggle(episodeNumbers: number[], value: boolean) {
    if (selected === null || episodeNumbers.length === 0) {
      return;
    }

    setWatched((prev) => {
      const epSet = new Set(episodeNumbers);
      if (value) {
        const jaTem = new Set(prev.filter((w) => w.season === selected).map((w) => w.episode));
        const novos = episodeNumbers
          .filter((n) => !jaTem.has(n))
          .map((ep) => ({ season: selected, episode: ep }));
        return [...prev, ...novos];
      } else {
        return prev.filter((w) => !(w.season === selected && epSet.has(w.episode)));
      }
    });

    const temporada = selected;
    gravar(
      () => markEpisodes(mediaItemId, temporada, episodeNumbers, value),
      "Não foi possível salvar o episódio. A lista voltou ao que está salvo."
    );
  }

  function handleRewatch(episodeNum: number, times: number) {
    if (selected === null) return;
    const temporada = selected;

    setWatched((prev) =>
      prev.map((w) => (w.season === temporada && w.episode === episodeNum ? { ...w, timesWatched: times } : w))
    );
    gravar(
      () => setEpisodeTimes(mediaItemId, temporada, episodeNum, times),
      "Não foi possível salvar quantas vezes você viu o episódio."
    );
  }

  function handleOpenReviewModal(episode: Episode) {
    setReviewModalEpisode(episode);
    const epNum = episode.episodeNumber;

    // Carrega o elenco daquele episódio se ainda não estiver em cache
    if (!episodeCredits[epNum] && selected !== null) {
      setLoadingCredits((prev) => ({ ...prev, [epNum]: true }));
      getEpisodeCredits(mediaItemId, selected, epNum)
        .then((credits) => {
          setEpisodeCredits((prev) => ({ ...prev, [epNum]: credits }));
        })
        .catch(() => undefined)
        .finally(() => {
          setLoadingCredits((prev) => ({ ...prev, [epNum]: false }));
        });
    }
  }

  function handleRateEpisode(episodeNum: number, nextRating: number | null) {
    if (selected === null) return;
    const temporada = selected;

    setWatched((prev) =>
      prev.map((w) => (w.season === temporada && w.episode === episodeNum ? { ...w, rating: nextRating } : w))
    );
    gravar(
      () => rateEpisode(mediaItemId, { season: temporada, episode: episodeNum, rating: nextRating }),
      "Não foi possível salvar a nota do episódio."
    );
  }

  function handleSelectHighlight(episodeNum: number, character: EpisodeCharacter) {
    if (selected === null) return;
    const current = watched.find((w) => w.season === selected && w.episode === episodeNum);
    const isSame = current?.highlightCharacterName === character.character;
    const temporada = selected;

    const nextId = isSame ? null : character.id;
    const nextName = isSame ? null : character.character;
    const nextAvatar = isSame ? null : character.avatarUrl;

    setWatched((prev) =>
      prev.map((w) =>
        w.season === temporada && w.episode === episodeNum
          ? {
              ...w,
              highlightCharacterId: nextId,
              highlightCharacterName: nextName,
              highlightCharacterAvatar: nextAvatar
            }
          : w
      )
    );

    gravar(
      () =>
        rateEpisode(mediaItemId, {
          season: temporada,
          episode: episodeNum,
          highlightCharacterId: nextId,
          highlightCharacterName: nextName,
          highlightCharacterAvatar: nextAvatar
        }),
      "Não foi possível salvar quem roubou a cena."
    );
  }

  if (seasons.length === 0 && !error) {
    return null;
  }

  const aired = episodes.filter((e) => jaExibido(e.airDate)).map((e) => e.episodeNumber);
  const allWatched = aired.length > 0 && aired.every((n) => watchedInSeason.has(n));

  const safeChunkIndex = chunks.length > 0 ? Math.min(chunkIndex, chunks.length - 1) : 0;
  const activeChunk = chunks[safeChunkIndex] ?? null;
  const chunkAired = activeChunk
    ? activeChunk.items.filter((e) => jaExibido(e.airDate)).map((e) => e.episodeNumber)
    : [];
  const chunkAllWatched = chunkAired.length > 0 && chunkAired.every((n) => watchedInSeason.has(n));

  const cleanSearch = searchQuery.trim().toLowerCase();
  const baseDisplayedEpisodes = cleanSearch
    ? episodes.filter(
        (ep) =>
          String(ep.episodeNumber) === cleanSearch ||
          `ep ${ep.episodeNumber}` === cleanSearch ||
          String(ep.episodeNumber).includes(cleanSearch) ||
          ep.name.toLowerCase().includes(cleanSearch)
      )
    : activeChunk
      ? activeChunk.items
      : episodes;

  const displayedEpisodes = reverseOrder
    ? [...baseDisplayedEpisodes].reverse()
    : baseDisplayedEpisodes;

  return (
    <section className="content-panel">
      <SectionHeading
        title="Progresso por episódio"
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

      {!loadingEpisodes && shouldChunk && !cleanSearch && (
        <div className="episode-ranges" role="tablist" aria-label="Faixas de episódios">
          {chunks.map((chunk) => {
            const watchedInChunk = chunk.items.filter((e) => watchedInSeason.has(e.episodeNumber)).length;
            const isComplete = watchedInChunk === chunk.items.length && chunk.items.length > 0;
            return (
              <button
                key={`${chunk.startEp}-${chunk.endEp}`}
                type="button"
                role="tab"
                aria-selected={safeChunkIndex === chunk.index}
                className={`filter-chip episode-range-chip${safeChunkIndex === chunk.index ? " is-active" : ""}${isComplete ? " is-complete" : ""}`}
                onClick={() => setChunkIndex(chunk.index)}
              >
                <span>
                  Ep. {chunk.startEp}–{chunk.endEp}
                </span>
                {watchedInChunk > 0 && (
                  <small className="episode-range-count">
                    {watchedInChunk}/{chunk.items.length}
                  </small>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="episode-toolbar">
        <div className="episode-toolbar-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={loadingEpisodes || aired.length === 0}
            onClick={() => toggle(aired, !allWatched)}
          >
            {allWatched ? "Desmarcar temporada" : "Marcar temporada como vista"}
          </button>

          {activeChunk && !cleanSearch && chunkAired.length > 0 && (
            <button
              type="button"
              className="filter-chip"
              disabled={loadingEpisodes}
              onClick={() => toggle(chunkAired, !chunkAllWatched)}
            >
              {chunkAllWatched
                ? `Desmarcar ep. ${activeChunk.startEp}–${activeChunk.endEp}`
                : `Marcar ep. ${activeChunk.startEp}–${activeChunk.endEp}`}
            </button>
          )}

          {episodes.length > 6 && (
            <button
              type="button"
              className={`filter-chip${reverseOrder ? " is-active" : ""}`}
              disabled={loadingEpisodes}
              onClick={() => setReverseOrder((prev) => !prev)}
            >
              {reverseOrder ? "Últimos primeiro ↓" : "Do 1º ao último ↑"}
            </button>
          )}
        </div>

        {episodes.length > 12 && (
          <div className="episode-search-wrap">
            <input
              type="search"
              className="episode-search-input"
              placeholder="Ir para nº ou título do episódio…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Buscar episódio por número ou título"
            />
          </div>
        )}
      </div>

      {loadingEpisodes ? (
        <p className="panel-note">Carregando episódios…</p>
      ) : displayedEpisodes.length === 0 ? (
        <p className="panel-note">Nenhum episódio encontrado para &ldquo;{searchQuery}&rdquo;.</p>
      ) : (
        <ol className="episode-list">
          {displayedEpisodes.map((episode) => {
            const isWatched = watchedInSeason.has(episode.episodeNumber);
            const disponivel = jaExibido(episode.airDate);
            const episodesUpToHere =
              disponivel && episode.episodeNumber > 1 && !isWatched
                ? aired.filter((n) => n <= episode.episodeNumber && !watchedInSeason.has(n))
                : [];

            const watchedEntry = watched.find(
              (w) => w.season === selected && w.episode === episode.episodeNumber
            );

            return (
              <li key={episode.episodeNumber} className={isWatched ? "is-watched" : undefined}>
                <div className="episode-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={isWatched}
                      disabled={!disponivel}
                      onChange={(event) => toggle([episode.episodeNumber], event.target.checked)}
                    />
                    <span className="episode-number">{episode.episodeNumber}</span>
                    <span className="episode-name">{episode.name}</span>
                    <span className="episode-date">
                      {episode.airDate ? dateFormatter.format(new Date(`${episode.airDate}T00:00:00Z`)) : "Sem data"}
                      {!disponivel && " · em breve"}
                    </span>
                  </label>

                  {isWatched && (
                    <button
                      type="button"
                      className={`episode-details-toggle-btn${
                        watchedEntry?.rating || watchedEntry?.highlightCharacterName ? " has-data" : ""
                      }`}
                      onClick={() => handleOpenReviewModal(episode)}
                      title="Avaliar episódio e destacar quem roubou a cena"
                    >
                      <Star
                        size={13}
                        fill={watchedEntry?.rating ? "currentColor" : "none"}
                        aria-hidden="true"
                      />
                      <span>{watchedEntry?.rating ? watchedEntry.rating : "Avaliar"}</span>
                      {watchedEntry?.highlightCharacterName && (
                        <>
                          <span aria-hidden="true">·</span>
                          <Crown size={13} aria-hidden="true" />
                        </>
                      )}
                    </button>
                  )}

                  {isWatched && (
                    <RewatchCounter
                      compact
                      count={watchedEntry?.timesWatched ?? 1}
                      againLabel="Vi de novo"
                      onChange={(vezes) => handleRewatch(episode.episodeNumber, vezes)}
                    />
                  )}

                  {episodesUpToHere.length > 1 && (
                    <button
                      type="button"
                      className="episode-mark-until-btn"
                      title={`Marcar episódios 1 até ${episode.episodeNumber} como vistos`}
                      onClick={() => toggle(episodesUpToHere, true)}
                    >
                      Até ep. {episode.episodeNumber}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {reviewModalEpisode && selected !== null && (
        <EpisodeReviewModal
          isOpen={Boolean(reviewModalEpisode)}
          onClose={() => setReviewModalEpisode(null)}
          mediaItemId={mediaItemId}
          seasonNumber={selected}
          episode={reviewModalEpisode}
          watchedEntry={watched.find(
            (w) => w.season === selected && w.episode === reviewModalEpisode.episodeNumber
          )}
          credits={episodeCredits[reviewModalEpisode.episodeNumber] ?? []}
          isLoadingCredits={loadingCredits[reviewModalEpisode.episodeNumber] ?? false}
          friendHighlights={friendHighlights}
          onRate={async (rating) => {
            await handleRateEpisode(reviewModalEpisode.episodeNumber, rating);
          }}
          onSelectHighlight={async (character) => {
            await handleSelectHighlight(reviewModalEpisode.episodeNumber, character);
          }}
        />
      )}
    </section>
  );
}
