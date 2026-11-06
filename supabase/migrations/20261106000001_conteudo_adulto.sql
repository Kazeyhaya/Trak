-- Conteudo +18 no catalogo: escondido por padrao. A pessoa libera no perfil informando
-- a data de nascimento (a API confere 18 anos ou mais) e consentindo.
alter table public."User"
  add column if not exists "birthDate" date,
  add column if not exists "adultContent" boolean not null default false,
  add column if not exists "adultConsentAt" timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'User_birthDate_range') then
    alter table public."User"
      add constraint "User_birthDate_range"
      check ("birthDate" is null or ("birthDate" > date '1900-01-01' and "birthDate" <= current_date));
  end if;
end $$;
