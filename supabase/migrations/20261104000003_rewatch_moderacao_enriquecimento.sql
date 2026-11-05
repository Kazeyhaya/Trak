-- Rever episodios: quantas vezes a pessoa assistiu cada episodio (1 = so a primeira vez).
alter table public."EpisodeProgress"
  add column if not exists "timesWatched" integer not null default 1;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'EpisodeProgress_timesWatched_range') then
    alter table public."EpisodeProgress"
      add constraint "EpisodeProgress_timesWatched_range" check ("timesWatched" between 1 and 99);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'UserMedia_timesConsumed_range') then
    alter table public."UserMedia"
      add constraint "UserMedia_timesConsumed_range" check ("timesConsumed" between 0 and 99);
  end if;
end $$;

-- Moderacao: quando um comentario e ocultado (autor apagou com denuncia aberta, ou
-- moderador removeu), o texto original fica aqui para a revisao.
alter table public."Comment" add column if not exists "originalContent" text;

-- Enriquecimento de MediaItem (subtipo do TMDB, capa vertical de jogos): marca quando
-- ja foi tentado. Sem isso, obras sem subtipo (a maioria dos filmes) eram consultadas
-- de novo no TMDB a cada listagem, para sempre.
alter table public."MediaItem" add column if not exists "enrichedAt" timestamptz;

-- Itens com subtipo ja estao enriquecidos.
update public."MediaItem" set "enrichedAt" = now() where "enrichedAt" is null and subtype is not null;
