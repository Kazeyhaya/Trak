-- Retrato do schema public extraido em 2026-11-07 por supabase/ferramentas/extrair-schema.sql.
-- Inclui as migracoes ate: 20261106000003

set check_function_bodies = false;

-- extensao em uso: pg_stat_statements (schema extensions)

-- extensao em uso: pgcrypto (schema extensions)

-- extensao em uso: plpgsql (schema pg_catalog)

-- extensao em uso: supabase_vault (schema vault)

-- extensao em uso: uuid-ossp (schema extensions)

create type public."MediaType" as enum ('MOVIE', 'SERIES', 'GAME', 'BOOK');

create type public."ReportStatus" as enum ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

create type public."TrackingStatus" as enum ('WANT', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'DROPPED');

CREATE OR REPLACE FUNCTION public.handle_auth_user_updated()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public."User"
  set
    email = lower(new.email),
    "updatedAt" = now()
  where "authUserId" = new.id;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare
  suggested_username text;
begin
  suggested_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    'user_' || replace(substr(new.id::text, 1, 8), '-', '')
  );

  insert into public."User" (
    id,
    "authUserId",
    username,
    "createdAt",
    "updatedAt"
  )
  values (
    new.id::text,
    new.id,
    suggested_username,
    now(),
    now()
  )
  on conflict (id) do update
set
  "authUserId" = excluded."authUserId",
  "updatedAt" = now();

  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new."updatedAt" = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.trak_criar_usuario()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public."User" ("id", "authUserId", "username", "createdAt", "updatedAt")
  values (new.id::text, new.id, 'user_' || substr(replace(new.id::text, '-', ''), 1, 12), now(), now())
  on conflict do nothing;
  return new;
