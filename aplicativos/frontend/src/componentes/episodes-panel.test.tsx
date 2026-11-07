// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Episode, Season, TrackingEntry, WatchedEpisode } from "../lib/api";
import * as api from "../lib/api";
import { EpisodesPanel } from "./episodes-panel";

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    getSeasons: vi.fn(),
    getEpisodes: vi.fn(),
    getWatchedEpisodes: vi.fn(),
    getFriendsEpisodeHighlights: vi.fn(),
    markEpisodes: vi.fn(),
    setEpisodeTimes: vi.fn(),
    rateEpisode: vi.fn(),
    getEpisodeCredits: vi.fn()
  };
});

describe("EpisodesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  const mockSeasons: Season[] = [
    { seasonNumber: 1, name: "Temporada 1", episodeCount: 2, airDate: "2024-01-01" }
  ];

  const mockEpisodes: Episode[] = [
    { episodeNumber: 1, name: "Episódio Piloto", airDate: "2024-01-01", overview: "Início", runtime: 45 },
    { episodeNumber: 2, name: "Segundo Episódio", airDate: "2024-01-08", overview: "Continuação", runtime: 48 }
  ];

  const mockTracking: TrackingEntry = {
    id: "track-s1",
    mediaItemId: "serie-10",
    status: "WATCHING",
    progress: 50,
    rating: null,
    notes: null,
    updatedAt: "2026-11-07T00:00:00Z"
  };

  it("permite marcar um episódio individual com a API mockada", async () => {
    vi.mocked(api.getSeasons).mockResolvedValue(mockSeasons);
    vi.mocked(api.getWatchedEpisodes).mockResolvedValue([]);
    vi.mocked(api.getFriendsEpisodeHighlights).mockResolvedValue([]);
    vi.mocked(api.getEpisodes).mockResolvedValue(mockEpisodes);

    const watchedAposEp1: WatchedEpisode[] = [{ season: 1, episode: 1 }];
    vi.mocked(api.markEpisodes).mockResolvedValue({
      episodes: watchedAposEp1,
      tracking: mockTracking
    });

    const onTrackingChange = vi.fn();

    render(<EpisodesPanel mediaItemId="serie-10" onTrackingChange={onTrackingChange} />);

    // Aguarda carregar episódios da temporada 1
    expect(await screen.findByText("Episódio Piloto")).toBeTruthy();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toHaveProperty("checked", false);

    // Marca o primeiro episódio
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(api.markEpisodes).toHaveBeenCalledWith("serie-10", 1, [1], true);
      expect(onTrackingChange).toHaveBeenCalledWith(mockTracking);
    });
  });

  it("permite marcar a temporada inteira como vista", async () => {
    vi.mocked(api.getSeasons).mockResolvedValue(mockSeasons);
    vi.mocked(api.getWatchedEpisodes).mockResolvedValue([]);
    vi.mocked(api.getFriendsEpisodeHighlights).mockResolvedValue([]);
    vi.mocked(api.getEpisodes).mockResolvedValue(mockEpisodes);

    const watchedTodos: WatchedEpisode[] = [
      { season: 1, episode: 1 },
      { season: 1, episode: 2 }
    ];
    const trackingCompleto: TrackingEntry = {
      ...mockTracking,
      status: "COMPLETED",
      progress: 100
    };

    vi.mocked(api.markEpisodes).mockResolvedValue({
      episodes: watchedTodos,
      tracking: trackingCompleto
    });

    const onTrackingChange = vi.fn();

    render(<EpisodesPanel mediaItemId="serie-10" onTrackingChange={onTrackingChange} />);

    // Aguarda carregar episódios
    expect(await screen.findByText("Episódio Piloto")).toBeTruthy();

    const botaoTemporada = screen.getByRole("button", { name: "Marcar temporada como vista" });
    fireEvent.click(botaoTemporada);

    await waitFor(() => {
      expect(api.markEpisodes).toHaveBeenCalledWith("serie-10", 1, [1, 2], true);
      expect(onTrackingChange).toHaveBeenCalledWith(trackingCompleto);
    });
  });
});
