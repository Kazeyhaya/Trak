-- Exclusao de conta (DELETE /api/perfis/eu). Apaga tudo da pessoa numa transacao;
-- depois a API remove o login no Supabase Auth.
--
-- Comentarios que outras pessoas denunciaram nao somem: ficam ocultos e guardam o texto
-- original em "originalContent", para a moderacao ainda ver o que foi denunciado.
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

  -- Se algum comentario oculto ainda aponta para a pessoa por chave estrangeira, a linha
  -- em "User" nao pode sair: fica anonima, sem nada que identifique a pessoa.
  begin
    delete from "User" where id = usuario;
  exception when foreign_key_violation then
    update "User"
       set username = 'conta_excluida_' || substr(md5(usuario), 1, 10),
           "displayName" = null,
           bio = null,
           "avatarUrl" = null,
           "bannerUrl" = null,
           "isPublic" = false,
           "birthDate" = null,
           "adultContent" = false,
           "adultConsentAt" = null
     where id = usuario;
  end;
end $$;

revoke all on function public.trak_excluir_usuario(text) from public, anon, authenticated;
