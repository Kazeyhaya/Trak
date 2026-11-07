import type { CatalogItem } from "../catalogo-api";
import { json, request } from "./base";
import { comCursor, comoPagina, type Pagina } from "./paginacao";
import type { TrackingStatus } from "./tracking";

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
  // So aparece no proprio perfil (AAAA-MM-DD).
  birthDate?: string | null;
  // Mostrar conteudo +18 no catalogo (exige 18 anos ou mais).
  adultContent?: boolean;
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

// Envio parcial: so os campos informados mudam. O nome de usuario so e obrigatorio na
// primeira gravacao, quando a pessoa ainda nao tem perfil.
export const saveMyProfile = (profile: Partial<Profile>) =>
  request<Profile>("/perfis/eu", { method: "PUT", body: json(profile) });

// Irreversivel: apaga estante, notas, favoritos, comentarios (os denunciados ficam
// ocultos para a moderacao) e o login.
export const deleteMyAccount = () => request<{ ok: true }>("/perfis/eu", { method: "DELETE" });

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

export const getFollowers = async (username: string, cursor?: string | null) =>
  comoPagina(
    await request<FollowUser[] | Pagina<FollowUser>>(comCursor(`/perfis/${encodeURIComponent(username)}/seguidores`, cursor))
  );

export const getFollowing = async (username: string, cursor?: string | null) =>
  comoPagina(
    await request<FollowUser[] | Pagina<FollowUser>>(comCursor(`/perfis/${encodeURIComponent(username)}/seguindo`, cursor))
  );

export type Feed = { followingCount: number; items: Activity[]; proximo: string | null };

export const getFeed = async (cursor?: string | null): Promise<Feed> => {
  const feed = await request<Omit<Feed, "proximo"> & { proximo?: string | null }>(comCursor("/feed", cursor));
  return { ...feed, proximo: feed.proximo ?? null };
};
