-- Corrige trak_excluir_usuario: comentarios denunciados nao podem sumir com a conta.
--
-- A versao anterior apagava a linha em "User" e so a anonimizava se o banco recusasse
-- (foreign_key_violation). Na producao, Comment.userId e CommentReport.commentId tem
-- ON DELETE CASCADE: o delete passava e levava junto os comentarios denunciados e as
-- denuncias. E User.authUserId tem cascade para auth.users, entao a linha anonima
-- tambem sumiria quando a API apaga o login logo depois.
--
-- Agora a decisao e explicita: com comentario denunciado, a linha fica anonima e solta
-- do Auth (authUserId = null); sem, ela e apagada.
create or replace function public.trak_excluir_usuario(usuario text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from "EpisodeProgress" where "userId" = usuario;
  delete from "UserMedia" where "userId" = usuario;
  delete from "Favorite" where "userId" = usuario;
  delete from "Follow" where "followerId" = usuario or "followingId" = usuario;
  delete from "Activity" where "userId" = usuario;
  delete from "Notification" where "userId" = usuario or "actorId" = usuario;
  delete from "CommentLike" where "userId" = usuario;
  delete from "CommentReport" where "reporterUserId" = usuario;

  update "Comment" c
     set "originalContent" = coalesce(c."originalContent", c.content),
         content = '[comentário removido]',
         "updatedAt" = now()
   where c."userId" = usuario
     and exists (select 1 from "CommentReport" r where r."commentId" = c.id);

  delete from "CommentLike" l using "Comment" c where l."commentId" = c.id and c."userId" = usuario;
  delete from "Comment" c
   where c."userId" = usuario
     and not exists (select 1 from "CommentReport" r where r."commentId" = c.id);

  if exists (select 1 from "Comment" where "userId" = usuario) then
    update "User"
       set username = 'conta_excluida_' || substr(md5(usuario), 1, 10),
           "authUserId" = null,
           "displayName" = null,
           bio = null,
           "avatarUrl" = null,
           "bannerUrl" = null,
           "isPublic" = false,
           "birthDate" = null,
           "adultContent" = false,
           "adultConsentAt" = null,
           "importedSources" = '{}'
     where id = usuario;
  else
    delete from "User" where id = usuario;
  end if;
end $$;

revoke all on function public.trak_excluir_usuario(text) from public, anon, authenticated;
