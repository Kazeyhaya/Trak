"use client";

import { useEffect, useMemo, useState } from "react";

import { RatingStars } from "./rating-stars";
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

  // Acordeão inline: qual episódio está aberto para avaliação e destaque de personagem
  const [expandedEpisode, setExpandedEpisode] = useState<number | null>(null);
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
        const watchedSet = new Set(watched.filter((w) => w.season === selected).map((w) => w.episode));
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
    // Carregamento disparado pela troca de temporada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function toggle(episodeNumbers: number[], value: boolean) {
    if (selected === null || episodeNumbers.length === 0) {
      return;
    }

    const previousWatched = watched;

    // Atualização Otimista: acende o visto instantaneamente na tela
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

    try {
      const result = await markEpisodes(mediaItemId, selected, episodeNumbers, value);
      // Sincroniza com a resposta oficial do backend
      setWatched(result.episodes);
      onTrackingChange(result.tracking);

      // Se marcou um único episódio como visto pela primeira vez, abre o acordeão para avaliação
      if (value && episodeNumbers.length === 1) {
        handleToggleExpand(episodeNumbers[0]);
      }
    } catch (err) {
      // Em caso de falha, desfaz a ação e avisa o usuário com mensagem de erro
      setWatched(previousWatched);
      setError(errorMessage(err, "Falha ao salvar episódio. As alterações foram revertidas."));
    }
  }

  function handleToggleExpand(episodeNum: number) {
    if (expandedEpisode === episodeNum) {
      setExpandedEpisode(null);
      return;
    }
    setExpandedEpisode(episodeNum);

    // Carrega o elenco daquele episódio se ainda não estiver em cache
    if (!episodeCredits[episodeNum] && selected !== null) {
      setLoadingCredits((prev) => ({ ...prev, [episodeNum]: true }));
      getEpisodeCredits(mediaItemId, selected, episodeNum)
        .then((credits) => {
          setEpisodeCredits((prev) => ({ ...prev, [episodeNum]: credits }));
        })
        .catch(() => undefined)
        .finally(() => {
          setLoadingCredits((prev) => ({ ...prev, [episodeNum]: false }));
        });
    }
  }

  async function handleRateEpisode(episodeNum: number, nextRating: number | null) {
    if (selected === null) return;
    const previousWatched = watched;

    // Atualização otimista imediata
    setWatched((prev) =>
      prev.map((w) => (w.season === selected && w.episode === episodeNum ? { ...w, rating: nextRating } : w))
    );

    try {
      const res = await rateEpisode(mediaItemId, {
        season: selected,
        episode: episodeNum,
        rating: nextRating
      });
      setWatched(res.episodes);
    } catch (err) {
      setWatched(previousWatched);
      setError(errorMessage(err, "Falha ao salvar nota do episódio."));
    }
  }

  async function handleSelectHighlight(episodeNum: number, character: EpisodeCharacter) {
    if (selected === null) return;
    const current = watched.find((w) => w.season === selected && w.episode === episodeNum);
    const isSame = current?.highlightCharacterName === character.character;
    const previousWatched = watched;

    const nextId = isSame ? null : character.id;
    const nextName = isSame ? null : character.character;
    const nextAvatar = isSame ? null : character.avatarUrl;

    // Atualização otimista imediata
    setWatched((prev) =>
      prev.map((w) =>
        w.season === selected && w.episode === episodeNum
          ? {
              ...w,
              highlightCharacterId: nextId,
              highlightCharacterName: nextName,
              highlightCharacterAvatar: nextAvatar
            }
          : w
      )
    );

    try {
      const res = await rateEpisode(mediaItemId, {
        season: selected,
        episode: episodeNum,
        highlightCharacterId: nextId,
        highlightCharacterName: nextName,
        highlightCharacterAvatar: nextAvatar
      });
      setWatched(res.episodes);
    } catch (err) {
      setWatched(previousWatched);
      setError(errorMessage(err, "Falha ao salvar personagem em destaque."));
    }
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
            const isExpanded = expandedEpisode === episode.episodeNumber;
            const credits = episodeCredits[episode.episodeNumber] ?? [];
            const isLoadingCredits = loadingCredits[episode.episodeNumber] ?? false;

            // Busca amigos que destacaram personagens neste episódio
            const friendHighlightsThisEp = friendHighlights.filter(
              (h) => h.season === selected && h.episode === episode.episodeNumber
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
                      className={`episode-details-toggle-btn${isExpanded ? " is-active" : ""}${
                        watchedEntry?.rating || watchedEntry?.highlightCharacterName ? " has-data" : ""
                      }`}
                      onClick={() => handleToggleExpand(episode.episodeNumber)}
                      title="Avaliar episódio e destacar quem roubou a cena"
                    >
                      {watchedEntry?.rating ? `★ ${watchedEntry.rating}` : "☆ Avaliar"}
                      {watchedEntry?.highlightCharacterName && " · 👑"}
                    </button>
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

                {isExpanded && isWatched && (
                  <div className="episode-inline-panel">
                    <div className="episode-inline-header">
                      <div className="episode-inline-rating">
                        <span>Sua nota no episódio:</span>
                        <RatingStars
                          value={watchedEntry?.rating ?? null}
                          size="sm"
                          onChange={(nextRating) => void handleRateEpisode(episode.episodeNumber, nextRating)}
                        />
                      </div>
                    </div>

                    <div className="episode-characters-block">
                      <div className="episode-characters-title">
                        <span>👑 Quem roubou a cena neste episódio?</span>
                      </div>

                      {isLoadingCredits ? (
                        <p className="panel-note">Carregando elenco…</p>
                      ) : credits.length === 0 ? (
                        <p className="panel-note">Elenco do episódio não disponível.</p>
                      ) : (
                        <div className="episode-characters-carousel">
                          {credits.map((char) => {
                            const isSelected =
                              watchedEntry?.highlightCharacterName === char.character;
                            return (
                              <button
                                key={char.id}
                                type="button"
                                className={`episode-char-card${isSelected ? " is-selected" : ""}`}
                                onClick={() => void handleSelectHighlight(episode.episodeNumber, char)}
                                title={`${char.character} (interpretado por ${char.name})`}
                              >
                                <div className="episode-char-avatar-wrap">
                                  {char.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={char.avatarUrl} alt={char.character} />
                                  ) : (
                                    <span>👤</span>
                                  )}
                                </div>
                                <span className="episode-char-name">{char.character}</span>
                                <span className="episode-char-actor">{char.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Social Íntimo: Amigos que também destacaram */}
                    {friendHighlightsThisEp.length > 0 && (
                      <div className="episode-social-insight">
                        <span>💬</span>
                        <span>
                          {friendHighlightsThisEp.map((f) => `@${f.user.username}`).join(", ")} também destacou{" "}
                          <strong>{friendHighlightsThisEp[0].characterName}</strong> neste episódio.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
