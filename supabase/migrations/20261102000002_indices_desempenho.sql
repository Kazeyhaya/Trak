-- Índices para as consultas mais frequentes (feed, perfil, tracking, episódios e follows).
-- Idempotente: seguro para rodar múltiplas vezes.

-- Feed e perfil: atividades de um usuário ordenadas por data
create index if not exists idx_activity_user_created
  on public."Activity"("userId", "createdAt" desc);

-- Limpeza/consolidação de atividades por obra (episódios, nota, status, favorito)
create index if not exists idx_activity_user_media_type
  on public."Activity"("userId", "mediaItemId", type);

-- Tracking: biblioteca do usuário e lookup por obra
create index if not exists idx_usermedia_user_updated
  on public."UserMedia"("userId", "updatedAt" desc);

create index if not exists idx_usermedia_user_media
  on public."UserMedia"("userId", "mediaItemId");

-- Episódios assistidos: por usuário/obra e destaques de amigos por obra
create index if not exists idx_episodeprogress_user_media
  on public."EpisodeProgress"("userId", "mediaItemId", season, episode);

create index if not exists idx_episodeprogress_media_user
  on public."EpisodeProgress"("mediaItemId", "userId");

-- Favoritos
create index if not exists idx_favorite_user_created
  on public."Favorite"("userId", "createdAt" desc);

-- Follows: seguidores e seguindo
create index if not exists idx_follow_follower
  on public."Follow"("followerId", "followingId");

create index if not exists idx_follow_following
  on public."Follow"("followingId", "createdAt" desc);