exception
  -- Nunca impedir um cadastro por causa desta tabela.
  when others then
    raise warning 'trak_criar_usuario: %', sqlerrm;
    return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.trak_excluir_usuario(usuario text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;

CREATE OR REPLACE FUNCTION public.trak_id_canonico(source text, type "MediaType", external_id text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select public.trak_id_canonico(source, type::text, external_id);
$function$
;

CREATE OR REPLACE FUNCTION public.trak_id_canonico(source text, type text, external_id text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case source
    when 'tmdb' then 'tmdb_' || case when type = 'MOVIE' then 'movie' else 'series' end || '_' || external_id
    when 'rawg' then 'rawg_game_' || external_id
    when 'igdb' then 'igdb_game_' || external_id
    when 'openlibrary' then 'openlibrary_book_' || external_id
    when 'gbooks' then 'media_gbooks_' || external_id
    when 'hardcover' then 'media_hardcover_' || external_id
  end
$function$
;

CREATE OR REPLACE FUNCTION public.trak_nota_media(item text)
 RETURNS TABLE(average numeric, count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select round(avg("personalRating"), 1), count(*)::integer
    from "UserMedia"
   where "mediaItemId" = item and "personalRating" > 0
$function$
;

CREATE OR REPLACE FUNCTION public.trak_reordenar_favoritos(p_user_id text, p_media_item_ids text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  i integer;
  agora timestamp with time zone := clock_timestamp();
begin
  if p_media_item_ids is null or array_length(p_media_item_ids, 1) is null then
    return;
  end if;

  for i in 1 .. array_length(p_media_item_ids, 1) loop
    update "Favorite"
       set "createdAt" = agora - (i * interval '1 second')
     where "userId" = p_user_id
       and "mediaItemId" = p_media_item_ids[i];
  end loop;
end $function$
;

CREATE OR REPLACE FUNCTION public.trak_salvar_meta(p_user_id text, p_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into "Activity" (id, "userId", type, "mediaItemId", data)
  values (p_user_id, p_user_id, 'STATUS', null, p_data)
  on conflict (id) do update
    set data = excluded.data;
end $function$
;

CREATE OR REPLACE FUNCTION public.trak_unir_media_item(legado text, canonico text, external_id text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;

create table public."Activity" (
  id text not null,
  "userId" text not null,
  type text not null,
  "mediaItemId" text,
  data jsonb default '{}'::jsonb not null,
  "createdAt" timestamp with time zone default now() not null
);

create table public."Comment" (
  id text not null,
  "userId" text not null,
  "mediaItemId" text not null,
  content text not null,
  "createdAt" timestamp with time zone default now() not null,
  "updatedAt" timestamp with time zone default now() not null,
  "originalContent" text
);

create table public."CommentLike" (
  id text not null,
  "commentId" text not null,
  "userId" text not null,
  "createdAt" timestamp with time zone default now() not null
);

create table public."CommentReport" (
  id text not null,
  "commentId" text not null,
  "reporterUserId" text not null,
  reason text not null,
  details text,
  status "ReportStatus" default 'OPEN'::"ReportStatus" not null,
  "createdAt" timestamp with time zone default now() not null,
  "updatedAt" timestamp with time zone default now() not null
);

create table public."EpisodeProgress" (
  "userId" text not null,
  "mediaItemId" text not null,
  season integer not null,
  episode integer not null,
  "watchedAt" timestamp with time zone default now() not null,
  rating numeric(3,1),
  "highlightCharacterId" text,
  "highlightCharacterName" text,
  "highlightCharacterAvatar" text,
  "timesWatched" integer default 1 not null
);

create table public."Favorite" (
  id text not null,
  "userId" text not null,
  "mediaItemId" text not null,
  "createdAt" timestamp with time zone default now() not null
);

create table public."Follow" (
  "followerId" text not null,
  "followingId" text not null,
  "createdAt" timestamp with time zone default now() not null
);

create table public."MediaItem" (
  id text not null,
  "externalId" text not null,
  source text not null,
  type "MediaType" not null,
  title text not null,
  "coverUrl" text,
  synopsis text,
  "releaseYear" integer,
  "createdAt" timestamp with time zone default now() not null,
  "updatedAt" timestamp with time zone default now() not null,
  "progressTotal" integer,
  "durationMinutes" integer,
  subtype text,
  "enrichedAt" timestamp with time zone
);

create table public."Notification" (
  id uuid default gen_random_uuid() not null,
  "userId" text not null,
  "actorId" text,
  type text not null,
  title text not null,
  body text,
  "mediaItemId" text,
  link text not null,
  read boolean default false not null,
  data jsonb default '{}'::jsonb not null,
  "createdAt" timestamp with time zone default now() not null
);

create table public."User" (
  id text not null,
  username text not null,
  "avatarUrl" text,
  bio text,
  "createdAt" timestamp with time zone default now() not null,
  "updatedAt" timestamp with time zone default now() not null,
  "authUserId" uuid,
  "displayName" text,
  "isPublic" boolean default true not null,
  "bannerUrl" text,
  theme text default 'emerald'::text not null,
  "importedSources" text[] default '{}'::text[] not null,
  language text default 'pt-BR'::text not null,
  "birthDate" date,
  "adultContent" boolean default false not null,
  "adultConsentAt" timestamp with time zone
);

create table public."UserMedia" (
  id uuid default gen_random_uuid() not null,
  "userId" text not null,
  "mediaItemId" text not null,
  status "TrackingStatus" default 'WANT'::"TrackingStatus" not null,
  "progressCurrent" integer default 0 not null,
  "timesConsumed" integer default 0 not null,
  "whereConsumed" text,
  "favoriteCharacter" text,
  "personalRating" numeric(3,1),
  notes text,
  "startedAt" timestamp with time zone,
  "finishedAt" timestamp with time zone,
  "createdAt" timestamp with time zone default now() not null,
  "updatedAt" timestamp with time zone default now() not null,
  "pagesRead" integer,
  "totalPages" integer,
  "customCoverUrl" text,
  "favoriteCharacterName" text,
  "favoriteCharacterAvatar" text
);

alter table public."Activity" add constraint "Activity_pkey" PRIMARY KEY (id);

alter table public."Comment" add constraint "Comment_pkey" PRIMARY KEY (id);

alter table public."CommentLike" add constraint "CommentLike_pkey" PRIMARY KEY (id);

alter table public."CommentLike" add constraint "CommentLike_commentId_userId_key" UNIQUE ("commentId", "userId");

alter table public."CommentReport" add constraint "CommentReport_pkey" PRIMARY KEY (id);

alter table public."CommentReport" add constraint "CommentReport_commentId_reporterUserId_key" UNIQUE ("commentId", "reporterUserId");

alter table public."EpisodeProgress" add constraint "EpisodeProgress_episode_check" CHECK ((episode >= 1));

alter table public."EpisodeProgress" add constraint "EpisodeProgress_season_check" CHECK ((season >= 0));

alter table public."EpisodeProgress" add constraint "EpisodeProgress_timesWatched_range" CHECK ((("timesWatched" >= 1) AND ("timesWatched" <= 99)));

alter table public."EpisodeProgress" add constraint "EpisodeProgress_pkey" PRIMARY KEY ("userId", "mediaItemId", season, episode);

alter table public."Favorite" add constraint "Favorite_pkey" PRIMARY KEY (id);

alter table public."Favorite" add constraint "Favorite_userId_mediaItemId_key" UNIQUE ("userId", "mediaItemId");

alter table public."Follow" add constraint "Follow_check" CHECK (("followerId" <> "followingId"));

alter table public."Follow" add constraint "Follow_pkey" PRIMARY KEY ("followerId", "followingId");

alter table public."MediaItem" add constraint "MediaItem_progressTotal_check" CHECK ((("progressTotal" IS NULL) OR ("progressTotal" >= 0)));

alter table public."MediaItem" add constraint "MediaItem_pkey" PRIMARY KEY (id);

alter table public."MediaItem" add constraint "MediaItem_externalId_source_type_key" UNIQUE ("externalId", source, type);

alter table public."Notification" add constraint "Notification_pkey" PRIMARY KEY (id);

alter table public."User" add constraint "User_birthDate_range" CHECK ((("birthDate" IS NULL) OR (("birthDate" > '1900-01-01'::date) AND ("birthDate" <= CURRENT_DATE))));

alter table public."User" add constraint "User_language_check" CHECK ((language = ANY (ARRAY['pt-BR'::text, 'en-US'::text])));

alter table public."User" add constraint "User_pkey" PRIMARY KEY (id);

alter table public."User" add constraint "User_authUserId_key" UNIQUE ("authUserId");

alter table public."User" add constraint "User_username_key" UNIQUE (username);

alter table public."UserMedia" add constraint "UserMedia_pagesRead_range" CHECK ((("pagesRead" IS NULL) OR (("pagesRead" >= 0) AND ("pagesRead" <= 50000))));

alter table public."UserMedia" add constraint "UserMedia_personalRating_check" CHECK ((("personalRating" IS NULL) OR (("personalRating" >= (0)::numeric) AND ("personalRating" <= (10)::numeric))));

alter table public."UserMedia" add constraint "UserMedia_personalRating_range" CHECK ((("personalRating" IS NULL) OR (("personalRating" >= 0.5) AND ("personalRating" <= 5.0))));

alter table public."UserMedia" add constraint "UserMedia_progressCurrent_check" CHECK (("progressCurrent" >= 0));

alter table public."UserMedia" add constraint "UserMedia_timesConsumed_check" CHECK (("timesConsumed" >= 0));

alter table public."UserMedia" add constraint "UserMedia_timesConsumed_range" CHECK ((("timesConsumed" >= 0) AND ("timesConsumed" <= 99)));

alter table public."UserMedia" add constraint "UserMedia_totalPages_range" CHECK ((("totalPages" IS NULL) OR (("totalPages" >= 0) AND ("totalPages" <= 50000))));

alter table public."UserMedia" add constraint "UserMedia_pkey" PRIMARY KEY (id);

alter table public."UserMedia" add constraint "UserMedia_userId_mediaItemId_key" UNIQUE ("userId", "mediaItemId");

alter table public."Activity" add constraint "Activity_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"(id) ON DELETE CASCADE;

alter table public."Activity" add constraint "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

alter table public."Comment" add constraint "Comment_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"(id) ON DELETE CASCADE;

alter table public."Comment" add constraint "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

alter table public."CommentLike" add constraint "CommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"(id) ON DELETE CASCADE;

alter table public."CommentLike" add constraint "CommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

alter table public."CommentReport" add constraint "CommentReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"(id) ON DELETE CASCADE;

alter table public."CommentReport" add constraint "CommentReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"(id) ON DELETE CASCADE;

alter table public."EpisodeProgress" add constraint "EpisodeProgress_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"(id) ON DELETE CASCADE;

alter table public."EpisodeProgress" add constraint "EpisodeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

alter table public."Favorite" add constraint "Favorite_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"(id) ON DELETE CASCADE;

alter table public."Favorite" add constraint "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

alter table public."Follow" add constraint "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"(id) ON DELETE CASCADE;

alter table public."Follow" add constraint "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"(id) ON DELETE CASCADE;

alter table public."User" add constraint "User_authUserId_fkey" FOREIGN KEY ("authUserId") REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public."UserMedia" add constraint "UserMedia_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"(id) ON DELETE CASCADE;

alter table public."UserMedia" add constraint "UserMedia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

CREATE INDEX "Activity_userId_createdAt_idx" ON public."Activity" USING btree ("userId", "createdAt" DESC);

CREATE INDEX "CommentLike_commentId_idx" ON public."CommentLike" USING btree ("commentId");

CREATE INDEX "CommentLike_userId_idx" ON public."CommentLike" USING btree ("userId");

CREATE INDEX "CommentReport_commentId_idx" ON public."CommentReport" USING btree ("commentId");

CREATE INDEX "CommentReport_status_idx" ON public."CommentReport" USING btree (status);

CREATE INDEX "Comment_mediaItemId_createdAt_idx" ON public."Comment" USING btree ("mediaItemId", "createdAt");

CREATE INDEX "Follow_followingId_idx" ON public."Follow" USING btree ("followingId");

CREATE INDEX "UserMedia_status_idx" ON public."UserMedia" USING btree (status);

CREATE INDEX idx_activity_user_created ON public."Activity" USING btree ("userId", "createdAt" DESC);

CREATE INDEX idx_activity_user_media_type ON public."Activity" USING btree ("userId", "mediaItemId", type);

CREATE INDEX idx_comment_media_created ON public."Comment" USING btree ("mediaItemId", "createdAt" DESC);

CREATE INDEX idx_commentlike_comment ON public."CommentLike" USING btree ("commentId");

CREATE INDEX idx_episodeprogress_media_user ON public."EpisodeProgress" USING btree ("mediaItemId", "userId");

CREATE INDEX idx_episodeprogress_user_media ON public."EpisodeProgress" USING btree ("userId", "mediaItemId", season, episode);

CREATE INDEX idx_favorite_user_created ON public."Favorite" USING btree ("userId", "createdAt" DESC);

CREATE INDEX idx_follow_follower ON public."Follow" USING btree ("followerId", "followingId");

CREATE INDEX idx_follow_following ON public."Follow" USING btree ("followingId", "createdAt" DESC);

CREATE INDEX idx_notification_follow ON public."Notification" USING btree ("userId", "actorId", type, "createdAt" DESC);

CREATE INDEX idx_notification_user_created ON public."Notification" USING btree ("userId", "createdAt" DESC);

CREATE INDEX idx_notification_user_unread ON public."Notification" USING btree ("userId") WHERE (read = false);

CREATE INDEX idx_usermedia_media_rating ON public."UserMedia" USING btree ("mediaItemId") WHERE ("personalRating" > (0)::numeric);

CREATE INDEX idx_usermedia_user_media ON public."UserMedia" USING btree ("userId", "mediaItemId");

CREATE INDEX idx_usermedia_user_updated ON public."UserMedia" USING btree ("userId", "updatedAt" DESC);

CREATE TRIGGER trg_comment_updated_at BEFORE UPDATE ON public."Comment" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_comment_report_updated_at BEFORE UPDATE ON public."CommentReport" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_media_item_updated_at BEFORE UPDATE ON public."MediaItem" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_updated_at BEFORE UPDATE ON public."User" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_media_updated_at BEFORE UPDATE ON public."UserMedia" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

CREATE TRIGGER on_auth_user_updated AFTER UPDATE OF email ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_auth_user_updated();

CREATE TRIGGER trak_ao_criar_usuario AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION trak_criar_usuario();

alter table public."Activity" enable row level security;

alter table public."Comment" enable row level security;

alter table public."CommentLike" enable row level security;

alter table public."CommentReport" enable row level security;

alter table public."EpisodeProgress" enable row level security;

alter table public."Favorite" enable row level security;

alter table public."Follow" enable row level security;

alter table public."MediaItem" enable row level security;

alter table public."Notification" enable row level security;

alter table public."User" enable row level security;

alter table public."UserMedia" enable row level security;

create policy "Comment_delete_own" on public."Comment" as permissive for delete to authenticated using ((EXISTS ( SELECT 1
   FROM "User" u
  WHERE ((u.id = "Comment"."userId") AND (u.id = (auth.uid())::text)))));

create policy "Comment_insert_own" on public."Comment" as permissive for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM "User" u
  WHERE ((u.id = "Comment"."userId") AND (u.id = (auth.uid())::text)))));

create policy "Comment_select_authenticated" on public."Comment" as permissive for select to authenticated using (true);

create policy "Comment_update_own" on public."Comment" as permissive for update to authenticated using ((EXISTS ( SELECT 1
   FROM "User" u
  WHERE ((u.id = "Comment"."userId") AND (u.id = (auth.uid())::text))))) with check ((EXISTS ( SELECT 1
   FROM "User" u
  WHERE ((u.id = "Comment"."userId") AND (u.id = (auth.uid())::text)))));

create policy "CommentLike_delete_own" on public."CommentLike" as permissive for delete to authenticated using ((EXISTS ( SELECT 1
   FROM "User" u
  WHERE ((u.id = "CommentLike"."userId") AND (u.id = (auth.uid())::text)))));

create policy "CommentLike_insert_own" on public."CommentLike" as permissive for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM "User" u
  WHERE ((u.id = "CommentLike"."userId") AND (u.id = (auth.uid())::text)))));

create policy "CommentLike_select_authenticated" on public."CommentLike" as permissive for select to authenticated using (true);

create policy "CommentReport_delete_service_role" on public."CommentReport" as permissive for delete to service_role using (true);

create policy "CommentReport_insert_own" on public."CommentReport" as permissive for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM "User" u
  WHERE ((u.id = "CommentReport"."reporterUserId") AND (u.id = (auth.uid())::text)))));

