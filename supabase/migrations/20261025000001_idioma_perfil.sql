-- Idioma preferido do usuario para interface e catalogo ('pt-BR' | 'en-US').
-- Idempotente: pode ser executada mais de uma vez sem efeito colateral.

alter table public."User" add column if not exists "language" text not null default 'pt-BR';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'User_language_check') then
    alter table public."User"
      add constraint "User_language_check" check ("language" in ('pt-BR', 'en-US'));
  end if;
end $$;
