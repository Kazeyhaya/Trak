-- Ninguem le nem grava tabelas direto pela anon key: nem visitante, nem pessoa logada.
-- Tudo passa pela API (service role).
insert into auth.users (id) values ('a0000000-0000-0000-0000-00000000000a');
update "User" set "birthDate" = '1990-01-01' where id = 'a0000000-0000-0000-0000-00000000000a';
insert into "MediaItem" (id, "externalId", source, type, title) values ('tmdb_movie_1', '1', 'tmdb', 'MOVIE', 'Filme');

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public') then
    raise exception 'ha politica RLS no schema public: %',
      (select string_agg(tablename || '.' || policyname, ', ') from pg_policies where schemaname = 'public');
  end if;
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  ) then
    raise exception 'ha tabela no public sem RLS';
  end if;
end $$;

-- Como a propria pessoa logada.
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-00000000000a', true);
set local role authenticated;
do $$
begin
  if (select count(*) from "User") <> 0 or (select count(*) from "MediaItem") <> 0 then
    raise exception 'pessoa logada conseguiu ler tabelas direto';
  end if;
  update "User" set "adultContent" = true where id = 'a0000000-0000-0000-0000-00000000000a';
  if found then
    raise exception 'pessoa logada conseguiu gravar no proprio "User" direto';
  end if;
end $$;
reset role;

set local role anon;
do $$
begin
  if (select count(*) from "User") <> 0 then
    raise exception 'visitante conseguiu ler "User"';
  end if;
end $$;
reset role;
