import { json, request } from "./base";
import type { TrackingEntry } from "./tracking";

export type Season = { seasonNumber: number; name: string; episodeCount: number; airDate: string | null };
export type Episode = {
  episodeNumber: number;
  name: string;
  airDate: string | null;
  overview: string | null;
  runtime: number | null;
};
export type WatchedEpisode = {
  season: number;
  episode: number;
  // Vezes que o episodio foi assistido (1 = so a primeira).
  timesWatched?: number;
  rating?: number | null;
  highlightCharacterId?: string | null;
  highlightCharacterName?: string | null;
  highlightCharacterAvatar?: string | null;
};

export type EpisodeCharacter = {
  id: string;
  name: string;
  character: string;
  avatarUrl: string | null;
};

export type FriendEpisodeHighlight = {
  season: number;
  episode: number;
  characterId: string | null;
  characterName: string;
  characterAvatar: string | null;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export const getSeasons = (mediaItemId: string) =>
  request<Season[]>(`/catalogo/${encodeURIComponent(mediaItemId)}/temporadas`);

export const getEpisodes = (mediaItemId: string, season: number) =>
  request<Episode[]>(`/catalogo/${encodeURIComponent(mediaItemId)}/temporadas/${season}`);

export const getEpisodeCredits = (mediaItemId: string, season: number, episode: number) =>
  request<EpisodeCharacter[]>(
    `/catalogo/${encodeURIComponent(mediaItemId)}/temporadas/${season}/episodios/${episode}/creditos`
  );

export const getMediaCredits = (mediaItemId: string) =>
  request<EpisodeCharacter[]>(`/catalogo/${encodeURIComponent(mediaItemId)}/creditos`);

export const getWatchedEpisodes = (mediaItemId: string) =>
  request<WatchedEpisode[]>(`/tracking/items/${encodeURIComponent(mediaItemId)}/episodios`);

export const markEpisodes = (mediaItemId: string, season: number, episodes: number[], watched: boolean) =>
  request<{ episodes: WatchedEpisode[]; tracking: TrackingEntry }>(
    `/tracking/items/${encodeURIComponent(mediaItemId)}/episodios`,
    { method: "PUT", body: json({ season, episodes, watched }) }
  );

export const setEpisodeTimes = (mediaItemId: string, season: number, episode: number, times: number) =>
  request<{ episodes: WatchedEpisode[]; tracking: TrackingEntry }>(
    `/tracking/items/${encodeURIComponent(mediaItemId)}/episodios/vezes`,
    { method: "PUT", body: json({ season, episode, times }) }
  );

export const rateEpisode = (
  mediaItemId: string,
  payload: {
    season: number;
    episode: number;
    rating?: number | null;
    highlightCharacterId?: string | null;
    highlightCharacterName?: string | null;
    highlightCharacterAvatar?: string | null;
  }
) =>
  request<{ episodes: WatchedEpisode[]; tracking: TrackingEntry }>(
    `/tracking/items/${encodeURIComponent(mediaItemId)}/episodios`,
    {
      method: "PATCH",
      body: json(payload)
    }
  );

export const getFriendsEpisodeHighlights = (mediaItemId: string, season?: number) =>
  request<FriendEpisodeHighlight[]>(
    `/tracking/items/${encodeURIComponent(mediaItemId)}/destaques-amigos${season !== undefined ? `?season=${season}` : ""}`
  );
