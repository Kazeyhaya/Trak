-- Limpeza de constraints e índices duplicados identificados no schema de produção.
--
-- 1. Regra repetida na nota e vezes consumida em UserMedia:
--    "UserMedia_personalRating_check" (0..10 legado) é redundante com "UserMedia_personalRating_range" (0.5..5.0 atual).
--    "UserMedia_timesConsumed_check" (>=0) é redundante com "UserMedia_timesConsumed_range" (0..99).
alter table public."UserMedia" drop constraint if exists "UserMedia_personalRating_check";
alter table public."UserMedia" drop constraint if exists "UserMedia_timesConsumed_check";

-- 2. Índices duplicados:
--    - "Activity_userId_createdAt_idx": duplicata exata de idx_activity_user_created (userId, createdAt DESC)
--    - idx_commentlike_comment: duplicata de "CommentLike_commentId_idx" (e coberto pela unique constraint)
--    - "Comment_mediaItemId_createdAt_idx": duplicata de idx_comment_media_created (mediaItemId, createdAt DESC)
--    - idx_episodeprogress_user_media: duplicata exata da primary key EpisodeProgress_pkey (userId, mediaItemId, season, episode)
--    - idx_follow_follower: duplicata exata da primary key Follow_pkey (followerId, followingId)
--    - idx_usermedia_user_media: duplicata exata da unique constraint "UserMedia_userId_mediaItemId_key" (userId, mediaItemId)
--    - "Follow_followingId_idx": redundante, já coberto por idx_follow_following (followingId, createdAt DESC)
drop index if exists public."Activity_userId_createdAt_idx";
drop index if exists public.idx_commentlike_comment;
drop index if exists public."Comment_mediaItemId_createdAt_idx";
drop index if exists public.idx_episodeprogress_user_media;
drop index if exists public.idx_follow_follower;
drop index if exists public.idx_usermedia_user_media;
drop index if exists public."Follow_followingId_idx";
