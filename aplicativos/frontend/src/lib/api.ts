import { type CatalogItem, type MediaType, getMediaTypeLabel } from "./catalogo-api";
import { API_BASE_URL } from "./api-base";
import { supabase } from "./supabase-client";

export { API_BASE_URL, type CatalogItem, type MediaType, getMediaTypeLabel };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export function errorMessage(error: unknown, fallback = "Algo deu errado. Tente novamente.") {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return "Muitas tentativas seguidas. Aguarde um pouco e tente de novo.";
    }
    // 500 traz detalhes internos (banco, configuracao): nao exibir. Os 503 da
    // API sao mensagens intencionais (ex.: importacao da Steam indisponivel).
    if (error.status >= 500 && error.status !== 503) {
      return "O servidor teve um problema. Tente novamente em instantes.";
    }
    return error.message;
  }
  return fallback;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };

  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }

  if (init.body) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor.", 0);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(" ") : body?.message;
    throw new ApiError(message ?? "Algo deu errado. Tente novamente.", response.status);
  }

  // O Nest responde corpo vazio quando o controller retorna null.
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

const json = (body: unknown) => JSON.stringify(body);

// Tracking

export const TRACKING_STATUSES = ["WANT", "WATCHING", "COMPLETED", "PAUSED", "DROPPED"] as const;

export type TrackingStatus = (typeof TRACKING_STATUSES)[number];

export type TrackingEntry = {
  id: string;
  mediaItemId: string;
  status: TrackingStatus;
  progress: number;
  rating: number | null;
  notes: string | null;
  // Livros: paginas da edicao lida por este usuario (salvas no tracking dele, nao na obra).
  pagesRead?: number | null;
  totalPages?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  updatedAt: string;
  item?: CatalogItem | null;
};

export type TrackingPayload = Partial<Pick<TrackingEntry, "status" | "progress" | "rating" | "notes">> & {
  pagesRead?: number;
  totalPages?: number;
};

// Limites compartilhados com a validacao da API (SalvarTrackingDto).
export const TRACKING_NOTES_MAX_LENGTH = 1000;
export const TRACKING_PAGES_MAX = 50000;

export function getStatusLabel(status: TrackingStatus, type?: MediaType) {
  switch (status) {
    case "WANT":
      return type === "GAME" ? "Quero jogar" : type === "BOOK" ? "Quero ler" : "Quero ver";
    case "WATCHING":
      return type === "GAME" ? "Jogando" : type === "BOOK" ? "Lendo" : "Assistindo";
    case "COMPLETED":
      return type === "GAME" ? "Zerado" : type === "BOOK" ? "Lido" : "Concluído";
    case "PAUSED":
      return "Pausado";
    case "DROPPED":
      return "Abandonado";
  }
}

export const getTrackingItems = () => request<TrackingEntry[]>("/tracking");

export const getTrackingItem = (mediaItemId: string) =>
  request<TrackingEntry | null>(`/tracking/items/${encodeURIComponent(mediaItemId)}`);

export const saveTrackingItem = (mediaItemId: string, payload: TrackingPayload) =>
  request<TrackingEntry>(`/tracking/items/${encodeURIComponent(mediaItemId)}`, { method: "PUT", body: json(payload) });

export const removeTrackingItem = (mediaItemId: string) =>
  request<{ ok: true }>(`/tracking/items/${encodeURIComponent(mediaItemId)}`, { method: "DELETE" });

// Extras de catalogo (onde assistir, notas do Trak e externas)

export type WatchProvider = {
  name: string;
  category: "STREAMING" | "RENT" | "BUY" | "STORE" | "READ";
  url?: string | null;
};

export type ExternalRating = {
  source: string;
  value: string;
};

export type CatalogExtras = {
  genres: string[];
  watchProviders: WatchProvider[];
  watchLink: string | null;
  trakRating: {
    average: number | null;
    count: number;
  };
  externalRatings: ExternalRating[];
  pageCount?: number | null;
};

export const getCatalogExtras = (mediaItemId: string) =>
  request<CatalogExtras>(`/catalogo/${encodeURIComponent(mediaItemId)}/extras`);

// Episodios

export type Season = { seasonNumber: number; name: string; episodeCount: number; airDate: string | null };
export type Episode = {
  episodeNumber: number;
  name: string;
  airDate: string | null;
  overview: string | null;
  runtime: number | null;
};
export type WatchedEpisode = { season: number; episode: number };

export const getSeasons = (mediaItemId: string) =>
  request<Season[]>(`/catalogo/${encodeURIComponent(mediaItemId)}/temporadas`);

