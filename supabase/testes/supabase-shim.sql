-- Imita, no Postgres em memoria da verificacao (PGlite), o que todo projeto Supabase ja
-- traz pronto e por isso nao aparece no schema.sql: papeis da API, o schema "auth" e as
-- funcoes de extensao usadas em defaults. Nunca aplique este arquivo no Supabase.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

create schema if not exists auth;
create schema if not exists extensions;

-- Como no Supabase: os papeis da API recebem acesso a toda tabela nova do public. Quem
-- barra o acesso e o RLS; e isso que os testes de acesso direto conferem.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- No Supabase estas leem o JWT da requisicao; aqui leem configuracoes da sessao,
-- para um teste simular alguem logado com set_config('request.jwt.claim.sub', ...).
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create or replace function extensions.uuid_generate_v4() returns uuid
language sql volatile as $$
  select gen_random_uuid()
$$;
