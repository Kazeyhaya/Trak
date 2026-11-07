-- Feed paginado: atividades da pessoa e de quem ela segue, da mais nova para a mais
-- antiga (desempate pelo id), a partir de um cursor (antes_em, antes_id).
--
-- Antes a API lia a lista inteira de seguidos e a mandava num filtro .in() na URL, que
-- estoura o limite do PostgREST com algumas centenas de seguidos. Aqui o join fica no
-- banco. Perfis privados de outras pessoas ja saem na consulta, para uma pagina nao
-- chegar quase vazia depois do filtro da API.
create or replace function public.trak_feed(
  usuario text,
  antes_em timestamptz default null,
  antes_id text default null,
  limite integer default 30
)
returns setof "Activity"
language sql
stable
security definer
set search_path = public
as $$
  select a.*
    from "Activity" a
   where (
           a."userId" = usuario
           or (
             a."userId" in (select f."followingId" from "Follow" f where f."followerId" = usuario)
             and exists (select 1 from "User" u where u.id = a."userId" and u."isPublic")
           )
         )
     and (antes_em is null or (a."createdAt", a.id) < (antes_em, antes_id))
   order by a."createdAt" desc, a.id desc
   limit least(greatest(coalesce(limite, 30), 1), 100);
$$;

revoke all on function public.trak_feed(text, timestamptz, text, integer) from public, anon, authenticated;
