-- Cadastro cria a linha em "User" mesmo quando dois ids comecam igual, e trocar o
-- e-mail no Auth nao quebra nada.
insert into auth.users (id, email) values
  ('d0000000-0001-0000-0000-000000000000', 'um@exemplo.com'),
  ('d0000000-0002-0000-0000-000000000000', 'dois@exemplo.com');

update auth.users set email = 'novo@exemplo.com' where id = 'd0000000-0001-0000-0000-000000000000';

do $$
begin
  if (select count(*) from "User" where "authUserId" in (
        'd0000000-0001-0000-0000-000000000000', 'd0000000-0002-0000-0000-000000000000')) <> 2 then
    raise exception 'cada cadastro deveria criar sua linha em "User"';
  end if;
  if exists (select 1 from "User" where username is null or username not like 'user\_%') then
    raise exception 'username provisorio fora do formato user_...';
  end if;
end $$;
