-- Media das notas do Trak calculada no banco. Antes a API baixava todas as notas
-- da obra para somar em JS (e o limite de 1000 linhas do PostgREST distorcia a media).
create or replace function public.trak_nota_media(item text)
returns table (average numeric, count integer)
language sql
stable
security definer
set search_path = public
as $$
  select round(avg("personalRating"), 1), count(*)::integer
    from "UserMedia"
   where "mediaItemId" = item and "personalRating" > 0
$$;

revoke all on function public.trak_nota_media(text) from public, anon, authenticated;

-- Consultas frequentes que ainda faziam varredura completa.
create index if not exists idx_comment_media_created on public."Comment"("mediaItemId", "createdAt" desc);
create index if not exists idx_commentlike_comment on public."CommentLike"("commentId");
create index if not exists idx_usermedia_media_rating on public."UserMedia"("mediaItemId") where "personalRating" > 0;
create index if not exists idx_notification_follow
  on public."Notification"("userId", "actorId", type, "createdAt" desc);