create policy "CommentReport_select_own_or_service" on public."CommentReport" as permissive for select to authenticated, service_role using (((EXISTS ( SELECT 1
   FROM "User" u
  WHERE ((u.id = "CommentReport"."reporterUserId") AND (u.id = (auth.uid())::text)))) OR (CURRENT_ROLE = 'service_role'::name)));

create policy "CommentReport_update_service_role" on public."CommentReport" as permissive for update to service_role using (true) with check (true);

create policy "Favorite_delete_own" on public."Favorite" as permissive for delete to authenticated using ((EXISTS ( SELECT 1
   FROM "User" u
  WHERE ((u.id = "Favorite"."userId") AND (u.id = (auth.uid())::text)))));

create policy "Favorite_insert_own" on public."Favorite" as permissive for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM "User" u
  WHERE ((u.id = "Favorite"."userId") AND (u.id = (auth.uid())::text)))));

create policy "Favorite_select_own" on public."Favorite" as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM "User" u
  WHERE ((u.id = "Favorite"."userId") AND (u.id = (auth.uid())::text)))));

create policy "MediaItem_select_public" on public."MediaItem" as permissive for select to anon, authenticated using (true);

create policy "MediaItem_write_service_role" on public."MediaItem" as permissive for all to service_role using (true) with check (true);

