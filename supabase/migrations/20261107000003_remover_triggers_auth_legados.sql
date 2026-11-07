-- Remove dois triggers antigos em auth.users que quebram o cadastro e a troca de e-mail.
--
-- on_auth_user_updated (handle_auth_user_updated): grava em "User".email, coluna que nao
-- existe. Quando a pessoa confirma um e-mail novo, o Supabase atualiza auth.users.email,
-- o trigger falha e a troca inteira e desfeita.
--
-- on_auth_user_created (handle_new_auth_user): cria a linha em "User" com
-- 'user_' + 8 caracteres do id e sem tratar erro. Se dois ids comecarem igual, o
-- username repete, a chave unica recusa e o cadastro falha. O trigger
-- trak_ao_criar_usuario ja faz o mesmo trabalho com 12 caracteres e sem nunca
-- bloquear o cadastro, entao este sai.

-- Primeiro as funcoes viram no-op: isso sempre e permitido (sao do schema public) e ja
-- resolve os dois problemas, mesmo que os triggers nao possam ser removidos abaixo.
create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
as $$
begin
  return new;
end $$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
as $$
begin
  return new;
end $$;

-- auth.users pertence ao supabase_auth_admin; se o SQL Editor nao puder remover os
-- triggers, eles ficam apontando para as funcoes vazias acima, sem efeito.
do $$
begin
  drop trigger if exists on_auth_user_updated on auth.users;
  drop trigger if exists on_auth_user_created on auth.users;
  drop function if exists public.handle_auth_user_updated();
  drop function if exists public.handle_new_auth_user();
exception when insufficient_privilege then
  raise notice 'Sem permissao para remover os triggers de auth.users; as funcoes ficaram vazias.';
end $$;
