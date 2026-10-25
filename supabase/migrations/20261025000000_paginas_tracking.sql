-- Paginas lidas e total de paginas da edicao, por usuario.
-- Ficam em "UserMedia" (uma linha por usuario + obra), entao a edicao que cada
-- usuario le nao altera o registro global da obra ("MediaItem") para os demais.
-- Idempotente: pode ser executada mais de uma vez sem efeito colateral.

alter table public."UserMedia" add column if not exists "pagesRead" integer;
alter table public."UserMedia" add column if not exists "totalPages" integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'UserMedia_pagesRead_range') then
    alter table public."UserMedia"
      add constraint "UserMedia_pagesRead_range" check ("pagesRead" is null or "pagesRead" between 0 and 50000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'UserMedia_totalPages_range') then
    alter table public."UserMedia"
      add constraint "UserMedia_totalPages_range" check ("totalPages" is null or "totalPages" between 0 and 50000);
  end if;
end $$;