create policy "User_delete_own" on public."User" as permissive for delete to authenticated using ((id = (auth.uid())::text));

create policy "User_insert_own" on public."User" as permissive for insert to authenticated with check ((id = (auth.uid())::text));

create policy "User_select_authenticated" on public."User" as permissive for select to authenticated using (true);

create policy "User_update_own" on public."User" as permissive for update to authenticated using ((id = (auth.uid())::text)) with check ((id = (auth.uid())::text));

create policy "UserMedia_delete_own" on public."UserMedia" as permissive for delete to authenticated using ((EXISTS ( SELECT 1
   FROM "User" u
  WHERE ((u.id = "UserMedia"."userId") AND (u.id = (auth.uid())::text)))));

create policy "UserMedia_insert_own" on public."UserMedia" as permissive for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM "User" u
  WHERE ((u.id = "UserMedia"."userId") AND (u.id = (auth.uid())::text)))));

create policy "UserMedia_select_own" on public."UserMedia" as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM "User" u
  WHERE ((u.id = "UserMedia"."userId") AND (u.id = (auth.uid())::text)))));

create policy "UserMedia_update_own" on public."UserMedia" as permissive for update to authenticated using ((EXISTS ( SELECT 1
   FROM "User" u
  WHERE ((u.id = "UserMedia"."userId") AND (u.id = (auth.uid())::text))))) with check ((EXISTS ( SELECT 1
   FROM "User" u
  WHERE ((u.id = "UserMedia"."userId") AND (u.id = (auth.uid())::text)))));

