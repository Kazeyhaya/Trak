-- Perfil personalizavel, controle de importacao por fonte e duracao das obras.
-- Idempotente: pode ser executada mais de uma vez sem efeito colateral.

-- 1. Perfil: foto, capa, tema e importacoes ja feitas (colunas proprias em "User").
alter table public."User" add column if not exists "avatarUrl" text;
alter table public."User" add column if not exists "bannerUrl" text;
alter table public."User" add column if not exists "theme" text not null default 'emerald';
alter table public."User" add column if not exists "importedSources" text[] not null default '{}';

-- 2. Duracao estimada de cada obra, em minutos (filme: duracao; serie: soma dos
--    episodios exibidos; jogo: tempo medio de jogo; livro: paginas x 1,5 min).
alter table public."MediaItem" add column if not exists "durationMinutes" integer;

-- 3. Migra a capa e o tema que estavam guardados provisoriamente em "Activity"
--    (linhas com data->>'kind' = 'PROFILE_META') e remove essas linhas.
update public."User" u
set
  "avatarUrl" = coalesce(nullif(a.data->>'avatarUrl', ''), u."avatarUrl"),
  "bannerUrl" = coalesce(nullif(a.data->>'bannerUrl', ''), u."bannerUrl"),
  "theme" = coalesce(nullif(a.data->>'theme', ''), u."theme")
from public."Activity" a
where a."userId"::text = u.id::text
  and a."mediaItemId" is null
  and a.data->>'kind' = 'PROFILE_META';

delete from public."Activity"
where "mediaItemId" is null
  and data->>'kind' = 'PROFILE_META';
