-- Suporte a notas fracionadas/decimais (ex: 4.5) em avaliações de obras.
-- Altera a coluna personalRating de integer para numeric(3, 1) em UserMedia.
-- Idempotente: pode ser executada mais de uma vez sem efeito colateral.

alter table public."UserMedia"
  alter column "personalRating" type numeric(3, 1) using "personalRating"::numeric(3, 1);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'UserMedia_personalRating_range') then
    alter table public."UserMedia"
      add constraint "UserMedia_personalRating_range"
      check ("personalRating" is null or ("personalRating" >= 0.5 and "personalRating" <= 5.0));
  end if;
end $$;