export const getEpisodes = (mediaItemId: string, season: number) =>
  request<Episode[]>(`/catalogo/${encodeURIComponent(mediaItemId)}/temporadas/${season}`);

export const getWatchedEpisodes = (mediaItemId: string) =>
  request<WatchedEpisode[]>(`/tracking/items/${encodeURIComponent(mediaItemId)}/episodios`);

export const markEpisodes = (mediaItemId: string, season: number, episodes: number[], watched: boolean) =>
  request<{ episodes: WatchedEpisode[]; tracking: TrackingEntry }>(
    `/tracking/items/${encodeURIComponent(mediaItemId)}/episodios`,
    { method: "PUT", body: json({ season, episodes, watched }) }
  );

// Favoritos

export type FavoriteEntry = { mediaItemId: string; createdAt: string; item: CatalogItem | null };

export const getFavorites = () => request<FavoriteEntry[]>("/favoritos");

export const checkFavorite = (mediaItemId: string) =>
  request<{ isFavorite: boolean }>(`/favoritos/${encodeURIComponent(mediaItemId)}`);

export const addFavorite = (mediaItemId: string) =>
  request<{ ok: true }>("/favoritos", { method: "POST", body: json({ mediaItemId }) });

export const removeFavorite = (mediaItemId: string) =>
  request<{ ok: true }>(`/favoritos/${encodeURIComponent(mediaItemId)}`, { method: "DELETE" });

export const reorderFavorites = (mediaItemIds: string[]) =>
  request<{ ok: true }>("/favoritos/ordem", { method: "PUT", body: json({ mediaItemIds }) });

// Comentarios

export type CommentEntry = {
  id: string;
  userId: string;
  mediaItemId: string;
  content: string;
  createdAt: string;
  user?: { username: string; displayName: string | null } | null;
  likesCount: number;
  likedByUser: boolean;
  isOwn: boolean;
};

export const getComments = (mediaItemId: string) =>
  request<CommentEntry[]>(`/comentarios?mediaItemId=${encodeURIComponent(mediaItemId)}`);

export const createComment = (mediaItemId: string, content: string) =>
  request<CommentEntry>("/comentarios", { method: "POST", body: json({ mediaItemId, content }) });

export const deleteComment = (commentId: string) =>
  request<{ ok: true }>(`/comentarios/${encodeURIComponent(commentId)}`, { method: "DELETE" });

export const setCommentLike = (commentId: string, liked: boolean) =>
  request<{ commentId: string; likesCount: number }>(`/comentarios/${encodeURIComponent(commentId)}/curtidas`, {
    method: liked ? "POST" : "DELETE"
  });

export const reportComment = (commentId: string, reason: string, details?: string) =>
  request<{ id: string }>(`/comentarios/${encodeURIComponent(commentId)}/denuncias`, {
    method: "POST",
    body: json({ reason, ...(details ? { details } : {}) })
  });

// Perfis, seguidores e feed

export type ProfileTheme = "emerald" | "ocean" | "cyberpunk" | "amber" | "crimson";
export type ProfileLanguage = "pt-BR" | "en-US";

export type Profile = {
  username: string;
  displayName: string | null;
  bio: string | null;
  isPublic: boolean;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  theme?: ProfileTheme | string | null;
  language?: ProfileLanguage;
  importedSources?: string[];
  hasImported?: boolean;
};

export type ActivityType = "STATUS" | "RATING" | "COMMENT" | "FAVORITE" | "EPISODES";

export type Activity = {
  id: string;
  userId?: string;
  type: ActivityType;
  mediaItemId: string | null;
  data: { status?: TrackingStatus; rating?: number; season?: number; count?: number };
  createdAt: string;
  user: { username: string; displayName: string | null; avatarUrl?: string | null } | null;
  item: CatalogItem | null;
  inMyLibrary?: boolean;
};

export type ProfileSummary = {
  gamesCompleted: number;
  booksRead: number;
  moviesWatched: number;
  seriesCompleted: number;
  estimatedHours: number;
};

export type ProfileInProgressItem = {
  item: CatalogItem;
  status: TrackingStatus;
  progress: number;
  rating: number | null;
};

export type ProfileLibraryItem = {
  mediaItemId: string;
  status: TrackingStatus;
  rating: number | null;
  progress: number;
  updatedAt?: string | null;
  item: CatalogItem;
};

export type ProfileAchievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  current: number;
  target: number;
};

