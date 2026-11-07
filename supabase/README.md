# Banco (Supabase)

- `schema.sql` — retrato do schema `public` da produção: tabelas, constraints, índices, funções, triggers, RLS e
  políticas. A segunda linha diz até qual migração ele já inclui.
- `migrations/` — só as mudanças posteriores ao retrato, uma por arquivo, `AAAAMMDDNNNNNN_nome.sql`.
- `testes/` — testes em SQL (falham com `raise exception`) e o `supabase-shim.sql`, que imita no Postgres em
  memória o que o Supabase já traz pronto (papéis `anon`/`authenticated`/`service_role`, `auth.users`,
  `auth.uid()`). O shim nunca vai para o Supabase.
- `ferramentas/extrair-schema.sql` — a consulta que gera o retrato.

## Mudar o banco

1. Crie `migrations/AAAAMMDDNNNNNN_nome.sql` com data posterior à última existente. Prefira comandos que possam
   rodar duas vezes (`if not exists`, `create or replace`).
2. Rode `npm run db:verificar`. Ele aplica shim → `schema.sql` → migrações novas e depois os testes. O CI roda o
   mesmo em todo PR.
3. Aplique a migração no SQL Editor do Supabase **antes** do deploy da API que depende dela.

## Atualizar o retrato

De tempos em tempos, ou quando as migrações acumularem:

1. Rode `ferramentas/extrair-schema.sql` no SQL Editor e cole o resultado em `schema.sql`.
2. Troque `PREENCHER` na segunda linha pelo número da última migração já aplicada na produção.
3. Apague de `migrations/` as que o retrato já inclui e rode `npm run db:verificar`.

O retrato não inclui tipos compostos, domínios nem grants de tabela; se um dia o banco usar algum deles, crie-o
por migração.
