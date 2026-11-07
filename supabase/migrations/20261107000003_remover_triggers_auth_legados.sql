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
drop trigger if exists on_auth_user_updated on auth.users;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_auth_user_updated();
drop function if exists public.handle_new_auth_user();
