-- ImportJob: uma tarefa em andamento por fonte e pessoa; concluida libera uma nova;
-- some junto com a conta; fechada para acesso direto.
insert into auth.users (id) values ('f0000000-0001-0000-0000-000000000000');

insert into "ImportJob" ("userId", fonte, chave, total)
values ('f0000000-0001-0000-0000-000000000000', 'letterboxd', 'letterboxd:watched', 10);

do $$
begin
  begin
    insert into "ImportJob" ("userId", fonte, chave, total)
    values ('f0000000-0001-0000-0000-000000000000', 'letterboxd', 'letterboxd:watched', 10);
    raise exception 'deveria recusar uma segunda importacao em andamento da mesma lista';
  exception when unique_violation then
    null;
  end;

  -- Outra lista do Letterboxd pode rodar junto.
  insert into "ImportJob" ("userId", fonte, chave, total)
  values ('f0000000-0001-0000-0000-000000000000', 'letterboxd', 'letterboxd:ratings', 5);

  update "ImportJob" set status = 'CONCLUIDA' where chave = 'letterboxd:watched';
  insert into "ImportJob" ("userId", fonte, chave, total)
  values ('f0000000-0001-0000-0000-000000000000', 'letterboxd', 'letterboxd:watched', 10);

  begin
    update "ImportJob" set status = 'PERDIDA' where chave = 'letterboxd:ratings';
    raise exception 'status fora da lista deveria ser recusado';
  exception when check_violation then
    null;
  end;
end $$;

delete from auth.users where id = 'f0000000-0001-0000-0000-000000000000';
do $$
begin
  if exists (select 1 from "ImportJob") then
    raise exception 'as tarefas deveriam sumir junto com a conta';
  end if;
  if not (select relrowsecurity from pg_class where relname = 'ImportJob') then
    raise exception 'ImportJob precisa de RLS';
  end if;
end $$;
