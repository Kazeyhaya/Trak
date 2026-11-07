-- Remove as politicas RLS que liberavam acesso direto as tabelas pela anon key.
--
-- A migracao 20261104000001 ligou RLS em tudo supondo que nao havia politicas, mas a
-- producao ainda tinha as da epoca do Prisma. Com elas, qualquer pessoa logada podia
-- usar a anon key (que vai no bundle do site) para:
--   - ler todas as linhas de "User", inclusive "birthDate" e perfis privados;
--   - ler todos os comentarios e curtidas;
--   - gravar direto no proprio "User" e "UserMedia", sem as validacoes da API
--     (ex.: ligar "adultContent" sem informar a idade).
--
-- O site nao le nem grava tabelas pelo Supabase: tudo passa pela API, que usa a service
-- role e ignora RLS. Sem politicas, anon e authenticated ficam sem acesso a nada.
do $$
declare
  politica record;
begin
  for politica in
    select tablename, policyname from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy %I on public.%I', politica.policyname, politica.tablename);
  end loop;
end $$;
