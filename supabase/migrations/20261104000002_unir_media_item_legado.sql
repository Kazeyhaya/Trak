-- Une registros duplicados de MediaItem.
--
-- Contexto: itens antigos foram salvos com ids fora do padrao atual (montarId em
-- catalogo.fontes.ts, ex.: "tmdb_movie_603"). Quando a mesma obra chegava com o id
-- canonico, garantirNoBanco renomeava o externalId da linha antiga para "legacy_<id>"
-- e criava outra. Trackings, favoritos e comentarios antigos continuavam na linha
-- renomeada, que o catalogo ja nao reconhece; a pessoa adicionava de novo, e a obra
-- ficava duplicada.
--
-- Esta migracao junta tudo no id canonico. A funcao fica disponivel para a API
-- (service role) resolver algum conflito que ainda apareca, em vez de renomear.

create or replace function public.trak_id_canonico(source text, type text, external_id text)
returns text
language sql
immutable
as $$
  select case source
    when 'tmdb' then 'tmdb_' || case when type = 'MOVIE' then 'movie' else 'series' end || '_' || external_id
    when 'rawg' then 'rawg_game_' || external_id
    when 'igdb' then 'igdb_game_' || external_id
    when 'openlibrary' then 'openlibrary_book_' || external_id
    when 'gbooks' then 'media_gbooks_' || external_id
    when 'hardcover' then 'media_hardcover_' || external_id
  end
$$;

-- Sobrecarga para aceitar diretamente o enum "MediaType" do banco sem erro de tipo
create or replace function public.trak_id_canonico(source text, type "MediaType", external_id text)
returns text
language sql
immutable
as $$
  select public.trak_id_canonico(source, type::text, external_id);
$$;

-- Move tudo que aponta para `legado` para `canonico` e apaga `legado`.
-- Quando a mesma pessoa tem registro nos dois ids, fica o mais recente (tracking)
-- ou o do id canonico (favorito, episodio).
create or replace function public.trak_unir_media_item(legado text, canonico text, external_id text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ref record;
begin
  if legado = canonico or not exists (select 1 from "MediaItem" where id = legado) then
    return;
  end if;

  -- Sem linha canonica: cria uma copia da legada com o id certo. A legada sai do
  -- caminho antes, por causa da chave unica (externalId, source, type).
  if not exists (select 1 from "MediaItem" where id = canonico) then
    if external_id is null then
      raise exception 'trak_unir_media_item: % nao existe; informe o externalId para cria-lo', canonico;
    end if;
    update "MediaItem" set "externalId" = 'unindo_' || id where id = legado;
    insert into "MediaItem"
    select * from jsonb_populate_record(
      null::"MediaItem",
      (select to_jsonb(m) from "MediaItem" m where m.id = legado)
        || jsonb_build_object('id', canonico, 'externalId', external_id)
    );
  end if;

  -- Tracking: uma linha por pessoa e obra. A que fica (a mais recente) herda da outra
  -- o que so a outra tinha: nota, anotacoes, datas e vezes concluida.
  update "UserMedia" fica set
    "personalRating" = coalesce(fica."personalRating", sai."personalRating"),
    notes = coalesce(fica.notes, sai.notes),
    "startedAt" = least(fica."startedAt", sai."startedAt"),
    "finishedAt" = coalesce(fica."finishedAt", sai."finishedAt"),
    "timesConsumed" = greatest(fica."timesConsumed", sai."timesConsumed")
  from "UserMedia" sai
  where fica."userId" = sai."userId"
    and ((fica."mediaItemId" = canonico and sai."mediaItemId" = legado and fica."updatedAt" >= sai."updatedAt")
      or (fica."mediaItemId" = legado and sai."mediaItemId" = canonico and fica."updatedAt" > sai."updatedAt"));

  delete from "UserMedia" l using "UserMedia" c
   where l."mediaItemId" = legado and c."mediaItemId" = canonico
     and l."userId" = c."userId" and l."updatedAt" <= c."updatedAt";
  delete from "UserMedia" c using "UserMedia" l
   where c."mediaItemId" = canonico and l."mediaItemId" = legado and l."userId" = c."userId";
  update "UserMedia" set "mediaItemId" = canonico where "mediaItemId" = legado;

  delete from "Favorite" l using "Favorite" c
   where l."mediaItemId" = legado and c."mediaItemId" = canonico and l."userId" = c."userId";
  update "Favorite" set "mediaItemId" = canonico where "mediaItemId" = legado;

  delete from "EpisodeProgress" l using "EpisodeProgress" c
   where l."mediaItemId" = legado and c."mediaItemId" = canonico and l."userId" = c."userId"
     and l.season = c.season and l.episode = c.episode;
  update "EpisodeProgress" set "mediaItemId" = canonico where "mediaItemId" = legado;

  -- Demais tabelas com coluna mediaItemId (Comment, Activity, Notification e outras
  -- que existam no schema), com ou sem chave estrangeira.
  for ref in
    select c.table_name
      from information_schema.columns c
      join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
     where c.table_schema = 'public' and c.column_name = 'mediaItemId' and t.table_type = 'BASE TABLE'
       and c.table_name not in ('UserMedia', 'Favorite', 'EpisodeProgress')
  loop
    execute format('update public.%I set "mediaItemId" = $1 where "mediaItemId" = $2', ref.table_name)
      using canonico, legado;
  end loop;

  delete from "MediaItem" where id = legado;
end $$;

-- So a API (service role) pode chamar; sem isso o PostgREST expoe a funcao para a anon key.
revoke all on function public.trak_unir_media_item(text, text, text) from public, anon, authenticated;

do $$
declare
  item record;
  alvo record;
  unidos integer := 0;
  sem_par integer := 0;
begin
  -- 1. Linhas com id fora do padrao, mas externalId intacto: o id certo sai direto.
  for item in
    select id, "externalId", public.trak_id_canonico(source::text, type::text, "externalId") as canonico
      from "MediaItem"
     where "externalId" not like 'legacy\_%'
       and public.trak_id_canonico(source::text, type::text, "externalId") is not null
       and id <> public.trak_id_canonico(source::text, type::text, "externalId")
  loop
    perform public.trak_unir_media_item(item.id, item.canonico, item."externalId");
    unidos := unidos + 1;
  end loop;

  -- 2. Linhas ja renomeadas para "legacy_<id>": o externalId original se perdeu. O par
  --    e a linha canonica da mesma fonte, tipo e titulo, desde que haja exatamente uma.
  for item in
    select id, source, type, title, "releaseYear" from "MediaItem" where "externalId" like 'legacy\_%'
  loop
    select count(*) as total, min(c.id) as id into alvo
      from "MediaItem" c
     where c.id <> item.id and c.source = item.source and c.type = item.type
       and lower(c.title) = lower(item.title)
       and c."externalId" not like 'legacy\_%'
       and (item."releaseYear" is null or c."releaseYear" is null or c."releaseYear" = item."releaseYear");

    if alvo.total = 1 then
      perform public.trak_unir_media_item(item.id, alvo.id);
      unidos := unidos + 1;
    else
      sem_par := sem_par + 1;
    end if;
  end loop;

  raise notice 'MediaItem: % registros unidos, % legados sem par unico (mantidos para revisao manual)', unidos, sem_par;
end $$;
