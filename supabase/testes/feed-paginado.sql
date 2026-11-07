-- trak_feed: so a propria pessoa e quem ela segue (privados de fora), na ordem certa, e
-- as paginas pelo cursor nao repetem nem pulam atividades, mesmo com datas empatadas.
insert into auth.users (id) values
  ('e0000000-0001-0000-0000-000000000000'),
  ('e0000000-0002-0000-0000-000000000000'),
  ('e0000000-0003-0000-0000-000000000000'),
  ('e0000000-0004-0000-0000-000000000000');
update "User" set "isPublic" = false where id = 'e0000000-0003-0000-0000-000000000000';

-- 1 segue 2 (publico) e 3 (privado); 4 ninguem segue.
insert into "Follow" ("followerId", "followingId") values
  ('e0000000-0001-0000-0000-000000000000', 'e0000000-0002-0000-0000-000000000000'),
  ('e0000000-0001-0000-0000-000000000000', 'e0000000-0003-0000-0000-000000000000');

insert into "Activity" (id, "userId", type, "createdAt")
select 'a' || lpad(n::text, 2, '0'),
       case n % 4
         when 0 then 'e0000000-0001-0000-0000-000000000000'
         when 1 then 'e0000000-0002-0000-0000-000000000000'
         when 2 then 'e0000000-0003-0000-0000-000000000000'
         else 'e0000000-0004-0000-0000-000000000000'
       end,
       'STATUS',
       -- Pares de atividades com a mesma data, para testar o desempate pelo id.
       timestamptz '2026-11-01 12:00:00+00' + ((n / 2) * interval '1 minute')
  from generate_series(1, 40) n;

do $$
declare
  pessoa constant text := 'e0000000-0001-0000-0000-000000000000';
  esperado text[];
  lido text[] := '{}';
  pagina text[];
  ultimo record;
  em timestamptz := null;
  ultimo_id text := null;
begin
  select array_agg(id order by "createdAt" desc, id desc) into esperado
    from "Activity"
   where "userId" in (pessoa, 'e0000000-0002-0000-0000-000000000000');

  loop
    select array_agg(id order by "createdAt" desc, id desc) into pagina
      from public.trak_feed(pessoa, em, ultimo_id, 7);
    exit when pagina is null;
    lido := lido || pagina;
    select "createdAt", id into ultimo from "Activity" where id = pagina[array_length(pagina, 1)];
    em := ultimo."createdAt";
    ultimo_id := ultimo.id;
  end loop;

  if lido <> esperado then
    raise exception 'feed paginado diferente do esperado: % vs %', lido, esperado;
  end if;

  if has_function_privilege('anon', 'public.trak_feed(text, timestamptz, text, integer)', 'execute')
     or has_function_privilege('authenticated', 'public.trak_feed(text, timestamptz, text, integer)', 'execute') then
    raise exception 'anon/authenticated nao podem executar trak_feed';
  end if;
end $$;
