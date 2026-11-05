-- Fecha o acesso direto as tabelas pela anon key.
--
-- A anon key vai no bundle do site, e o Supabase expoe o schema public pelo PostgREST:
-- sem RLS, qualquer pessoa podia ler e gravar estas tabelas direto pela URL do projeto
-- (ex.: GET /rest/v1/Notification?select=* listava as notificacoes de todo mundo).
--
-- O site nao consulta tabelas pelo Supabase; tudo passa pela API, que usa a service
-- role e por isso ignora RLS. Entao basta ativar RLS sem nenhuma policy: anon e
-- authenticated ficam sem acesso, e a API continua funcionando.

do $$
declare
  tabela record;
begin
  for tabela in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', tabela.tablename);
  end loop;
end $$;

-- O trigger de cadastro roda como supabase_auth_admin, que nao ignora RLS. Como
-- SECURITY DEFINER ele roda com o dono da funcao, e o cadastro continua inserindo em "User".
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'trak_criar_usuario' and p.pronargs = 0
  ) then
    alter function public.trak_criar_usuario() security definer set search_path = public;
  end if;
end $$;
