-- Capa personalizada escolhida pelo usuario para a obra na sua estante/perfil (estilo Letterboxd).
-- Fica em "UserMedia" (uma linha por usuario + obra), para nao alterar a capa global de outros usuarios.
-- Idempotente: pode ser executada mais de uma vez sem efeito colateral.

alter table public."UserMedia" add column if not exists "customCoverUrl" text;