export type PublicProfile = {
  profile: Profile;
  followers: number;
  following: number;
  isFollowing: boolean;
  followsYou?: boolean;
  isMe: boolean;
  isPrivate: boolean;
  stats: { total: number; byStatus: Partial<Record<TrackingStatus, number>>; averageRating: number | null } | null;
  summary?: ProfileSummary | null;
  achievements?: ProfileAchievement[];
  inProgress?: ProfileInProgressItem[];
  library?: ProfileLibraryItem[];
  favorites: CatalogItem[];
  activity: Activity[];
};

// O cadastro cria um username provisorio (user_ + 12 caracteres hexadecimais).
export function ehUsernameProvisorio(username: string) {
  return /^user_[0-9a-f]{12}$/.test(username);
}

export const getMyProfile = () => request<{ profile: Profile | null; isAdmin: boolean }>("/perfis/eu");

export const saveMyProfile = (profile: Partial<Profile> & { username: string }) =>
  request<Profile>("/perfis/eu", { method: "PUT", body: json(profile) });

export const getPublicProfile = (username: string) =>
  request<PublicProfile>(`/perfis/${encodeURIComponent(username)}`);

export const searchProfiles = (query: string) =>
  request<Array<{ username: string; displayName: string | null }>>(`/perfis?q=${encodeURIComponent(query)}`);

export const setFollowing = (username: string, follow: boolean) =>
  request<{ ok: true }>(`/perfis/${encodeURIComponent(username)}/seguir`, { method: follow ? "POST" : "DELETE" });

export type FollowUser = {
  userId: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isFollowing?: boolean;
  followsYou?: boolean;
  isMe?: boolean;
};

export const getFollowers = (username: string) =>
  request<FollowUser[]>(`/perfis/${encodeURIComponent(username)}/seguidores`);

export const getFollowing = (username: string) =>
  request<FollowUser[]>(`/perfis/${encodeURIComponent(username)}/seguindo`);

export const getFeed = () => request<{ followingCount: number; items: Activity[] }>("/feed");

// Recomendacoes e alertas

export type Recommendation = CatalogItem & { reason: string; score: number };

export type Alert = {
  kind: "NEW_EPISODE" | "UPCOMING_EPISODE" | "UPCOMING_RELEASE";
  date: string;
  label: string;
  mediaItemId: string;
  item: CatalogItem | null;
};

export const getRecommendations = () => request<{ seeds: string[]; items: Recommendation[] }>("/recomendacoes");

export const getAlerts = () => request<Alert[]>("/alertas");

// Importacao

export type ImportResult = { total: number; imported: number; skipped: number; notFound: string[] };

export type LetterboxdList = "watched" | "ratings" | "diary" | "watchlist";

export const importLetterboxd = (csv: string, lista: LetterboxdList) =>
  request<ImportResult>("/importacao/letterboxd", { method: "POST", body: json({ csv, lista }) });

export const importTrakt = (fileContent: string) =>
  request<ImportResult>("/importacao/trakt", { method: "POST", body: json({ json: fileContent }) });

export const importSteam = (perfil: string) =>
  request<ImportResult>("/importacao/steam", { method: "POST", body: json({ perfil }) });

// Moderacao

export type ReportStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";

export type Report = {
  id: string;
  commentId: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  reportsForComment: number;
  comment: { id: string; content: string; mediaItemId: string; createdAt: string } | null;
  item: CatalogItem | null;
};

export const getReports = (status?: ReportStatus) =>
  request<Report[]>(`/moderacao/denuncias${status ? `?status=${status}` : ""}`);

export const moderateReport = (id: string, status: ReportStatus, removerComentario = false) =>
  request<Report>(`/moderacao/denuncias/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: json({ status, removerComentario })
  });

// Notificações

export type NotificationType = "FOLLOW" | "COMMENT" | "REPLY" | "MEDIA_UPDATE";

export type NotificationItem = {
  id: string;
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  mediaItemId?: string | null;
  link: string;
  read: boolean;
  data: Record<string, unknown>;
  createdAt: string;
  actor?: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
};

export const getNotifications = (limite = 30) =>
  request<NotificationItem[]>(`/notificacoes?limite=${limite}`);

export const getUnreadNotificationsCount = () =>
  request<{ count: number }>("/notificacoes/nao-lidas/count");

export const markNotificationRead = (id: string) =>
  request<{ ok: boolean }>(`/notificacoes/${encodeURIComponent(id)}/lida`, { method: "PATCH" });

export const markAllNotificationsRead = () =>
  request<{ ok: boolean }>("/notificacoes/marcar-todas-lidas", { method: "POST" });