revoke all on function public.handle_auth_user_updated() from public, anon, authenticated, service_role;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated, service_role;

revoke all on function public.rls_auto_enable() from public, anon, authenticated, service_role;

revoke all on function public.set_updated_at() from public, anon, authenticated, service_role;

revoke all on function public.trak_criar_usuario() from public, anon, authenticated, service_role;

revoke all on function public.trak_excluir_usuario(usuario text) from public, anon, authenticated, service_role;

revoke all on function public.trak_id_canonico(source text, type "MediaType", external_id text) from public, anon, authenticated, service_role;

revoke all on function public.trak_id_canonico(source text, type text, external_id text) from public, anon, authenticated, service_role;

revoke all on function public.trak_nota_media(item text) from public, anon, authenticated, service_role;

revoke all on function public.trak_reordenar_favoritos(p_user_id text, p_media_item_ids text[]) from public, anon, authenticated, service_role;

revoke all on function public.trak_salvar_meta(p_user_id text, p_data jsonb) from public, anon, authenticated, service_role;

revoke all on function public.trak_unir_media_item(legado text, canonico text, external_id text) from public, anon, authenticated, service_role;

grant execute on function public.handle_auth_user_updated() to anon;

grant execute on function public.handle_auth_user_updated() to authenticated;

grant execute on function public.handle_auth_user_updated() to public;

