-- Transações para reordenação de favoritos e persistência de metadados de perfil em Activity.
-- Evita o padrão de apagar e reinserir sem transação (que causava perda de dados em caso de falha).

-- 1. Reordenação atômica de favoritos sem apagar e recriar linhas
create or replace function public.trak_reordenar_favoritos(p_user_id text, p_media_item_ids text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i integer;
  agora timestamp with time zone := clock_timestamp();
begin
  if p_media_item_ids is null or array_length(p_media_item_ids, 1) is null then
    return;
  end if;

  for i in 1 .. array_length(p_media_item_ids, 1) loop
    update "Favorite"
       set "createdAt" = agora - (i * interval '1 second')
     where "userId" = p_user_id
       and "mediaItemId" = p_media_item_ids[i];
  end loop;
end $$;

revoke all on function public.trak_reordenar_favoritos(text, text[]) from public, anon, authenticated;

-- 2. Upsert atômico de metadados em Activity (quando User não possui colunas novas)
create or replace function public.trak_salvar_meta(p_user_id text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into "Activity" (id, "userId", type, "mediaItemId", data)
  values (p_user_id, p_user_id, 'STATUS', null, p_data)
  on conflict (id) do update
    set data = excluded.data;
end $$;

revoke all on function public.trak_salvar_meta(text, jsonb) from public, anon, authenticated;
