-- Importacao em segundo plano: cada importacao (Letterboxd, Trakt, Steam) vira uma tarefa.
-- A API responde na hora com a tarefa e processa os itens depois, atualizando o progresso;
-- o site acompanha por GET /api/importacao/tarefas/:id.
--
-- O indice unico parcial impede duas importacoes da mesma fonte ao mesmo tempo para a
-- mesma pessoa (antes, dois cliques seguidos passavam pela checagem de "ja importado").
create table if not exists public."ImportJob" (
  id uuid primary key default gen_random_uuid(),
  "userId" text not null references public."User"(id) on delete cascade,
  fonte text not null,
  chave text not null,
  status text not null default 'PROCESSANDO' check (status in ('PROCESSANDO', 'CONCLUIDA', 'FALHOU')),
  total integer not null default 0 check (total >= 0),
  processados integer not null default 0 check (processados >= 0),
  resultado jsonb,
  erro text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create unique index if not exists "ImportJob_uma_por_chave_em_andamento"
  on public."ImportJob" ("userId", chave)
  where status = 'PROCESSANDO';

create index if not exists "ImportJob_userId_createdAt_idx"
  on public."ImportJob" ("userId", "createdAt" desc);

-- So a API (service role) le e grava; sem politicas, anon e authenticated nao acessam.
alter table public."ImportJob" enable row level security;