grant execute on function public.handle_auth_user_updated() to service_role;

grant execute on function public.handle_new_auth_user() to anon;

grant execute on function public.handle_new_auth_user() to authenticated;

grant execute on function public.handle_new_auth_user() to public;

grant execute on function public.handle_new_auth_user() to service_role;

grant execute on function public.rls_auto_enable() to anon;

grant execute on function public.rls_auto_enable() to authenticated;

grant execute on function public.rls_auto_enable() to public;

grant execute on function public.rls_auto_enable() to service_role;

grant execute on function public.set_updated_at() to anon;

grant execute on function public.set_updated_at() to authenticated;

grant execute on function public.set_updated_at() to public;

grant execute on function public.set_updated_at() to service_role;

grant execute on function public.trak_criar_usuario() to anon;

grant execute on function public.trak_criar_usuario() to authenticated;

grant execute on function public.trak_criar_usuario() to public;

grant execute on function public.trak_criar_usuario() to service_role;

grant execute on function public.trak_excluir_usuario(usuario text) to service_role;

grant execute on function public.trak_id_canonico(source text, type "MediaType", external_id text) to anon;

grant execute on function public.trak_id_canonico(source text, type "MediaType", external_id text) to authenticated;

grant execute on function public.trak_id_canonico(source text, type "MediaType", external_id text) to public;

grant execute on function public.trak_id_canonico(source text, type "MediaType", external_id text) to service_role;

grant execute on function public.trak_id_canonico(source text, type text, external_id text) to anon;

grant execute on function public.trak_id_canonico(source text, type text, external_id text) to authenticated;

grant execute on function public.trak_id_canonico(source text, type text, external_id text) to public;

grant execute on function public.trak_id_canonico(source text, type text, external_id text) to service_role;

grant execute on function public.trak_nota_media(item text) to service_role;

grant execute on function public.trak_reordenar_favoritos(p_user_id text, p_media_item_ids text[]) to service_role;

grant execute on function public.trak_salvar_meta(p_user_id text, p_data jsonb) to service_role;

grant execute on function public.trak_unir_media_item(legado text, canonico text, external_id text) to service_role;
