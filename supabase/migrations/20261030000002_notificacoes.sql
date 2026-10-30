-- Tabela de Notificações para avisar sobre seguidores, comentários, respostas e atualizações.
-- Idempotente: pode ser executada mais de uma vez sem efeito colateral.

create table if not exists public."Notification" (
  id uuid primary key default gen_random_uuid(),
  "userId" text not null,
  "actorId" text,
  type text not null,
  title text not null,
  body text,
  "mediaItemId" text,
  link text not null,
  read boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now()
);

create index if not exists idx_notification_user_created
  on public."Notification"("userId", "createdAt" desc);

create index if not exists idx_notification_user_unread
  on public."Notification"("userId") where read = false;
