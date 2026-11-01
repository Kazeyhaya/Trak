-- Subtipo oficial da obra obtido na API de origem (TMDB, Google Books, Hardcover, OpenLibrary):
-- ANIME, ANIMACAO, DORAMA, NOVELA, MANGA, HQ.
-- Idempotente: pode ser executada mais de uma vez sem efeito colateral.

alter table public."MediaItem" add column if not exists "subtype" text;
