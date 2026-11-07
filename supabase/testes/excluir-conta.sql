-- trak_excluir_usuario + a exclusao do login que a API faz em seguida: some tudo da
-- pessoa, nada da outra, e o comentario denunciado continua guardado para a moderacao.
-- O cadastro em auth.users cria a linha em "User" pelos triggers, como na producao.
insert into auth.users (id) values
  ('a0000000-0000-0000-0000-00000000000a'),
  ('b0000000-0000-0000-0000-00000000000b');
update "User" set username = 'ana', "birthDate" = '1990-01-01', "adultContent" = true
 where id = 'a0000000-0000-0000-0000-00000000000a';
update "User" set username = 'bia' where id = 'b0000000-0000-0000-0000-00000000000b';

insert into "MediaItem" (id, "externalId", source, type, title) values ('tmdb_movie_1', '1', 'tmdb', 'MOVIE', 'Filme');
insert into "UserMedia" ("userId", "mediaItemId", status) values
  ('a0000000-0000-0000-0000-00000000000a', 'tmdb_movie_1', 'COMPLETED'),
  ('b0000000-0000-0000-0000-00000000000b', 'tmdb_movie_1', 'WANT');
insert into "Favorite" (id, "userId", "mediaItemId") values ('f1', 'a0000000-0000-0000-0000-00000000000a', 'tmdb_movie_1');
insert into "EpisodeProgress" ("userId", "mediaItemId", season, episode) values
  ('a0000000-0000-0000-0000-00000000000a', 'tmdb_movie_1', 1, 1);
insert into "Follow" ("followerId", "followingId") values
  ('b0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-00000000000a'),
  ('a0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-00000000000b');
insert into "Comment" (id, "userId", "mediaItemId", content) values
  ('c1', 'a0000000-0000-0000-0000-00000000000a', 'tmdb_movie_1', 'texto denunciado'),
  ('c2', 'a0000000-0000-0000-0000-00000000000a', 'tmdb_movie_1', 'comentario comum'),
  ('c3', 'b0000000-0000-0000-0000-00000000000b', 'tmdb_movie_1', 'da bia');
insert into "CommentLike" (id, "commentId", "userId") values
  ('l1', 'c3', 'a0000000-0000-0000-0000-00000000000a'),
  ('l2', 'c2', 'b0000000-0000-0000-0000-00000000000b');
insert into "CommentReport" (id, "commentId", "reporterUserId", reason) values
  ('r1', 'c1', 'b0000000-0000-0000-0000-00000000000b', 'ofensivo'),
  ('r2', 'c3', 'a0000000-0000-0000-0000-00000000000a', 'spam');
insert into "Activity" (id, "userId", type) values
  ('a1', 'a0000000-0000-0000-0000-00000000000a', 'STATUS'),
  ('a2', 'b0000000-0000-0000-0000-00000000000b', 'STATUS');
insert into "Notification" ("userId", "actorId", type, title, link) values
  ('b0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-00000000000a', 'FOLLOW', 'x', '/'),
  ('a0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-00000000000b', 'FOLLOW', 'y', '/');

select public.trak_excluir_usuario('a0000000-0000-0000-0000-00000000000a');
-- O que a API faz depois: supabase.auth.admin.deleteUser.
delete from auth.users where id = 'a0000000-0000-0000-0000-00000000000a';

do $$
declare
  ana constant text := 'a0000000-0000-0000-0000-00000000000a';
  bia constant text := 'b0000000-0000-0000-0000-00000000000b';
begin
  if exists (select 1 from "UserMedia" where "userId" = ana)
     or exists (select 1 from "Favorite" where "userId" = ana)
     or exists (select 1 from "EpisodeProgress" where "userId" = ana)
     or exists (select 1 from "Activity" where "userId" = ana) then
    raise exception 'sobrou estante, favorito, episodio ou atividade da pessoa excluida';
  end if;
  if exists (select 1 from "Follow" where ana in ("followerId", "followingId")) then
    raise exception 'sobrou um "segue" envolvendo a pessoa excluida';
  end if;
  if exists (select 1 from "Notification" where ana in ("userId", "actorId")) then
    raise exception 'sobrou notificacao da pessoa excluida';
  end if;
  if exists (select 1 from "CommentLike" where "userId" = ana or "commentId" = 'c2')
     or exists (select 1 from "CommentReport" where "reporterUserId" = ana) then
    raise exception 'sobrou curtida ou denuncia feita pela pessoa excluida';
  end if;
  if exists (select 1 from "Comment" where id = 'c2') then
    raise exception 'comentario sem denuncia deveria ter sido apagado';
  end if;

  if not exists (
    select 1 from "Comment"
    where id = 'c1' and content = '[comentário removido]' and "originalContent" = 'texto denunciado'
  ) or not exists (select 1 from "CommentReport" where id = 'r1') then
    raise exception 'comentario denunciado (e a denuncia) deveriam continuar, ocultos, para a moderacao';
  end if;
  if not exists (
    select 1 from "User"
    where id = ana and username like 'conta\_excluida\_%' and "authUserId" is null
      and "birthDate" is null and not "adultContent" and not "isPublic"
  ) then
    raise exception 'a linha da pessoa excluida deveria ficar anonima e solta do login';
  end if;

  if not exists (select 1 from "User" where id = bia and username = 'bia')
     or (select count(*) from "UserMedia" where "userId" = bia) <> 1
     or not exists (select 1 from "Comment" where id = 'c3') then
    raise exception 'dados da outra pessoa foram afetados';
  end if;

  if has_function_privilege('anon', 'public.trak_excluir_usuario(text)', 'execute')
     or has_function_privilege('authenticated', 'public.trak_excluir_usuario(text)', 'execute') then
    raise exception 'anon/authenticated nao podem executar trak_excluir_usuario';
  end if;
end $$;

-- Sem comentario denunciado, a linha em "User" sai de vez.
select public.trak_excluir_usuario('b0000000-0000-0000-0000-00000000000b');
do $$
begin
  if exists (select 1 from "User" where id = 'b0000000-0000-0000-0000-00000000000b') then
    raise exception 'sem comentario denunciado, a linha em "User" deveria ser apagada';
  end if;
end $$;
